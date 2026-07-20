# PickleAI — MVP Scope

The MVP proves one thing: **players will pay a subscription because the AI feedback
genuinely helps them improve.** Everything below serves that proof. Anything that
doesn't is deferred.

## In scope (MVP)

### Accounts & billing
- Email + Google sign-in (Supabase Auth).
- Stripe subscription: one paid tier + a limited free trial (1 free analysis).
- Basic account/settings page (change plan, cancel, delete account).

### Core loop: upload → analyze → feedback
- **Upload a video** (mobile-friendly; drag-drop on desktop). Clip length capped
  (e.g. 30–90s) to control cost and keep analysis focused.
- **Select analysis type** on upload: e.g. *Full game clip*, *Specific shot*
  (dink / third-shot drop / serve / volley). This scopes the AI's attention.
- **Async processing** with a clear "we're analyzing your clip" status.
- **Coaching report** delivered in-app (and optional email "your analysis is ready"):
  - Overall summary + a 1–10 style read on key areas.
  - Top 3 prioritized issues, each with: what's happening, why it matters, how to fix.
  - Recommended drills per issue.
  - Annotated key frames / pose overlay where feasible (strong trust signal).
- **Feedback on feedback:** thumbs up/down + "was this helpful?" to improve quality.

### History & progress
- List of past analyses.
- Simple progress view: see recurring issues and whether they're improving over time.

### Landing page
- Public marketing site that sells the product and drives sign-ups (see
  `landing-page.md`).

## Explicitly OUT of scope (deferred to post-MVP)

- Live / real-time analysis.
- Multi-player or opponent analysis in the same clip.
- Native mobile apps (web-responsive only for MVP).
- Coach/clinic B2B dashboard and student management.
- Social features, leaderboards, community.
- Automatic shot-by-shot timeline scrubbing (v2 UX).
- Team/family plans.
- In-app drill *videos* library (start with text/described drills; add video later).
- Wearable/sensor integration.

## MVP definition of done

A new user can: land on the site → understand the value → sign up → upload a clip →
receive a genuinely useful, pickleball-specific coaching report within minutes →
subscribe → and come back to upload more and see progress.

## Cost/scope guardrails baked into MVP

- Hard clip-length + resolution caps.
- Monthly upload quota per plan (prevents runaway processing cost).
- Async job queue so we never block a request on model inference.
- Store only what we need; let users delete videos.
