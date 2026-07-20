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
| `extract_metrics.py` | Reference pose→metrics extractor (MediaPipe) |
| `coach.py` | Sends metrics to Claude, returns a structured coaching report |
| `run_pipeline.py` | End-to-end CLI: video → report |
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

# Full pipeline from a real clip (needs mediapipe + a video):
python run_pipeline.py path/to/your_clip.mp4 --shot third_shot_drop --skill 3.0
```

## What "proven" looks like

Read `sample_output.md`. The same rubric, run on two different players, must produce:
- **Different, appropriate** feedback (the weak drop gets "get lower / shorten backswing";
  the strong drop gets fine-tuning, not invented problems).
- **Grounded claims** — every fix cites the metric it's based on.
- **Honest confidence** — low tracking confidence downgrades the verdict instead of bluffing.

If those hold, the reasoning link works and the product is viable. See the "Verdict"
section at the bottom of `sample_output.md`.

> This is a spike, not production code. `extract_metrics.py` is a faithful reference
> implementation of the measurement stage, but a production extractor needs more
> robustness (multi-angle handling, ball/court detection, per-rep segmentation at scale).
> The point here is to de-risk the *coaching quality*, which is the part money and
> reputation ride on.
