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

## 4. Run the worker (5 min, on your computer)
- [ ] Get an Anthropic API key: console.anthropic.com → API keys
- [ ] In the repo:
  ```bash
  cd worker
  pip install -r requirements.txt
  export SUPABASE_URL=https://bqfylkqgmzbweczhgjhe.supabase.co
  export SUPABASE_SERVICE_ROLE_KEY=...   # same key as step 1
  export ANTHROPIC_API_KEY=sk-ant-...
  PICKLEAI_MOCK_EXTRACTOR=1 python worker.py
  ```
- [ ] Refresh your queued upload → real coaching report appears 🎉

## Later (not needed to demo)
- [ ] Stripe: create Starter $14/mo + Pro $28/mo prices, webhook to `/api/stripe/webhook`, add the 4 `STRIPE_*` env vars (see `docs/build-guide.md`)
- [ ] Google sign-in (optional): add OAuth creds in Supabase → Auth → Providers
- [ ] Real video analysis: install ML deps in `worker/requirements.txt` and drop `PICKLEAI_MOCK_EXTRACTOR`
- [ ] Merge the branch to `main` and point Netlify at it
