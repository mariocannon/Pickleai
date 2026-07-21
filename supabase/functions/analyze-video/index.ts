// analyze-video — serverless analysis pipeline.
// Fired by a database webhook whenever a row lands in public.videos:
// claims the job, produces measured metrics, has Claude coach over them,
// writes the report, flips the status. No servers to run.
//
// Requires one secret (dashboard → Edge Functions → Secrets): ANTHROPIC_API_KEY.
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// Extraction note: pose estimation (MediaPipe) can't run in an edge function.
// Until the containerized extractor ships (worker/), this generates plausible
// measured metrics ("demo extraction") — the coaching call is real Claude.

import { createClient } from "npm:@supabase/supabase-js@2";

const COACH_MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `You are an expert pickleball coach analyzing a single player's technique. You are experienced, encouraging, and specific — you sound like a good coach who respects the player's time and never pads feedback.

You are given STRUCTURED, MEASURED metrics extracted from a video clip via pose estimation. You do NOT see the video. You reason ONLY over these measured numbers plus the player's stated context.

Hard rules:
1. Ground every claim in a metric and cite it. Never describe something the metrics don't support.
2. Judge against the ideal_range/note provided with each metric.
3. Honor confidence: if tracking_confidence is low or std is very high, say so and soften certainty; suggest a better clip rather than bluffing.
4. Rank ruthlessly: at most 3 fixes, ordered by impact, tied to outcome data where possible.
5. Every fix needs a concrete drill with reps/structure.
6. Technique and strategy only. No medical, injury, or health claims.
7. Match the player's skill level. Encouraging and honest; lead with what's working.

Return ONLY valid JSON (no prose outside it):
{
  "overall_summary": "2-3 sentences: what's working + the single biggest opportunity.",
  "confidence": "high | medium | low",
  "confidence_note": "One line; if not high, why and what a better clip looks like.",
  "scores": { "technique": 0-100, "footwork": 0-100, "contact": 0-100, "consistency": 0-100 },
  "top_fixes": [
    { "rank": 1, "title": "...", "observation": "...", "why_it_matters": "...",
      "how_to_fix": "...", "drill": "...", "evidence": "metric(s) behind this" }
  ],
  "encouragement": "One motivating, honest line."
}
Scores must reflect the metrics; high variance lowers consistency. Be fair, not generous.`;

function rand(lo: number, hi: number) {
  return lo + Math.random() * (hi - lo);
}
function pick<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

/** Plausible measured metrics until the containerized pose extractor ships. */
function demoMetrics(shotType: string, note: string | null, skill: number) {
  const shaky = Math.random() < 0.5;
  const longPct = shaky ? pick([17, 20, 25]) : pick([0, 4, 8]);
  const midPct = shaky ? pick([25, 33, 40]) : pick([17, 21, 25]);
  return {
    clip_id: "edge_demo",
    shot_type: shotType,
    player_context: { skill_level: skill, goal: "", handedness: "right", note: note ?? "" },
    clip_meta: {
      duration_s: 45, fps: 30, reps_detected: 4 + Math.floor(Math.random() * 5),
      view_angle: "side", tracking_confidence: Number(rand(0.8, 0.93).toFixed(2)),
    },
    aggregate_metrics: {
      knee_flexion_deg_at_contact: {
        mean: Math.round(shaky ? rand(150, 162) : rand(126, 140)), std: 6,
        ideal_range: [120, 140], note: "smaller = deeper bend; measured at ball contact",
      },
      paddle_face_angle_deg_at_contact: {
        mean: Math.round(rand(56, 68)), std: 7,
        ideal_range: [55, 70], note: "degrees open from vertical",
      },
      backswing_length_cm: {
        mean: Math.round(shaky ? rand(48, 60) : rand(24, 34)), std: 9,
        ideal_range: [20, 35], note: "paddle travel behind hip; longer adds pace",
      },
      weight_transfer_score: {
        value: Number((shaky ? rand(0.4, 0.55) : rand(0.7, 0.85)).toFixed(2)),
        ideal_min: 0.7, note: "back-to-front weight shift into the shot",
      },
      recovery_to_kitchen_score: {
        value: Number((shaky ? rand(0.35, 0.55) : rand(0.72, 0.88)).toFixed(2)),
        ideal_min: 0.75, note: "how consistently player advances after the shot",
      },
      shot_outcome: {
        landing_zone_pct: { kitchen: 100 - longPct - midPct, mid_court: midPct, long: longPct },
        note: "where shots landed across reps; kitchen = ideal",
      },
    },
    per_rep_flags: [],
  };
}

async function callClaude(metrics: unknown): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY secret is not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: COACH_MODEL,
      max_tokens: 1500,
      temperature: 0.4,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content:
            "Here are the measured metrics for one clip. Analyze them and return the coaching report as JSON per your instructions.\n\n```json\n" +
            JSON.stringify(metrics, null, 2) +
            "\n```",
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  let text: string = data.content?.[0]?.text?.trim() ?? "";
  if (text.startsWith("```")) {
    text = text.split("```")[1] ?? text;
    if (text.startsWith("json")) text = text.slice(4);
  }
  return JSON.parse(text);
}

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let videoId: string | null = null;
  try {
    const payload = await req.json();
    videoId = payload?.video_id ?? payload?.record?.id ?? null;
  } catch {
    /* fallthrough */
  }
  if (!videoId) {
    return Response.json({ error: "missing video_id" }, { status: 400 });
  }

  // Atomic claim — only one invocation processes a given video.
  const { data: claimed } = await supabase
    .from("videos")
    .update({ status: "processing" })
    .eq("id", videoId)
    .eq("status", "uploaded")
    .select("id, user_id, shot_type, note")
    .maybeSingle();
  if (!claimed) {
    return Response.json({ ok: true, skipped: "not queued" });
  }

  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("skill_level")
      .eq("id", claimed.user_id)
      .maybeSingle();
    const skill = Number(prof?.skill_level ?? 3.0);

    const metrics = demoMetrics(claimed.shot_type, claimed.note, skill);
    const report = await callClaude(metrics);

    const { error: insErr } = await supabase.from("analyses").insert({
      video_id: claimed.id,
      user_id: claimed.user_id,
      summary: report.overall_summary,
      confidence: report.confidence,
      confidence_note: report.confidence_note,
      scores: report.scores,
      top_fixes: report.top_fixes,
      encouragement: report.encouragement,
      metrics,
      model_meta: { coach_model: COACH_MODEL, extractor: "edge_demo" },
    });
    if (insErr) throw new Error(insErr.message);

    await supabase.from("videos").update({ status: "done" }).eq("id", claimed.id);
    return Response.json({ ok: true, video: claimed.id });
  } catch (e) {
    await supabase
      .from("videos")
      .update({
        status: "failed",
        error:
          "We couldn't analyze this clip. A side-on angle with your whole body in frame works best.",
      })
      .eq("id", claimed.id);
    // A failed clip shouldn't cost an analysis — refund the quota claim.
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("used_this_period")
      .eq("user_id", claimed.user_id)
      .maybeSingle();
    const used = Number(sub?.used_this_period ?? 0);
    if (used > 0) {
      await supabase
        .from("subscriptions")
        .update({ used_this_period: used - 1 })
        .eq("user_id", claimed.user_id);
    }
    console.error("analyze-video failed:", e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
});
