# PickleAI — Launch Checklist

## 1. Netlify env vars (5 min)
Netlify → your site → **Site settings → Environment variables** → add:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://bqfylkqgmzbweczhgjhe.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_Ld5mdyRA7UXLkKSAdFPh4Q_ln9UH4wZ`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = copy from Supabase dashboard → **Settings → API keys** → `service_role` (keep secret)
- [ ] Deploys → **Trigger deploy → Clear cache and deploy site**

## 2. Fix sign-in emails (2 min)
Supabase dashboard → **Authentication → URL Configuration**:

- [ ] Site URL = `https://pickleaimario.netlify.app`
- [ ] Add redirect URL = `https://pickleaimario.netlify.app/auth/callback`

## 3. Test the site (2 min)
- [ ] Open pickleaimario.netlify.app → landing page loads
- [ ] Sign in with your email (magic link arrives + redirects back)
- [ ] Upload a short video → it should sit at "Analyzing…" (worker isn't running yet — expected)

## 4. Add the AI key (2 min — fully serverless, no computer needed)
Analysis now runs automatically inside Supabase (edge function + database webhook).
It just needs the Claude API key:

- [ ] Get an API key: console.anthropic.com → **API keys** → create
- [ ] Supabase dashboard → **Edge Functions → Secrets** (or Project Settings →
      Edge Functions) → add secret: name `ANTHROPIC_API_KEY`, value `sk-ant-...`
- [ ] Upload a clip on the site → coaching report appears in ~30 seconds 🎉

## Later (not needed to demo)
- [ ] Stripe: create Starter $14/mo + Pro $28/mo prices, webhook to `/api/stripe/webhook`, add the 4 `STRIPE_*` env vars (see `docs/build-guide.md`)
- [ ] Google sign-in (optional): add OAuth creds in Supabase → Auth → Providers
- [ ] Real video analysis: pose extraction can't run in an edge function — deploy `worker/` as a small container (Fly.io/Railway/Modal) with the ML deps when ready
- [ ] Merge the branch to `main` and point Netlify at it
