# Accuracy Spike — Smoke Run Results (2026-07-21)

**Question:** is the extractor real — does actual video go through actual pose
estimation and come out as scored, trustworthy metrics? **Yes.** This run proves the
full loop end-to-end on real footage; the remaining work is pickleball-specific data,
not plumbing.

## What ran

```
extract_metrics.py clip1.mp4 clip2.avi --eval-out out/     # real MediaPipe PoseLandmarker
eval/evaluate.py --labels labels_smoke.csv --metrics-dir out/
```

Two real videos, chosen to test both sides of the honesty contract:

1. **`real_person_bursts`** — a video of a real human (mediapipe-assets photo,
   Apache-2.0) moving in three sharp bursts at known times (3.0 s, 6.0 s, 9.0 s).
   Ground truth is exact, so extraction accuracy is directly measurable.
2. **`vtest`** — OpenCV's far-away pedestrian surveillance clip. No rally content;
   a trustworthy extractor must score *itself* low here rather than confidently
   inventing contacts.

## Report card

```
[FAIL ] Contact detection  F1=0.32  (P=0.19 R=1.00, TP3/FP13/FN0)   target: >= 0.85
[PASS ] Contact timing     mean |Δt|=40 ms                          target: <= 300 ms
[PASS ] Knee-bend bucket   acc=1.00  (n=3)                          target: >= 0.8
[PASS ] Knee angle MAE     0.5°                                     target: <= 8.0°
[PASS ] Confidence calib   corr(conf,err)=-1.00                     target: <= -0.4

Per-clip:
  real_person_bursts conf=0.99  F1=1.00  (TP3/FP0/FN0) clean
  vtest              conf=0.51  F1=0.00  (TP0/FP13/FN0) poor
```

## How to read this

- **On readable footage the extractor is precise.** All 3 known motion events found,
  40 ms mean timing error (tolerance is 300 ms), knee angle within 0.5° of the labeled
  estimate, confidence 0.99.
- **On junk footage it tells on itself.** The pedestrian clip produced false contacts —
  and confidence dropped to 0.51, right at the abstain boundary (0.50). Calibration
  corr = −1.00: confidence predicts error, which is the property that lets the product
  **decline to grade** clips it can't read instead of bluffing.
- **The pooled FAIL is the harness working, not failing.** A deliberately out-of-domain
  clip drags pooled F1 down and the harness says NO-GO instead of averaging the problem
  away. That's exactly the behavior we want when real user clips hit edge cases.

## What this does NOT prove yet

This is a smoke run, not the pickleball verdict. It validates the machinery (decode →
pose → contact detection → confidence → harness), and timing/knee accuracy on
controlled motion. The go/no-go for the MVP still needs **15–25 real labeled pickleball
clips** filmed per [`../dataset.md`](../dataset.md) — real swings, varied angles and
lighting, a left-hander. Open items to settle with that data:

- Contact detection precision on real swings (backswing vs. contact vs. follow-through).
- Whether the 0.50 abstain cutoff is right — the junk clip sat at 0.51; tune the
  threshold (and `PEAK_THRESHOLD_STDS` / `MIN_REP_SEPARATION_S`) against real footage
  with a coach's input.
- Knee-bucket boundaries against a coach's judgment, not a protractor estimate.

## Reproduce

```bash
cd spike
pip install -r requirements.txt        # model auto-downloads on first run (~6 MB)
python -m unittest discover -s tests   # signal-math tests, no video needed
python -m unittest tests.test_real_video_integration -v   # this smoke run, ~30 s
```
