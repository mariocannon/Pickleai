# PickleAI — Web App MVP

Screen-by-screen breakdown of the authenticated product. Web, responsive, mobile-first.

## Primary user flow (the golden path)

```
Land → Sign up → (Onboarding: skill level + goals) → Upload clip → Choose analysis type
   → Processing → Coaching report → "Want more?" → Subscribe → Dashboard/history
```

## Screens

### 1. Auth
- Sign up / log in (email + Google). Password reset.
- Post-signup: lightweight onboarding — *skill level (2.5–5.0), primary goal
  (e.g. consistency, third-shot drop, kitchen game)*. Used to tailor feedback tone.

### 2. Dashboard (home)
- "Upload a clip" as the dominant action.
- Recent analyses (cards: thumbnail, date, top issue, score).
- Progress snapshot: recurring focus areas + trend.
- Plan/quota status ("3 of 10 analyses left this month").

### 3. Upload
- Drag-drop / file picker / mobile camera-roll.
- Client-side checks: length cap, size cap, format.
- **Choose analysis type:** Full clip · Serve · Dink/kitchen · Third-shot drop · Volley.
- Optional note: "what do you want feedback on?"
- Consent/privacy reminder. Submit → job created.

### 4. Processing
- Clear status: queued → analyzing → done, with progress and rough ETA.
- Non-blocking: user can leave; email + in-app notification when ready.

### 5. Coaching report (the money screen)
- **Header:** clip thumbnail, analysis type, date, overall summary.
- **Scorecard:** key areas rated (e.g. Technique, Positioning, Shot Selection, Consistency).
- **Top fixes (ranked):** each card = *What's happening · Why it matters · How to fix ·
  Drill.* Annotated frame / pose overlay where available.
- **Drill plan:** consolidated list of recommended drills.
- **Feedback controls:** 👍/👎 per insight + "Was this helpful?"
- **Share / download** (optional): export report.

### 6. History
- All past analyses, filterable by shot type/date.
- Tap into any past report.

### 7. Progress
- Trends over time: are flagged issues recurring or improving?
- "Your focus areas" — the 1–3 things to keep working on.

### 8. Account & billing
- Plan, usage/quota, upgrade/downgrade, cancel.
- Stripe customer portal for payment management.
- Privacy: delete videos, delete account/data.

## Notifications
- "Your analysis is ready" (email + in-app).
- Quota/renewal reminders.
- Re-engagement: "Haven't uploaded in a while — send a clip and keep improving."

## States to design for (don't skip these)
- Empty state (no analyses yet) — strong nudge to upload first clip.
- Processing failed / bad video — friendly retry guidance (angle, lighting, length).
- Quota reached — upgrade prompt.
- Low-confidence analysis — be honest, suggest a better clip.

## Non-functional MVP requirements
- Mobile-first responsive.
- Fast perceived performance (async everywhere; never block on inference).
- Accessible (contrast, keyboard, alt text on annotated frames).
- Private by default; easy data deletion.
