# PickleAI — Monetization

Subscription-first, usage-metered to protect margin (video processing has real cost).

## Model

**Freemium → subscription.** A free first analysis proves value; monthly plans unlock
volume. Quotas (analyses/month) keep processing cost predictable per user.

## Proposed tiers

| Tier | Price (monthly) | Analyses / mo | Features |
|------|-----------------|---------------|----------|
| **Free trial** | $0 | 1 total (one-time) | One full analysis, watermarked/limited history — the hook |
| **Starter** | ~$12–15 | ~8–10 | Full reports, drills, history, progress tracking |
| **Pro** | ~$25–30 | ~30 (or "unlimited*") | Everything + priority processing, longer clips, all shot types, deeper progress analytics |
| **(Later) Coach/Team** | Custom | High / seats | Multi-student dashboards, progress across players |

\* "Unlimited" should be soft-capped with fair-use to prevent abuse.

**Annual option:** offer ~2 months free on annual billing to boost LTV and cut churn.

Positioning line to reuse everywhere: **"Less than one lesson a month."**

## Why metered quotas
- Each analysis costs real money (transcode + pose inference + LLM tokens + storage).
- Quotas make **gross margin predictable** and give a natural upgrade path
  (hit your limit → upgrade).
- Higher tiers unlock the expensive stuff (longer clips, more detection) intentionally.

## Unit economics (illustrative — validate with real numbers)

Per-analysis variable cost ≈ transcode + pose inference + LLM tokens + storage.
Target: **keep blended per-analysis cost well under the per-analysis revenue** at each
tier. Example sanity check: if Starter is $12 for ~8 analyses, that's $1.50 of revenue
per analysis — the pipeline must run comfortably under that. Drive cost down via frame
downsampling, clip caps, and running heavy detection only on higher tiers.

Watch: **CAC vs. LTV.** With a subscription + annual option and good retention, target
LTV:CAC ≥ 3:1.

## Conversion strategy
1. **Free first analysis** — no card required to feel the value (reduces signup friction).
2. **Paywall *after* the "wow"** — ask for payment when they want a *second* analysis.
3. **Upgrade nudges at quota** — "You're out of analyses this month — go Pro."
4. **Annual discount** to lock in and lower churn.
5. **Re-engagement** emails to dormant users (churn prevention).

## Retention levers (subscriptions live and die here)
- **Progress tracking** — visible improvement = reason to keep paying.
- **Habit loop** — nudge to upload after each play session.
- **Fresh value** — new drills, new shot-type analyses, seasonal challenges (v2).
- **Cancel-flow save offers** (pause plan, downshift to Starter).

## Billing mechanics
- Stripe subscriptions; entitlements driven by Stripe webhooks → `subscriptions` table.
- Stripe customer portal for self-serve upgrade/downgrade/cancel.
- Prorate on plan changes; grace handling on failed payments (dunning).
