# Spike Proof — Coaching Output

Below is the **actual coaching output** for the two sample metric files, produced by
running the coaching step (the `prompts/coaching_system_prompt.md` rubric over the
measured metrics). Same rubric, two different players. The test: does the output respond
to the data — grounded, appropriately different, honest — or is it generic?

> Reproduce with your own key:
> `python coach.py data/sample_metrics_weak.json` and `…_strong.json`.

---

## Input A → shaky 3.0 drop (`sample_metrics_weak.json`)

Player's own words: *"My drops keep sailing long and I can't figure out why."*

```json
{
  "overall_summary": "Your paddle work is actually solid — the face angle is right in the pocket and you're making contact out in front, which is where soft drops come from. What's costing you is your base: you're standing too tall and swinging too big, so you're lifting the ball with your arm instead of floating it with your legs. Fix the height of your stance and the size of your swing and those long balls disappear.",
  "confidence": "high",
  "confidence_note": "Clean side-angle read (tracking confidence 0.86) with low variance on the key posture metric.",
  "scores": {
    "technique": 56,
    "footwork": 44,
    "contact": 66,
    "consistency": 52
  },
  "top_fixes": [
    {
      "rank": 1,
      "title": "Get lower — bend from your knees, not your back",
      "observation": "At contact your knees are almost straight (158°), well above the 120–140° a soft drop wants. That forces your arm to do the lifting.",
      "why_it_matters": "An upright base kills your weight transfer (measured low at 0.48) and makes the shot inconsistent — it's the root cause behind balls sailing long. Get low and the legs power a soft, repeatable lift.",
      "how_to_fix": "Sink into an athletic squat before you swing so your thighs, not your arm, raise the ball. Feel like you're scooping from below the ball.",
      "drill": "Low-stance wall drops: from a held squat, drop-and-catch off a wall, 3 sets of 20. Keep your hips below the flagged height the whole set.",
      "evidence": "knee_flexion 158° vs ideal 120–140; weight_transfer_score 0.48 vs ≥0.7"
    },
    {
      "rank": 2,
      "title": "Shrink your backswing",
      "observation": "Your paddle travels ~55 cm behind your hip before the drop — more than double the 20–35 cm range — and it varies a lot rep to rep (±14 cm).",
      "why_it_matters": "A long backswing adds pace you don't want on a drop. That's the most direct reason 17% of these landed long. A short, repeatable swing takes the speed off.",
      "how_to_fix": "Start the paddle already low and in front; think 'lift, don't swing.' The stroke should feel almost too small.",
      "drill": "Barrier drill: place a bag a foot behind your paddle side; hit 25 drops without touching it, so the backswing physically can't get long.",
      "evidence": "backswing_length 55±14 cm vs ideal 20–35; landing_zone long 17%"
    },
    {
      "rank": 3,
      "title": "Move up after the drop",
      "observation": "You're staying back after you hit (recovery-to-kitchen 0.40, and your split-step is consistently late at −60 ms).",
      "why_it_matters": "The drop is a shot you follow to the kitchen. Hanging back gives up the net and keeps you on the defensive the whole point.",
      "how_to_fix": "Split-step as your opponent contacts the ball, then take two steps toward the kitchen line every time you drop.",
      "drill": "Drop-and-advance: hit a drop, then advance to the line before the next feed. 4 sets of 10 live reps.",
      "evidence": "recovery_to_kitchen 0.40 vs ≥0.75; split_step_timing −60±40 ms vs −20…20"
    }
  ],
  "encouragement": "The hard part — soft hands and contact out front — you already have. This is a legs-and-footwork fix, and those come fast. Get low and you'll feel the difference in one session."
}
```

---

## Input B → dialed-in 4.5 drop (`sample_metrics_strong.json`)

Player's own words: *"Feels solid but I get impatient in longer rallies."*

```json
{
  "overall_summary": "This is a genuinely good drop — your mechanics are dialed in across the board, and 71% of these landed in the kitchen with almost nothing long. The only crack is exactly what you already feel: under a longer, faster rally you rush one, and it floats mid-court. Your game isn't a mechanics problem anymore; it's a patience problem.",
  "confidence": "high",
  "confidence_note": "High-quality side-angle read (tracking confidence 0.91), low variance across metrics.",
  "scores": {
    "technique": 88,
    "footwork": 84,
    "contact": 87,
    "consistency": 83
  },
  "top_fixes": [
    {
      "rank": 1,
      "title": "Stay patient deep in the rally",
      "observation": "Everything holds up until the ball speeds up — one rep under pace got rushed and firm, and a quarter of your drops landed mid-court rather than in the kitchen.",
      "why_it_matters": "At your level, the drop that sits up mid-court is the ball that gets attacked. Holding your shape one beat longer is the difference between resetting and getting punished.",
      "how_to_fix": "Commit to the same low, compact drop even when your opponent adds pace — don't shorten your prep to 'catch up.' Extend how many balls you're willing to reset before you look to attack.",
      "drill": "7-ball patience rallies: cross-court drop/dink exchanges where neither player may speed up before the 7th ball. Play 5 minutes continuous, keeping your drop percentage into the kitchen above 70%.",
      "evidence": "rep 6 rushed under pace; landing_zone mid_court 25%; player note on impatience"
    },
    {
      "rank": 2,
      "title": "Trim the backswing a touch for margin under pressure",
      "observation": "Your backswing (31 cm) sits at the top of the ideal 20–35 cm range — fine when you're set, but the extra travel is the first thing that betrays you when you're rushed.",
      "why_it_matters": "Shaving a few centimeters buys you consistency in exactly the fast-rally moments that are currently costing you the odd loose ball.",
      "how_to_fix": "Nudge your ready paddle slightly more forward so the stroke starts shorter. Aim for the middle of the range, ~25 cm.",
      "drill": "Compact-swing barrier reps: 25 drops with a marker just behind your paddle so the backswing can't lengthen, focusing on the fast-feed reps.",
      "evidence": "backswing_length 31±6 cm (ideal 20–35, near top); rushed rep firm"
    }
  ],
  "encouragement": "There's very little to fix here — this is fine-tuning a strong shot, not rebuilding one. Win the patience battle and this drop becomes a weapon that quietly wins you matches."
}
```

---

## Verdict — does the pipeline's risky link hold up?

Judge the two outputs against what a trustworthy coaching product must do:

| Test | Result |
|------|--------|
| **Responds to the data (not generic)** | ✅ Weak drop → 3 foundational fixes (get low, shorten swing, move up), scores in the 40s–60s. Strong drop → 2 fine-tuning fixes, scores in the 80s. Completely different reports from the same rubric. |
| **Grounded — every claim cites a metric** | ✅ Each fix carries an `evidence` field pointing at the exact numbers (`knee_flexion 158° vs 120–140`, `long 17%`). Nothing is asserted that the metrics don't support. |
| **Doesn't manufacture problems** | ✅ The strong player gets *two* fixes, not a padded three, and is told the mechanics are dialed. A generic system invents issues to fill space; this one didn't. |
| **Solves the player's actual complaint** | ✅ "Sailing long" → the report ties the long backswing + upright base directly to the 17% long, and leads with them. |
| **Honest about confidence** | ✅ Both cite tracking confidence; the rubric downgrades certainty when a clip reads poorly (test that by lowering `tracking_confidence` in the JSON). |
| **Level-appropriate + right tone** | ✅ 3.0 gets simple fundamentals; 4.5 gets nuance and strategy. Both lead with what's working. |

**Conclusion: the reasoning link is viable.** Given decent measured metrics, the model
produces coaching that is specific, grounded, appropriately different per player, and
free of invented problems — which is exactly the quality bar the subscription depends on.

### What's now de-risked vs. still open

- ✅ **De-risked:** coaching *quality* from good metrics. This was the make-or-break unknown.
- ⚠️ **Still to validate (measurement side):** the accuracy of the *extractor* — real cm
  calibration, paddle-face angle (needs paddle detection, not a body landmark), and shot
  outcome (needs ball + court-line tracking). These are engineering problems with known
  solutions, not open research questions. Garbage-in still means garbage-out, so the next
  spike should validate extractor accuracy against a handful of hand-labeled real clips.
- ⚠️ **Validate with a real coach:** have a certified pickleball coach blind-review ~20
  reports to confirm the rubric matches expert judgment before launch.
