# PickleAI — AI Analysis Pipeline

This is the heart of the product: how a raw phone clip becomes useful coaching. Designed
to be **buildable for MVP** while leaving room to get smarter over time.

## High-level flow

```
Uploaded video
   → 1. Ingest & normalize (transcode, downsample, cap length)
   → 2. Extract signals (pose estimation + frame sampling + optional ball/court detect)
   → 3. Structure the observations (per-shot / per-window features)
   → 4. Reason & coach (LLM turns signals into ranked, plain-English feedback)
   → 5. Assemble report (scores, top fixes, drills, annotated frames)
   → 6. Store + notify
```

## Stage detail

### 1. Ingest & normalize
- Transcode to a consistent format/resolution; sample frames (e.g. 5–15 fps is plenty).
- Enforce length/size caps. Reject/flag unusable clips early (too dark, too far, no player).

### 2. Extract signals
- **Pose estimation** (e.g. MediaPipe Pose / BlazePose or a hosted video-pose model):
  per-frame body keypoints → paddle-arm angle, shoulder rotation, knee bend, weight
  shift, contact point, footwork/split-step timing.
- **Optional (phase-in):** ball tracking + court/kitchen-line detection for positioning
  and shot-outcome context. Start without it; add for richer feedback.
- Output: a **time series of biomechanical + positional features**, plus a few
  representative key frames.

### 3. Structure observations
- Convert raw keypoints into **interpretable metrics** tied to pickleball rubrics, e.g.:
  - Split-step timing before opponent contact.
  - Paddle face angle at contact (open/closed).
  - Contact point relative to body (out front vs. late).
  - Kitchen positioning / recovery to ready position.
  - Consistency/repeatability across reps.
- This structured layer is what makes feedback *specific* instead of hand-wavy.

### 4. Reason & coach (LLM)
- Feed the structured metrics + key frames + user context (skill level, chosen shot
  type, their note) to **Claude** with a **pickleball coaching rubric** prompt.
- Claude produces: overall summary, area scores, **ranked** top fixes (what/why/how),
  and matched drills — in the encouraging, concrete voice of a good coach.
- **Grounding matters:** the LLM reasons over measured signals, not vibes, which keeps
  feedback trustworthy and reduces hallucinated advice.

### 5. Assemble report
- Merge LLM output + annotated key frames (draw pose overlay / highlight contact point).
- Map issues → drills from a curated drill library (keyed by fault type).
- Produce the structured report object the app renders.

### 6. Store & notify
- Persist report + metrics (for progress tracking). Notify user (in-app + email).

## Quality, trust & safety
- **Confidence handling:** if pose/detection confidence is low, say so and suggest a
  better clip (angle/lighting/distance) rather than bluffing.
- **Human-in-the-loop (early):** sample-review outputs during beta to tune the rubric;
  use 👍/👎 signal to find weak spots.
- **Guardrails:** avoid medical/injury claims; stick to technique and strategy.
- **Consistency:** same rubric every time = objective, comparable scores over time.

## Build strategy (crawl → walk → run)
1. **Crawl (MVP):** pose estimation + rubric metrics + Claude coaching on
   *single-shot* clips (serve, dink, drop). Highest signal, lowest complexity.
2. **Walk:** full-rally clips, positioning/footwork, annotated frames, richer drills.
3. **Run:** ball/court tracking, shot-outcome analysis, opponent-context, trend
   modeling across a player's history.

## Cost control
- Downsample frames; cap clip length; async batch processing.
- Cache/reuse per-plan quotas; only run heavy detection on tiers that need it.
