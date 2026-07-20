# Accuracy Spike — Eval Harness

Compares the extractor's output against your hand-labeled ground truth and prints a
PASS / FAIL / PENDING report card with a go/no-go verdict.

## Try it now (fixtures, no video or mediapipe needed)

```bash
python evaluate.py --labels fixtures/labels_demo.csv --metrics-dir fixtures/metrics
```

You'll get a report card: contact-detection F1, timing error, knee-bend bucket accuracy +
angle MAE, and — crucially — **confidence calibration** (does low `tracking_confidence`
predict high error?). Tier-2/3 metrics (paddle face, landing zone) show as PENDING until
those detectors exist.

## With your real clips

1. Film and label per [`../dataset.md`](../dataset.md); save as `labels_myclips.csv`.
2. Extract metrics for each clip into normalized JSON (`<clip_id>.json`) in a folder,
   e.g. `out/`. Each file:
   ```json
   {"clip_id": "clip_a", "tracking_confidence": 0.9,
    "predicted_contacts": [{"t": 3.45, "knee_deg": 154, "paddle_face": null, "landing_zone": null}]}
   ```
3. Run:
   ```bash
   python evaluate.py --labels labels_myclips.csv --metrics-dir out/ --out report.md
   ```

## Reading the verdict

- **GO** on Tier-1 = the pose-only extractor is accurate enough to ship the MVP; defer
  paddle/ball detection.
- A **FAIL** points you at the exact weak metric (e.g. contact timing) instead of a vague
  "it's off."
- The **calibration** line is the safety check: if it passes, the product can trust its
  own confidence and **abstain** on clips it can't read — the behavior that protects users
  from confidently-wrong feedback.

## Tuning

All acceptance thresholds live at the top of `evaluate.py` (F1 floor, timing tolerance,
knee MAE ceiling, calibration target, abstain cutoff). Adjust with a coach's input.

> Standard library only — no pandas/numpy needed to run the eval.
