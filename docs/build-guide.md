# PickleAI — Setup & Run Guide

Everything needed to take the code in this repo to a running product. Three moving
parts: the **web app** (`web/`, Next.js), the **database** (`supabase/`), and the
**analysis worker** (`worker/`, Python).

```
Browser ──▶ web/ (Next.js on Netlify)
              │  auth, upload, quota, Stripe, reports UI
              ▼
          Supabase (Postgres + Auth + Storage)
              ▲
              │  polls queue, writes reports
          worker/ (Python, runs anywhere)──▶ Claude API
```

## 1. Supabase (~10 min)

1. Create a project at supabase.com (or ask Claude to provision one via MCP).
2. Run the migration: SQL editor → paste `supabase/migrations/0001_init.sql` → run.
   This creates all tables, RLS policies, the signup trigger, the quota function,
   and the private `videos` storage bucket.
3. Auth → Providers: email (magic link) is on by default. For Google sign-in, add
   Google OAuth credentials (console.cloud.google.com) — optional, the email link
   works without it.
4. Copy from Settings → API: the project URL, the anon/publishable key, and the
   service-role key.

## 2. Web app (~5 min local)

```bash
cd web
cp .env.example .env.local     # fill in the Supabase + Stripe values
npm install
npm run dev                    # http://localhost:3000
```

You can sign in and upload immediately — clips will sit in "queued" until the worker
runs.

## 3. Analysis pipeline (serverless — the default)

Analysis runs **inside Supabase**, no servers to operate:

- `supabase/functions/analyze-video/` — edge function that claims a queued video,
  produces metrics, calls Claude with the coaching rubric, and writes the report.
- A database webhook (`videos_analyze_webhook` trigger, pg_net) fires it on every
  `videos` INSERT. Event-driven; scales automatically.

Setup is one secret: Supabase dashboard → **Edge Functions → Secrets** → add
`ANTHROPIC_API_KEY`. Deploy/update the function with
`supabase functions deploy analyze-video` (or via the Supabase MCP).

**Extraction status:** pose estimation (MediaPipe) can't run in an edge function,
so the function currently generates plausible measured metrics ("demo extraction")
while making the real Claude coaching call. For real extraction, deploy `worker/`
as a small container (Fly.io / Railway / Modal) with the ML deps installed — it
polls the same queue, so no app changes are needed; then disable the demo path.

## 4. Stripe (~15 min)

1. dashboard.stripe.com → create two recurring prices: Starter $14/mo, Pro $28/mo.
   Put their `price_...` ids in `web/.env.local`.
2. Webhook endpoint → `https://YOUR_DOMAIN/api/stripe/webhook`, events:
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.paid`. Copy the signing secret to
   `STRIPE_WEBHOOK_SECRET`.
   For local dev: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
3. Enable the customer portal (Settings → Billing → Customer portal).

Free trial needs no Stripe setup — every new signup gets 1 analysis via the DB trigger.

## 5. Deploy (Netlify)

1. Netlify → Import from Git → this repo. `netlify.toml` already points the build at
   `web/` with the Next.js runtime.
2. Add the env vars from `web/.env.example` in Site settings → Environment variables.
3. In Supabase → Auth → URL configuration, set the site URL to your Netlify domain
   (so magic-link emails redirect correctly).
4. Run the worker somewhere persistent (any small VM/container — it's a poll loop).

## What's wired vs. what's stubbed

| Piece | Status |
|---|---|
| Auth (magic link + Google-ready), signup bootstrap | ✅ wired |
| Upload → private storage → quota-checked queue | ✅ wired (quota atomic in SQL) |
| Worker → metrics → Claude → report, failure refunds quota | ✅ wired (demo or real extractor) |
| Report UI (scores, ranked fixes, evidence, confidence, 👍/👎) | ✅ wired |
| Stripe checkout/webhook/portal, period quota reset | ✅ wired |
| "Analysis ready" email notification | ⏳ post-MVP (add Resend/Postmark) |
| Progress-over-time view | ⏳ post-MVP (data already stored per analysis) |
| Annotated key frames in reports | ⏳ post-MVP (worker can save frames to storage) |
