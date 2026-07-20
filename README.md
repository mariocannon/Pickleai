# PickleAI 🥒🎾

**AI-powered pickleball coaching. Upload a clip, get pro-level feedback in minutes.**

PickleAI is a subscription web app (inspired by the "Wrestle AI" model) that lets
pickleball players upload video of themselves playing and receive automated,
personalized critique — technique breakdowns, shot-by-shot tips, drills, and a
running improvement plan.

---

## What's in this repo (planning phase)

This branch contains **planning only — no application code yet.** It's the blueprint
we'll build from.

| Doc | What it covers |
|-----|----------------|
| [`docs/product-plan.md`](docs/product-plan.md) | Vision, personas, value prop, competitive angle, success metrics |
| [`docs/mvp-scope.md`](docs/mvp-scope.md) | Exactly what ships in the MVP (and what doesn't) |
| [`docs/landing-page.md`](docs/landing-page.md) | Landing page structure, section-by-section copy, and CTAs |
| [`docs/web-app-mvp.md`](docs/web-app-mvp.md) | App pages, user flows, and screen-by-screen breakdown |
| [`docs/ai-pipeline.md`](docs/ai-pipeline.md) | How a video becomes coaching feedback (the technical core) |
| [`docs/tech-architecture.md`](docs/tech-architecture.md) | Stack, data model, storage, and system diagram |
| [`docs/monetization.md`](docs/monetization.md) | Pricing tiers, subscription mechanics, unit economics |
| [`docs/roadmap.md`](docs/roadmap.md) | Phased build plan from MVP to v2 |

## The one-paragraph pitch

Recreational and competitive pickleball players want to improve but can't afford a
$60–100/hr coach for regular feedback. PickleAI turns any phone video into a coaching
session: our pipeline analyzes body mechanics, shot selection, positioning, and timing,
then delivers plain-English critique plus a prioritized drill plan. Players subscribe
monthly for unlimited (or metered) uploads and track progress over time.

## Suggested build stack (see tech doc for detail)

- **Frontend:** Next.js (React) + Tailwind CSS
- **Backend / DB / Auth / Storage:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **AI analysis:** Pose estimation (MediaPipe / video model) + Claude for natural-language coaching
- **Payments:** Stripe subscriptions
- **Video processing:** Background job queue (async)
