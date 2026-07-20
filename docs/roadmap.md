# PickleAI — Roadmap

Phased so we validate demand before over-investing in the expensive ML.

## Phase 0 — Validate (before heavy build)
- Landing page live with the core pitch + "join waitlist / analyze free" CTA.
- Measure interest (email signups, click-through).
- **Optional "concierge MVP":** manually produce a few AI-assisted analyses for early
  users to confirm the output is genuinely valuable *before* automating everything.
- Lock the pickleball coaching rubric with input from a real coach.

## Phase 1 — MVP (the core loop)
- Auth + profiles + onboarding.
- Upload → async processing → coaching report for **single-shot clips**
  (serve, dink, third-shot drop).
- Pose estimation → rubric metrics → Claude coaching → report with annotated frames.
- History + basic progress view.
- Stripe: free first analysis + one paid tier.
- Landing page → sign-up → paywall-after-value flow.
- **Goal:** prove people pay because it helps.

## Phase 2 — Deepen & retain
- Full-rally clip analysis; footwork/positioning; richer annotated frames.
- More shot types + more/better drills; add drill *videos*.
- Stronger progress analytics and trend tracking.
- Second/third pricing tier (Pro), annual billing.
- Re-engagement + churn-save flows.
- Quality loop: use 👍/👎 data to tune the rubric.

## Phase 3 — Expand
- Ball + court/kitchen-line tracking → shot-outcome + positioning analysis.
- Opponent-context and strategy feedback.
- **Coach/Team (B2B):** multi-student dashboards, assign drills, track cohorts.
- Native mobile app.
- Community / challenges / social proof engine.

## Guiding sequencing principles
- **Validate demand before automating the expensive parts.**
- **Nail single-shot analysis before full-rally** — higher signal, lower complexity.
- **Retention features (progress, habit loop) are not "later"** — they're what makes a
  subscription survive; ship the basics in MVP.
- **Keep the ML swappable** so quality can climb without rewrites.
