# Accuracy Spike — Dataset & Consent

The accuracy spike needs ~15–25 real clips with hand-labeled ground truth. This note
covers where clips come from, how to film them, consent, and where they live (they do
**not** go in git).

## Sourcing — in order of preference

1. **Self-filmed (best).** You control the conditions and own all rights. A couple of
   sessions at your local court covers the range. Perfect ground truth because you were
   there.
2. **Consenting players.** League mates / friends who sign the one-line consent below.
   Fine at this scale.
3. **Creative Commons video.** YouTube can be filtered to CC-licensed clips, which are
   reusable with attribution — a legit way to add variety.

**Avoid:** scraped social/YouTube clips (platform terms + copyright) for anything beyond
throwaway private testing, and pro/tournament/broadcast footage entirely (aggressively
protected). None of this applies to the live product — there, users upload their own
video and your Terms grant the processing license.

## Film for the stress test, not the highlight reel

The spike's job is to find where the extractor breaks, so **deliberately vary conditions**:

- **Angle:** mostly **side-on** (perpendicular to the player — best for joint angles), plus
  a few **back-angle** clips, since that's how many users will actually film.
- **Framing:** whole body in frame, head to feet. Prop the phone so it's steady.
- **Include the ball landing** when you can — you need it to label landing zone.
- **Reps:** 30–90s per clip, several reps of **one shot type** (drop, dink, serve…).
- **Deliberately mix:** good light *and* glare/shade; close *and* far; steady *and*
  handheld; at least one **left-handed** player if possible. Note handedness.
- Label each clip's conditions (see the template) so you can see *which* conditions cause
  errors — that's the whole point.

## Consent (one line, keep on file)

> I, **[name]**, consent to [you/Company] recording and using video of me playing
> pickleball for the private development and testing of PickleAI's coaching technology.
> These clips will not be published or shared publicly. **[signature / date]**

Self-filmed clips of just yourself don't need this. Anyone else in frame does.

## Where clips live (NOT in git)

Raw video should never be committed — it bloats the repo and carries people's likeness.

- Keep them locally in **`spike/clips/`** (gitignored — see repo `.gitignore`).
- Or store them in **Supabase Storage** (already in the stack) in a private bucket.
- Run `extract_metrics.py` where the clips + `mediapipe` live (your machine or a worker),
  not in an ephemeral web session.

## Labeling

For every rep, fill one row of **`eval/labels_template.csv`**. Label from the video with
the same protocol every time so two people would agree. Then the eval harness compares
the extractor's output to these labels and prints the per-metric report card.

Ground-truth tips:
- **Contact frame:** scrub to the frame the paddle meets the ball; record its timestamp.
- **Knee bend:** eyeball a bucket (deep / ok / upright) — or use a protractor on a
  freeze-frame if you want a real angle to measure MAE against.
- **Landing zone:** objectively visible — kitchen / mid-court / long / out.
- **Paddle face / contact point:** open-neutral-closed, front-even-late.
