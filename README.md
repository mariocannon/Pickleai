# PickleAI 🥒🎾

**AI-powered pickleball coaching. Upload a clip, get pro-level feedback in minutes.**

PickleAI is a subscription web app: players upload video of themselves playing and
receive automated, personalized critique — technique breakdowns grounded in measured
biomechanics, ranked fixes, drills, and progress over time.

## Repo map

| Path | What it is |
|------|------------|
| **`web/`** | **The product** — Next.js app: landing page, auth, upload, reports, Stripe billing |
| **`supabase/migrations/`** | Database schema, RLS, quota function, storage policies |
| **`worker/`** | Python analysis worker: video → measured metrics → Claude coaching → report |
| `spike/` | The proven AI pipeline (coaching rubric, extractor, eval harness) the worker reuses |
| `docs/` | Product plan, MVP scope, monetization, roadmap, **[setup guide](docs/build-guide.md)** |
| `mockups/` | Original static design mockups (superseded by `web/`, kept for reference) |

## Quick start

```bash
# 1. Database — run supabase/migrations/0001_init.sql in your Supabase project
# 2. Web app
cd web && cp .env.example .env.local   # fill in keys
npm install && npm run dev
# 3. Worker (demo mode: real coaching, mocked extraction)
cd worker && pip install -r requirements.txt
PICKLEAI_MOCK_EXTRACTOR=1 python worker.py
```

Full runbook (Stripe, Google auth, Netlify deploy): **[docs/build-guide.md](docs/build-guide.md)**

## How it works

```
Browser ──▶ Next.js (Netlify) ──▶ Supabase (Auth · Postgres+RLS · private Storage)
                                        ▲
            Python worker ──────────────┘   polls queue → pose metrics → Claude
                                            coaching (evidence-cited) → report
```

The design principle proven in `spike/`: **the LLM never sees pixels.** It reasons over
measured biomechanical metrics and cites the numbers behind every fix — that's what
keeps the coaching trustworthy.
