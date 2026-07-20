import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SHOT_TYPES } from "@/lib/plans";
import { ReportPoller } from "@/components/ReportPoller";
import { FeedbackButtons } from "@/components/FeedbackButtons";

export const metadata = { title: "Coaching report — PickleAI" };

type Fix = {
  rank: number;
  title: string;
  observation: string;
  why_it_matters: string;
  how_to_fix: string;
  drill: string;
  evidence?: string;
};

const SCORE_LABELS: Record<string, string> = {
  technique: "Technique",
  footwork: "Footwork",
  contact: "Contact point",
  consistency: "Consistency",
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: video } = await supabase
    .from("videos")
    .select("id, shot_type, note, status, error, created_at")
    .eq("id", id)
    .single();
  if (!video) notFound();

  const shotLabel =
    SHOT_TYPES.find((s) => s.id === video.shot_type)?.label ?? video.shot_type;

  if (video.status === "failed") {
    return (
      <main style={{ maxWidth: 640 }}>
        <div className="card">
          <p className="eyebrow" style={{ marginBottom: 10 }}>{shotLabel}</p>
          <h2 style={{ margin: "0 0 8px" }}>We couldn&apos;t analyze this clip</h2>
          <p style={{ color: "var(--muted)" }}>
            {video.error ??
              "The clip was too hard to read. A side-on angle with your whole body in frame works best."}
          </p>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            This didn&apos;t use up one of your analyses.
          </p>
          <Link href="/upload" className="btn btn-primary" style={{ marginTop: 8 }}>
            Try another clip
          </Link>
        </div>
      </main>
    );
  }

  if (video.status !== "done") {
    return (
      <main style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
        <ReportPoller />
        <div className="panel" style={{ padding: "40px 32px" }}>
          <div
            aria-hidden
            style={{
              width: 50, height: 50, borderRadius: "50%",
              background: "var(--optic)", boxShadow: "var(--glow)",
              margin: "0 auto 20px", animation: "bob 1.1s ease-in-out infinite",
            }}
          />
          <style>{`@keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-11px)} }`}</style>
          <h2 style={{ margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            Analyzing your clip…
          </h2>
          <p className="mono" style={{ color: "var(--muted)", fontSize: "0.84rem", margin: 0 }}>
            {video.status === "uploaded"
              ? "Queued — a coach-bot will pick this up momentarily"
              : "Reading body mechanics, timing, and positioning"}
          </p>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 18 }}>
            This usually takes a few minutes. You can leave — the report will be in{" "}
            <Link href="/reports" style={{ color: "var(--teal)" }}>My reports</Link>.
          </p>
        </div>
      </main>
    );
  }

  const { data: analysis } = await supabase
    .from("analyses")
    .select("id, summary, confidence, confidence_note, scores, top_fixes, encouragement")
    .eq("video_id", video.id)
    .single();
  if (!analysis) notFound();

  const scores = (analysis.scores ?? {}) as Record<string, number>;
  const fixes = (analysis.top_fixes ?? []) as Fix[];
  const values = Object.values(scores);
  const overall = values.length
    ? (values.reduce((a, b) => a + b, 0) / values.length / 10).toFixed(1)
    : null;

  return (
    <main style={{ maxWidth: 780 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <h2 style={{ fontSize: "1.35rem", letterSpacing: "-0.02em", margin: 0 }}>{shotLabel}</h2>
        {overall && (
          <span className="mono tnum" style={{ fontWeight: 800, color: "var(--teal)", fontSize: "1.05rem" }}>
            {overall} / 10
          </span>
        )}
      </div>
      <p style={{ color: "var(--ink-2)", margin: "0 0 6px" }}>{analysis.summary}</p>
      {analysis.confidence && analysis.confidence !== "high" && (
        <p className="mono" style={{ color: "var(--amber)", fontSize: "0.78rem", margin: "0 0 6px" }}>
          CONFIDENCE: {String(analysis.confidence).toUpperCase()} — {analysis.confidence_note}
        </p>
      )}

      <div style={{ display: "grid", gap: 11, margin: "20px 0 26px" }}>
        {Object.entries(SCORE_LABELS).map(([key, label]) =>
          scores[key] === undefined ? null : (
            <div className="sb" key={key}>
              <span className="lab">{label}</span>
              <span className="track">
                <span className="fill" style={{ width: `${scores[key]}%` }} />
              </span>
              <span className="v">{scores[key]}</span>
            </div>
          )
        )}
      </div>

      <p className="eyebrow" style={{ marginBottom: 10 }}>Top fixes · ranked by impact</p>
      <div className="fixes">
        {fixes.map((f) => (
          <div className="fix" key={f.rank}>
            <span className="rank">{f.rank}</span>
            <div>
              <h4>{f.title}</h4>
              <p>{f.observation} {f.why_it_matters}</p>
              <p style={{ color: "var(--ink-2)" }}>{f.how_to_fix}</p>
              {f.evidence && <div className="evidence">measured: {f.evidence}</div>}
              <div className="drill">{f.drill}</div>
            </div>
          </div>
        ))}
      </div>

      {analysis.encouragement && (
        <p style={{ color: "var(--ink-2)", fontStyle: "italic", marginTop: 18 }}>
          {analysis.encouragement}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 20, flexWrap: "wrap" }}>
        <FeedbackButtons analysisId={analysis.id} />
        <span style={{ flex: 1 }} />
        <Link href="/upload" className="btn btn-primary btn-sm">Analyze another clip</Link>
      </div>
    </main>
  );
}
