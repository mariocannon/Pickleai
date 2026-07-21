"""
extract_metrics.py — the measurement step of the PickleAI pipeline.

Runs pose estimation over a clip and derives the structured biomechanical metrics that
the coaching step reasons over. The whole design principle is that the LLM never sees
pixels — it sees these MEASURED numbers, so its feedback is grounded and auditable.

Tier-1 (pose-only) extractor. What it measures per clip:
  - contact events: peaks in smoothed paddle-wrist speed, with a refractory window so
    one swing = one contact, and sub-frame timing via parabolic peak interpolation
  - knee flexion at each contact (side-aware: uses the more visible leg per frame)
  - handedness: given, or auto-detected from wrist motion energy
  - tracking_confidence: pose coverage x landmark visibility — a *real* signal, so the
    product can abstain on clips it can't read instead of bluffing

Outputs two contracts from one extraction:
  - the coaching contract consumed by coach.py / the worker (aggregate metrics)
  - the eval contract consumed by eval/evaluate.py (per-contact predictions), written
    with --eval-out so the accuracy spike is: extract clips -> run the harness

Usage:
    pip install mediapipe opencv-python numpy
    # one clip -> coaching metrics on stdout
    python extract_metrics.py clip.mp4 --shot third_shot_drop --skill 3.0
    # the accuracy spike: batch-extract labeled clips into eval JSONs
    python extract_metrics.py clips/*.mp4 --eval-out out/
    python eval/evaluate.py --labels eval/labels_myclips.csv --metrics-dir out/

Tier-2/3 fields (paddle_face, landing_zone, contact height in real cm) need paddle/ball/
court detection and camera calibration; they are emitted as null so the eval harness
reports them PENDING instead of scoring garbage.
"""

import argparse
import json
import math
import os
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

try:
    import cv2
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions
    from mediapipe.tasks.python import vision as mp_vision
except ImportError:  # keep the file importable without the heavy deps
    cv2 = None
    mp = None

# PoseLandmarker model (mediapipe Tasks API). Auto-downloaded on first run;
# override the location with PICKLEAI_POSE_MODEL. ~6 MB, Apache-2.0, not in git.
MODEL_URL = ("https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
             "pose_landmarker_lite/float16/latest/pose_landmarker_lite.task")
MODEL_PATH = Path(os.environ.get(
    "PICKLEAI_POSE_MODEL", Path(__file__).parent / "models" / "pose_landmarker_lite.task"))


# MediaPipe Pose landmark indices, both sides.
LANDMARKS = {
    "left":  {"shoulder": 11, "elbow": 13, "wrist": 15, "hip": 23, "knee": 25, "ankle": 27},
    "right": {"shoulder": 12, "elbow": 14, "wrist": 16, "hip": 24, "knee": 26, "ankle": 28},
}

SAMPLE_FPS = 15.0          # analysis rate; plenty for technique, cheap to process
MIN_REP_SEPARATION_S = 0.8  # two swings can't be closer than this — one swing, one contact
SPEED_SMOOTH_WINDOW = 3     # frames of moving-average smoothing on wrist speed
PEAK_THRESHOLD_STDS = 1.0   # peak must exceed mean + k*std of the speed series
MIN_POSE_FRAMES = 8         # fewer tracked frames than this -> confidence collapses


def angle(a, b, c) -> float:
    """Interior angle at joint b (degrees), given three (x, y) points."""
    ba = np.array(a) - np.array(b)
    bc = np.array(c) - np.array(b)
    cos = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-9)
    return math.degrees(math.acos(np.clip(cos, -1.0, 1.0)))


@dataclass
class FrameSample:
    """One analyzed frame: joint geometry for both sides + how trustworthy it is."""
    t: float
    # per side: wrist position, knee interior angle, mean landmark visibility (0..1)
    wrist: dict          # {"left": (x, y), "right": (x, y)}
    knee_deg: dict       # {"left": float, "right": float}
    visibility: dict     # {"left": float, "right": float}
    torso_len: float     # shoulder<->hip distance, for scale-normalizing speeds


@dataclass
class Extraction:
    frames: list = field(default_factory=list)
    frames_sampled: int = 0   # frames we ran pose on (incl. ones with no detection)


@dataclass
class Contact:
    t: float
    knee_deg: float
    peak_speed: float    # torso-lengths / second at the swing peak


# --------------------------------------------------------------------------- pose I/O
def _ensure_model() -> Path:
    if not MODEL_PATH.exists():
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        print(f"downloading pose model -> {MODEL_PATH} …")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    return MODEL_PATH


def run_pose(video_path: str, sample_fps: float = SAMPLE_FPS) -> Extraction:
    """Run MediaPipe PoseLandmarker (Tasks API) over the video, collect per-frame joints."""
    if mp is None:
        raise RuntimeError("mediapipe/opencv not installed — pip install mediapipe opencv-python")

    landmarker = mp_vision.PoseLandmarker.create_from_options(mp_vision.PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(_ensure_model())),
        running_mode=mp_vision.RunningMode.VIDEO,
        min_pose_detection_confidence=0.5,
    ))
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    step = max(1, round(fps / sample_fps))
    ex = Extraction()
    idx = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % step == 0:
            ex.frames_sampled += 1
            image = mp.Image(image_format=mp.ImageFormat.SRGB,
                             data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            res = landmarker.detect_for_video(image, int(idx / fps * 1000))
            if res.pose_landmarks:  # single-player assumption: strongest detection
                sample = _frame_from_landmarks(res.pose_landmarks[0], t=idx / fps)
                if sample is not None:
                    ex.frames.append(sample)
        idx += 1

    cap.release()
    landmarker.close()
    return ex


def _frame_from_landmarks(lm, t: float) -> FrameSample | None:
    """Build a FrameSample from one MediaPipe landmark list."""
    def pt(i):
        return (lm[i].x, lm[i].y)

    wrist, knee_deg, visibility = {}, {}, {}
    for side, ids in LANDMARKS.items():
        wrist[side] = pt(ids["wrist"])
        knee_deg[side] = angle(pt(ids["hip"]), pt(ids["knee"]), pt(ids["ankle"]))
        visibility[side] = float(np.mean([lm[i].visibility for i in ids.values()]))

    torso = (math.dist(pt(LANDMARKS["left"]["shoulder"]), pt(LANDMARKS["left"]["hip"]))
             + math.dist(pt(LANDMARKS["right"]["shoulder"]), pt(LANDMARKS["right"]["hip"]))) / 2
    if torso < 1e-6:
        return None
    return FrameSample(t=t, wrist=wrist, knee_deg=knee_deg,
                       visibility=visibility, torso_len=torso)


# ----------------------------------------------------------------------- signal math
def detect_handedness(ex: Extraction) -> str:
    """The paddle wrist moves more. Total path length decides, ties go right."""
    travel = {"left": 0.0, "right": 0.0}
    for i in range(1, len(ex.frames)):
        for side in travel:
            travel[side] += math.dist(ex.frames[i - 1].wrist[side], ex.frames[i].wrist[side])
    return "left" if travel["left"] > travel["right"] * 1.15 else "right"


def wrist_speeds(ex: Extraction, side: str) -> list:
    """Per-frame wrist speed in torso-lengths/second (scale-invariant), smoothed."""
    raw = [0.0]
    for i in range(1, len(ex.frames)):
        p, q = ex.frames[i - 1].wrist[side], ex.frames[i].wrist[side]
        dt = ex.frames[i].t - ex.frames[i - 1].t or 1e-3
        scale = (ex.frames[i].torso_len + ex.frames[i - 1].torso_len) / 2 or 1e-3
        raw.append(math.dist(p, q) / dt / scale)
    # moving-average smoothing
    w = SPEED_SMOOTH_WINDOW
    return [float(np.mean(raw[max(0, i - w // 2): i + w // 2 + 1])) for i in range(len(raw))]


def _refine_peak_t(ex: Extraction, speeds: list, i: int) -> float:
    """Sub-frame peak time via parabolic interpolation over the 3 frames around i."""
    if not (0 < i < len(speeds) - 1):
        return ex.frames[i].t
    y0, y1, y2 = speeds[i - 1], speeds[i], speeds[i + 1]
    denom = y0 - 2 * y1 + y2
    if abs(denom) < 1e-9:
        return ex.frames[i].t
    offset = 0.5 * (y0 - y2) / denom  # in frame units, in (-1, 1)
    offset = float(np.clip(offset, -0.5, 0.5))
    lo = ex.frames[i - 1].t if offset < 0 else ex.frames[i].t
    hi = ex.frames[i].t if offset < 0 else ex.frames[i + 1].t
    frac = offset + 1 if offset < 0 else offset
    return lo + (hi - lo) * frac


def _knee_at(ex: Extraction, i: int) -> float:
    """Knee flexion at frame i from the more visible leg, median-denoised over ±1 frame."""
    vals = []
    for j in range(max(0, i - 1), min(len(ex.frames), i + 2)):
        f = ex.frames[j]
        side = max(("left", "right"), key=lambda s: f.visibility[s])
        vals.append(f.knee_deg[side])
    return float(np.median(vals))


def detect_contacts(ex: Extraction, side: str) -> list:
    """Contact events: prominent peaks in smoothed paddle-wrist speed.

    A swing reads as a burst of wrist speed; the peak of the burst is our contact
    estimate. Adaptive threshold, then a refractory window so multi-frame bursts and
    follow-throughs don't double-count a rep.
    """
    if len(ex.frames) < 3:
        return []
    speeds = wrist_speeds(ex, side)
    thresh = float(np.mean(speeds) + PEAK_THRESHOLD_STDS * np.std(speeds))
    peaks = [i for i in range(1, len(speeds) - 1)
             if speeds[i] > thresh and speeds[i] >= speeds[i - 1] and speeds[i] >= speeds[i + 1]]

    # refractory window: within MIN_REP_SEPARATION_S keep only the strongest peak
    kept = []
    for i in sorted(peaks, key=lambda i: -speeds[i]):
        if all(abs(ex.frames[i].t - ex.frames[k].t) >= MIN_REP_SEPARATION_S for k in kept):
            kept.append(i)
    kept.sort()

    return [Contact(t=round(_refine_peak_t(ex, speeds, i), 2),
                    knee_deg=round(_knee_at(ex, i), 1),
                    peak_speed=round(speeds[i], 2))
            for i in kept]


def tracking_confidence(ex: Extraction, side: str) -> float:
    """Coverage x visibility: how much of the clip we tracked, and how well.

    This number gates the product's willingness to grade a clip, so it must be honest:
    a clip where pose was found in half the frames, or the paddle side is barely
    visible, must score low.
    """
    if ex.frames_sampled == 0 or not ex.frames:
        return 0.0
    coverage = len(ex.frames) / ex.frames_sampled
    vis = float(np.mean([f.visibility[side] for f in ex.frames]))
    conf = coverage * vis
    if len(ex.frames) < MIN_POSE_FRAMES:
        conf *= len(ex.frames) / MIN_POSE_FRAMES
    return round(min(1.0, conf), 2)


# ------------------------------------------------------------------------- contracts
def eval_contract(clip_id: str, contacts: list, confidence: float) -> dict:
    """Normalized per-clip output for eval/evaluate.py (the accuracy-spike harness)."""
    return {
        "clip_id": clip_id,
        "tracking_confidence": confidence,
        "predicted_contacts": [
            # paddle_face / landing_zone are Tier-2/3 (paddle + ball detection) — null
            # keeps the harness reporting PENDING instead of scoring against nothing.
            {"t": c.t, "knee_deg": c.knee_deg, "paddle_face": None, "landing_zone": None}
            for c in contacts
        ],
    }


def coaching_contract(clip_id: str, ex: Extraction, contacts: list, confidence: float,
                      handedness: str, shot: str, skill: float, note: str) -> dict:
    """Aggregate metrics contract consumed by coach.py / the worker."""
    knees = [c.knee_deg for c in contacts]
    per_rep_flags = []
    if not contacts:
        per_rep_flags.append("no clear swings detected — clip may not contain reps, "
                             "or the paddle arm is out of frame")
    return {
        "clip_id": clip_id,
        "shot_type": shot,
        "player_context": {"skill_level": skill, "goal": "", "handedness": handedness,
                           "note": note},
        "clip_meta": {
            "duration_s": round(ex.frames[-1].t, 1) if ex.frames else 0,
            "fps": SAMPLE_FPS,
            "reps_detected": len(contacts),
            "view_angle": "unknown",  # TODO(prod): estimate from shoulder-width/depth ratio
            "tracking_confidence": confidence,
        },
        "aggregate_metrics": {
            "knee_flexion_deg_at_contact": {
                "mean": round(float(np.mean(knees)), 1) if knees else None,
                "std": round(float(np.std(knees)), 1) if knees else None,
                "ideal_range": [120, 140],
                "note": "smaller = deeper bend; measured at ball contact",
            },
            # TODO(prod): paddle_face_angle needs paddle detection (not a body landmark).
            # TODO(prod): contact_height / contact_point need camera calibration for real cm.
            # TODO(prod): shot_outcome (landing zone) needs ball + court-line tracking.
            # The coaching step already consumes them via the JSON contract when present
            # (see data/sample_metrics_*.json).
        },
        "per_rep": [{"rep": i + 1, "t": c.t, "knee_flexion_deg": c.knee_deg}
                    for i, c in enumerate(contacts)],
        "per_rep_flags": per_rep_flags,
    }


# ------------------------------------------------------------------------ entrypoint
def extract(video_path: str, shot: str, skill: float, note: str = "",
            handedness: str = "auto") -> dict:
    """Video -> coaching metrics contract (what run_pipeline.py / the worker call)."""
    ex = run_pose(video_path)
    side = detect_handedness(ex) if handedness == "auto" else handedness
    contacts = detect_contacts(ex, side)
    conf = tracking_confidence(ex, side)
    return coaching_contract(Path(video_path).stem, ex, contacts, conf,
                             side, shot, skill, note)


def extract_for_eval(video_path: str, handedness: str = "auto") -> dict:
    """Video -> normalized eval contract (what the accuracy spike scores)."""
    ex = run_pose(video_path)
    side = detect_handedness(ex) if handedness == "auto" else handedness
    contacts = detect_contacts(ex, side)
    return eval_contract(Path(video_path).stem, contacts, tracking_confidence(ex, side))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("videos", nargs="+", help="clip(s); clip_id = filename stem")
    ap.add_argument("--shot", default="third_shot_drop")
    ap.add_argument("--skill", type=float, default=3.0)
    ap.add_argument("--note", default="")
    ap.add_argument("--handedness", default="auto", choices=["auto", "left", "right"])
    ap.add_argument("--eval-out", type=Path, metavar="DIR",
                    help="write <clip_id>.json eval contracts here (accuracy-spike mode)")
    args = ap.parse_args()

    if args.eval_out:
        args.eval_out.mkdir(parents=True, exist_ok=True)
        for v in args.videos:
            out = extract_for_eval(v, args.handedness)
            path = args.eval_out / f"{out['clip_id']}.json"
            path.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
            print(f"✓ {v} -> {path}  "
                  f"({len(out['predicted_contacts'])} contacts, "
                  f"conf={out['tracking_confidence']})")
    else:
        for v in args.videos:
            print(json.dumps(extract(v, args.shot, args.skill, args.note,
                                     args.handedness), indent=2))


if __name__ == "__main__":
    main()
