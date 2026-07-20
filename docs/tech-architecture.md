# PickleAI — Tech Architecture

Pragmatic stack chosen so a small team can ship the MVP fast and scale later.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | **Next.js (React) + Tailwind CSS** | Fast to build, great for both marketing site and app, SSR for SEO on landing page |
| Auth | **Supabase Auth** | Email + Google out of the box, integrates with row-level security |
| Database | **Supabase Postgres** | Relational data (users, videos, analyses), RLS for privacy |
| File storage | **Supabase Storage** | Store uploaded videos + generated key frames, private buckets + signed URLs |
| Background jobs | **Queue + worker** (Supabase Edge Functions / a worker service) | Async video processing — never block requests on inference |
| Pose/video ML | **MediaPipe / hosted pose model** | Extract biomechanical signals |
| Coaching LLM | **Claude** | Turn signals into ranked, plain-English coaching + drills |
| Payments | **Stripe** (subscriptions + customer portal) | Standard, trusted, handles billing/dunning |
| Email | Transactional email (e.g. Resend/Postmark) | "Analysis ready", receipts, re-engagement |
| Hosting | Vercel (frontend) + Supabase (backend) | Low ops overhead |

> Note: **Supabase is already connected to this project's tooling**, which is why it's
> the recommended backend — it covers auth, DB, storage, and functions in one platform.

## System diagram

```
        ┌──────────────┐        ┌──────────────────────┐
        │  Next.js app │        │   Landing page (SSR)  │
        │ (auth'd app) │        │  marketing + sign-up  │
        └──────┬───────┘        └───────────┬──────────┘
               │                            │
               ▼                            ▼
        ┌─────────────────────────────────────────────┐
        │                Supabase                      │
        │  Auth  │  Postgres (RLS)  │  Storage (video) │
        └───┬─────────────┬────────────────┬───────────┘
            │             │                 │
     upload │       write │           store │ video + frames
            ▼             ▼                 ▼
        ┌─────────────────────────────────────────────┐
        │        Async job queue + worker              │
        │  1. normalize  2. pose/signals  3. metrics   │
        │  4. Claude coaching  5. assemble report      │
        └───────────────────┬─────────────────────────┘
                            │ writes report
                            ▼
                    ┌──────────────┐        ┌──────────┐
                    │  Postgres    │        │  Stripe  │
                    │  (analyses)  │        │ billing  │
                    └──────────────┘        └──────────┘
```

## Data model (starter schema)

```
users                (managed by Supabase Auth)
profiles             id (fk user), skill_level, primary_goal, created_at
subscriptions        id, user_id, stripe_customer_id, stripe_sub_id, plan, status,
                     current_period_end, monthly_quota, used_this_period
videos               id, user_id, storage_path, analysis_type, note, duration,
                     status (uploaded|processing|done|failed), created_at
analyses             id, video_id, user_id, summary, scores (jsonb),
                     top_fixes (jsonb), drills (jsonb), model_meta (jsonb),
                     confidence, created_at
analysis_frames      id, analysis_id, storage_path, caption, ts_seconds
feedback             id, analysis_id, user_id, insight_id, rating (up|down), comment
drills               id, key, name, description, targets (fault types), media_url?
```

- **RLS:** every row scoped to its `user_id` — a user can only ever see their own videos
  and analyses. Storage buckets private; served via short-lived signed URLs.

## Key architectural principles
- **Async by default** — uploads and analysis never block the UI.
- **Privacy first** — private storage, RLS everywhere, easy delete.
- **Cost-aware** — quotas enforced at the subscription layer before jobs run.
- **Model-swappable** — the pose extractor and the LLM are behind interfaces so we can
  upgrade either without rewriting the app.
- **Stripe as source of truth for entitlements** — webhook-driven subscription status.

## Third-party accounts to set up
- Supabase project, Stripe account, Claude API access, transactional email provider,
  Vercel project. (No secrets committed — use environment variables.)
