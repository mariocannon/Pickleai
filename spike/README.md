# PickleAI — AI Pipeline Spike

**Question this spike answers:** *Can we turn a pickleball clip into coaching that's
accurate, specific, and genuinely useful — not generic filler?*

Pose estimation is solved, commodity tech. The real risk in this product is the
**reasoning link**: given structured biomechanical measurements + a coaching rubric,
does the LLM produce feedback a real player (or coach) would trust? This spike isolates
and tests exactly that.

## The pipeline

```
video.mp4
  → extract_metrics.py   (MediaPipe pose → joint angles, contact detection, per-rep metrics)
  → sample_metrics.json  (structured, MEASURED signals — the grounding for everything)
  → coach.py             (Claude reasons over the metrics using the coaching rubric)
  → coaching_report.json (summary, area scores, ranked fixes w/ drills, each citing evidence)
```

The key design decision: **the LLM never sees raw video and never guesses.** It reasons
over *measured numbers*, and every claim it makes cites the metric behind it. That's what
keeps the feedback trustworthy instead of hallucinated.

## Files

| File | Role |
|------|------|
| `prompts/coaching_system_prompt.md` | The coaching rubric + output contract (the core IP) |
| `extract_metrics.py` | Tier-1 pose→metrics extractor (MediaPipe PoseLandmarker) |
| `coach.py` | Sends metrics to Claude, returns a structured coaching report |
| `run_pipeline.py` | End-to-end CLI: video → report |
| `eval/` | Accuracy harness: labeled clips → PASS/FAIL report card ([results](eval/SMOKE-RESULTS.md)) |
| `tests/` | Signal-math unit tests + real-video integration test |
| `data/sample_metrics_weak.json` | Realistic metrics for a shaky 3.0 third-shot drop |
| `data/sample_metrics_strong.json` | Realistic metrics for a dialed-in 4.5 drop |
| `sample_output.md` | **The proof** — real coaching output for both inputs |

## Run it yourself

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...

# Coach step only (fast, cheap — proves the risky link):
python coach.py data/sample_metrics_weak.json
python coach.py data/sample_metrics_strong.json

# Full pipeline from a real clip (pose model auto-downloads on first run):
python run_pipeline.py path/to/your_clip.mp4 --shot third_shot_drop --skill 3.0

# Accuracy spike: batch-extract labeled clips, then score against ground truth:
python extract_metrics.py clips/*.mp4 --eval-out eval/out/
python eval/evaluate.py --labels eval/labels_myclips.csv --metrics-dir eval/out/

# Tests (unit: instant, no video; integration: real MediaPipe on real video, ~30 s):
python -m unittest discover -s tests
```

## What "proven" looks like

Read `sample_output.md`. The same rubric, run on two different players, must produce:
- **Different, appropriate** feedback (the weak drop gets "get lower / shorten backswing";
  the strong drop gets fine-tuning, not invented problems).
- **Grounded claims** — every fix cites the metric it's based on.
- **Honest confidence** — low tracking confidence downgrades the verdict instead of bluffing.

If those hold, the reasoning link works and the product is viable. See the "Verdict"
section at the bottom of `sample_output.md`.

## Extractor status (the accuracy spike)

`extract_metrics.py` is now a real Tier-1 (pose-only) extractor, not a stub: swing/
contact detection with sub-frame timing, side-aware knee flexion, handedness
auto-detection, and a calibrated `tracking_confidence` (coverage × landmark visibility)
that lets the product **abstain** on unreadable clips instead of bluffing. It is
validated two ways:

- `tests/test_extract_metrics.py` — signal math on synthetic trajectories (instant, no ML).
- `tests/test_real_video_integration.py` + [`eval/SMOKE-RESULTS.md`](eval/SMOKE-RESULTS.md)
  — real MediaPipe on real video: known motion events recovered within 40 ms at 0.99
  confidence; junk footage correctly self-reported at the abstain boundary.

Still Tier-2/3 (deliberately deferred): paddle-face angle, ball/landing-zone, and real-cm
contact height need paddle/ball/court detection + calibration. The eval harness reports
them PENDING, and the go/no-go for the MVP needs 15–25 real labeled pickleball clips per
[`dataset.md`](dataset.md).
