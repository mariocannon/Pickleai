"""
evaluate.py — accuracy-spike report card for the PickleAI extractor.

Compares the extractor's per-clip output against hand-labeled ground truth and prints a
per-metric PASS / FAIL / PENDING report card with a go/no-go verdict.

Design: this reads *normalized extractor output* (one JSON per clip) so it runs with no
mediapipe and no video — you pre-extract once, then iterate on the eval freely. Each
extractor JSON looks like:

    {
      "clip_id": "clip_a",
      "tracking_confidence": 0.9,
      "predicted_contacts": [
        {"t": 3.45, "knee_deg": 154, "paddle_face": null, "landing_zone": null}
      ]
    }

`paddle_face` / `landing_zone` stay null until the Tier-2/3 detectors exist; the harness
reports those metrics as PENDING rather than scoring against nothing.

Usage:
    python evaluate.py --labels fixtures/labels_demo.csv --metrics-dir fixtures/metrics
    python evaluate.py --labels labels_myclips.csv --metrics-dir out/ --out report.md
"""

import argparse
import csv
import json
import math
import statistics
from collections import defaultdict
from pathlib import Path

# ---- Acceptance thresholds (tune these) --------------------------------------
CONTACT_TIMING_TOL_S = 0.30     # a predicted contact within this of a label = a match
CONTACT_F1_MIN = 0.85
KNEE_BUCKET_ACC_MIN = 0.80
KNEE_MAE_MAX_DEG = 8.0
# We want higher confidence to predict lower error: corr(confidence, error) <= this.
CONFIDENCE_CALIB_MAX_CORR = -0.40
LOW_CONFIDENCE_ABSTAIN = 0.50   # clips below this the product should decline to grade

# knee-angle -> bucket (smaller angle = deeper bend)
KNEE_DEEP_MAX = 125
KNEE_OK_MAX = 142


def knee_bucket(angle: float) -> str:
    if angle <= KNEE_DEEP_MAX:
        return "deep"
    if angle <= KNEE_OK_MAX:
        return "ok"
    return "upright"


def pearson(xs, ys):
    n = len(xs)
    if n < 2:
        return None
    try:
        sx, sy = statistics.pstdev(xs), statistics.pstdev(ys)
        if sx == 0 or sy == 0:
            return None
        mx, my = statistics.mean(xs), statistics.mean(ys)
        cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / n
        return cov / (sx * sy)
    except statistics.StatisticsError:
        return None


def load_labels(path: Path):
    """Return {clip_id: {"reps": [...], "meta": {...}}} from the labels CSV."""
    clips = defaultdict(lambda: {"reps": [], "meta": {}})
    with path.open(encoding="utf-8") as f:
        for row in csv.DictReader(r for r in f if not r.lstrip().startswith("#")):
            cid = (row.get("clip_id") or "").strip()
            if not cid:
                continue
            clips[cid]["meta"] = {
                "view_angle": row.get("view_angle", ""),
                "lighting": row.get("lighting", ""),
                "distance": row.get("distance", ""),
                "clip_quality": row.get("clip_quality", ""),
            }
            clips[cid]["reps"].append({
                "t": _f(row.get("contact_timestamp_s")),
                "knee_bucket": (row.get("knee_bend_bucket") or "").strip() or None,
                "knee_deg": _f(row.get("knee_angle_deg_est")),
                "paddle_face": (row.get("paddle_face") or "").strip() or None,
                "landing_zone": (row.get("landing_zone") or "").strip() or None,
            })
    return clips


def _f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def match_contacts(labels, preds, tol):
    """Greedy nearest-time matching. Returns (matched_pairs, n_fp, n_fn, timing_errs)."""
    used = set()
    pairs, timing = [], []
    for lab in sorted(labels, key=lambda r: (r["t"] is None, r["t"] or 0)):
        if lab["t"] is None:
            continue
        best, best_dt = None, None
        for i, p in enumerate(preds):
            if i in used or p.get("t") is None:
                continue
            dt = abs(p["t"] - lab["t"])
            if dt <= tol and (best_dt is None or dt < best_dt):
                best, best_dt = i, dt
        if best is not None:
            used.add(best)
            pairs.append((lab, preds[best]))
            timing.append(best_dt)
    n_fp = sum(1 for i, p in enumerate(preds) if i not in used and p.get("t") is not None)
    n_fn = sum(1 for lab in labels if lab["t"] is not None) - len(pairs)
    return pairs, n_fp, n_fn, timing


def evaluate(labels_by_clip, metrics_dir: Path):
    tp = fp = fn = 0
    timing_errs = []
    knee_hits = knee_total = 0
    knee_abs_errs = []
    calib_conf, calib_err = [], []
    tier23_seen = {"paddle_face": False, "landing_zone": False}
    per_clip = []
    missing = []

    for cid, data in labels_by_clip.items():
        mpath = metrics_dir / f"{cid}.json"
        if not mpath.exists():
            missing.append(cid)
            continue
        m = json.loads(mpath.read_text(encoding="utf-8"))
        preds = m.get("predicted_contacts", [])
        conf = m.get("tracking_confidence")

        pairs, cfp, cfn, terr = match_contacts(data["reps"], preds, CONTACT_TIMING_TOL_S)
        ctp = len(pairs)
        tp += ctp; fp += cfp; fn += cfn; timing_errs += terr

        for lab, pred in pairs:
            if pred.get("knee_deg") is not None and lab["knee_bucket"]:
                knee_total += 1
                if knee_bucket(pred["knee_deg"]) == lab["knee_bucket"]:
                    knee_hits += 1
            if pred.get("knee_deg") is not None and lab["knee_deg"] is not None:
                knee_abs_errs.append(abs(pred["knee_deg"] - lab["knee_deg"]))
            for k in tier23_seen:
                if pred.get(k) is not None:
                    tier23_seen[k] = True

        clip_f1 = _f1(ctp, cfp, cfn)
        if conf is not None:
            calib_conf.append(conf)
            calib_err.append(1.0 - clip_f1)
        per_clip.append({
            "clip_id": cid, "conf": conf, "f1": clip_f1,
            "tp": ctp, "fp": cfp, "fn": cfn,
            "quality": data["meta"].get("clip_quality", ""),
        })

    return {
        "contact": {"tp": tp, "fp": fp, "fn": fn,
                    "precision": _safe(tp, tp + fp), "recall": _safe(tp, tp + fn),
                    "f1": _f1(tp, fp, fn),
                    "mean_timing_err_s": statistics.mean(timing_errs) if timing_errs else None},
        "knee_bucket_acc": _safe(knee_hits, knee_total), "knee_n": knee_total,
        "knee_mae": statistics.mean(knee_abs_errs) if knee_abs_errs else None,
        "calibration_corr": pearson(calib_conf, calib_err),
        "tier23_seen": tier23_seen,
        "per_clip": per_clip,
        "missing_metrics": missing,
    }


def _f1(tp, fp, fn):
    p, r = _safe(tp, tp + fp), _safe(tp, tp + fn)
    return _safe(2 * p * r, p + r) if (p and r) else 0.0


def _safe(a, b):
    return a / b if b else 0.0


# ---- reporting ---------------------------------------------------------------
def verdict(ok):
    return "PASS " if ok else "FAIL "


def build_report(res) -> str:
    L = []
    L.append("PickleAI — Extractor Accuracy Report Card")
    L.append("=" * 46)
    c = res["contact"]
    lines = []

    f1_ok = c["f1"] >= CONTACT_F1_MIN
    lines.append((f"Contact detection  F1={c['f1']:.2f}  "
                  f"(P={c['precision']:.2f} R={c['recall']:.2f}, TP{c['tp']}/FP{c['fp']}/FN{c['fn']})",
                  f1_ok, f">= {CONTACT_F1_MIN}"))

    if c["mean_timing_err_s"] is not None:
        lines.append((f"Contact timing     mean |Δt|={c['mean_timing_err_s']*1000:.0f} ms",
                      c["mean_timing_err_s"] <= CONTACT_TIMING_TOL_S, f"<= {CONTACT_TIMING_TOL_S*1000:.0f} ms"))

    if res["knee_n"]:
        ka_ok = res["knee_bucket_acc"] >= KNEE_BUCKET_ACC_MIN
        lines.append((f"Knee-bend bucket   acc={res['knee_bucket_acc']:.2f}  (n={res['knee_n']})",
                      ka_ok, f">= {KNEE_BUCKET_ACC_MIN}"))
    if res["knee_mae"] is not None:
        lines.append((f"Knee angle MAE     {res['knee_mae']:.1f}°",
                      res["knee_mae"] <= KNEE_MAE_MAX_DEG, f"<= {KNEE_MAE_MAX_DEG}°"))

    corr = res["calibration_corr"]
    if corr is not None:
        lines.append((f"Confidence calib   corr(conf,err)={corr:+.2f}",
                      corr <= CONFIDENCE_CALIB_MAX_CORR,
                      f"<= {CONFIDENCE_CALIB_MAX_CORR} (higher conf -> lower error)"))
    else:
        lines.append(("Confidence calib   n/a (need >=2 clips w/ error variance)", None, ""))

    L.append("")
    for text, ok, target in lines:
        tag = "  --  " if ok is None else verdict(ok)
        L.append(f"[{tag}] {text}")
        if target:
            L.append(f"           target: {target}")

    L.append("")
    L.append("Tier-2/3 metrics (need extra detectors):")
    for k, seen in res["tier23_seen"].items():
        state = "evaluated" if seen else "PENDING — detector not implemented"
        L.append(f"  - {k:14s} {state}")

    L.append("")
    L.append("Per-clip:")
    for pc in res["per_clip"]:
        conf = f"{pc['conf']:.2f}" if pc["conf"] is not None else " n/a"
        flag = "  <- low-confidence: product should ABSTAIN" if (
            pc["conf"] is not None and pc["conf"] < LOW_CONFIDENCE_ABSTAIN) else ""
        L.append(f"  {pc['clip_id']:16s} conf={conf}  F1={pc['f1']:.2f}  "
                 f"(TP{pc['tp']}/FP{pc['fp']}/FN{pc['fn']}) {pc['quality']}{flag}")

    if res["missing_metrics"]:
        L.append("")
        L.append("WARNING: no extractor output found for: " + ", ".join(res["missing_metrics"]))

    scored = [ok for _, ok, _ in lines if ok is not None]
    overall = all(scored) if scored else False
    L.append("")
    L.append("-" * 46)
    L.append(f"OVERALL: {'GO — Tier-1 extractor is accurate enough' if overall else 'NO-GO — see FAILs above'}")
    if not res["tier23_seen"]["landing_zone"] or not res["tier23_seen"]["paddle_face"]:
        L.append("Note: Tier-2/3 metrics still pending. A GO here validates the pose-only")
        L.append("      (Tier-1) MVP path; ship that and defer paddle/ball detection.")
    return "\n".join(L)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--labels", required=True, type=Path)
    ap.add_argument("--metrics-dir", required=True, type=Path)
    ap.add_argument("--out", type=Path, help="also write the report to this file")
    args = ap.parse_args()

    labels = load_labels(args.labels)
    if not labels:
        raise SystemExit("No labeled reps found — is the CSV filled in?")
    res = evaluate(labels, args.metrics_dir)
    report = build_report(res)
    print(report)
    if args.out:
        args.out.write_text(report + "\n", encoding="utf-8")
        print(f"\n(report written to {args.out})")


if __name__ == "__main__":
    main()
