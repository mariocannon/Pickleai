# PickleAI — Product Plan

## 1. Vision

Give every pickleball player access to affordable, on-demand coaching. A phone video
in, an actionable coaching report out. We compress the feedback loop that normally
requires a human coach, court time, and scheduling into a few minutes and a few dollars.

## 2. The problem

- Pickleball is the **fastest-growing sport in the US** — huge, motivated, rapidly
  expanding player base.
- Most players are **self-taught** and plateau quickly. They *feel* they're doing
  something wrong but can't see it.
- **Human coaching is expensive** ($60–100+/hr), hard to schedule, and inconsistent.
- Players already record themselves on their phones — but staring at their own footage
  doesn't tell them *what to fix or how*.

## 3. The solution

Upload a clip → PickleAI analyzes it → you get:
1. **A plain-English critique** ("Your paddle face is opening too early on the third
   shot drop, sending it long.")
2. **Prioritized fixes** ranked by impact.
3. **Specific drills** to correct each issue.
4. **Progress tracking** across uploads over time.

## 4. Why now

- Pose-estimation and video-understanding models are good enough and cheap enough to run
  at scale.
- LLMs (Claude) can translate raw biomechanical/positional data into coaching language a
  human actually understands.
- "AI coach" products in adjacent sports (Wrestle AI, golf/tennis swing apps) have
  proven people will pay a subscription for this.

## 5. Target users (personas)

| Persona | Description | What they want |
|---------|-------------|----------------|
| **Improving Rec Player ("Dave, 3.0")** | Plays 2–3x/week, wants to break into 3.5/4.0 | Clear "what to work on next" without paying a coach every week |
| **Competitive Amateur ("Priya, 4.0")** | Plays tournaments, already has fundamentals | Fine-tuning, shot selection, opponent-agnostic mechanics review |
| **New Player ("Marcus")** | Just started, overwhelmed | Fundamentals, confidence, avoiding bad habits early |
| **Coaches & Clinics (B2B, later)** | Teach many students | A tool to scale feedback + track student progress |

**MVP focus:** the Improving Rec Player. Largest segment, highest willingness to pay for
"get better," least served by existing options.

## 6. Value proposition

> **A coach in your pocket for the price of one lesson a month.**

- Cheaper than a single in-person lesson.
- Available 24/7, no scheduling.
- Objective and consistent — no ego, no bad days.
- Tracks progress so improvement is visible and motivating.

## 7. Competitive landscape / positioning

- **Human coaches:** better but expensive, unscalable, inconsistent. We complement, not
  fully replace.
- **YouTube / generic tutorials:** free but *generic* — not about *your* swing.
- **Adjacent AI apps** (golf/tennis): prove the model; none own pickleball well yet.
- **Our wedge:** be the *default AI coach for pickleball* — sport-specific analysis
  (dinks, third-shot drops, kitchen positioning, stacking) that a generic tool can't do.

## 8. Success metrics (North Star + supporting)

- **North Star:** # of videos analyzed per active subscriber per month (engagement =
  value delivered).
- Activation: % of signups who upload their first video within 24h.
- Retention: month-2 and month-3 subscription retention.
- Conversion: free-trial / first-free-analysis → paid.
- Perceived quality: thumbs-up rate on analyses; "did this help?" survey.
- Revenue: MRR, churn, ARPU.

## 9. Key risks & how we address them

| Risk | Mitigation |
|------|------------|
| AI feedback is generic or wrong → users churn | Start with high-confidence, sport-specific rubrics; let users flag bad feedback; keep a human-review escape hatch early |
| Video processing cost eats margin | Async processing, clip length limits, tiered upload quotas |
| Users don't trust "AI coach" | Show the *why* (annotated frames, pose overlays), not just verdicts |
| Cold start / no differentiation | Nail pickleball-specific analysis (kitchen, dinks, stacking) generic apps ignore |
| Privacy concerns with personal video | Clear data policy, private-by-default, easy delete |
