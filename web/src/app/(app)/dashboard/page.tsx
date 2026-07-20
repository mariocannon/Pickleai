import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SHOT_TYPES } from "@/lib/plans";

export const metadata = { title: "Dashboard — PickleAI" };

function shotLabel(id: string) {
  return SHOT_TYPES.find((s) => s.id === id)?.label ?? id;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: videos }] = await Promise.all([
    supabase.from("profiles").select("display_name, skill_level").eq("id", user!.id).single(),
    supabase
      .from("videos")
      .select("id, shot_type, status, created_at, analyses ( id, summary, scores )")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const name = profile?.display_name ?? "player";

  return (
    <main>
      <div
        className="panel"
        style={{
          padding: 26, marginBottom: 20,
          background:
            "linear-gradient(105deg, color-mix(in srgb, var(--court) 15%, var(--surface)), var(--surface))",
        }}
      >
        <p className="eyebrow">Ready when you are</p>
        <h2 className="display" style={{ fontSize: "1.7rem", margin: "8px 0 6px" }}>
          Send us your next clip, {name}.
        </h2>
        <p style={{ color: "var(--muted)", margin: "0 0 18px" }}>
          Drop in 30–90 seconds of play and get your coaching report in minutes.
        </p>
        <Link href="/upload" className="btn btn-primary">
          Upload a clip →
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 14px" }}>
        <h2 style={{ fontSize: "1.1rem", letterSpacing: "-0.02em", margin: 0 }}>Recent analyses</h2>
        <Link href="/reports" className="mono" style={{ fontSize: "0.84rem", color: "var(--teal)" }}>
          View all →
        </Link>
      </div>

      {!videos?.length ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ margin: "0 0 6px", fontWeight: 700 }}>No analyses yet</p>
          <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: "0.93rem" }}>
            Your first one is free — upload a clip and see what a coach would see.
          </p>
          <Link href="/upload" className="btn btn-primary">
            Analyze my first clip
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {videos.map((v) => {
            const analysis = Array.isArray(v.analyses) ? v.analyses[0] : v.analyses;
            const scores = analysis?.scores as Record<string, number> | null;
            const avg = scores
              ? (
                  Object.values(scores).reduce((a, b) => a + b, 0) /
                  Object.values(scores).length /
                  10
                ).toFixed(1)
              : null;
            return (
              <Link
                key={v.id}
                href={`/reports/${v.id}`}
                className="card"
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{shotLabel(v.shot_type)}</span>
                  {avg ? (
                    <span
                      className="mono tnum"
                      style={{
                        fontWeight: 800, fontSize: "0.9rem", background: "var(--optic)",
                        color: "var(--optic-ink)", padding: "2px 9px", borderRadius: 7,
                      }}
                    >
                      {avg}
                    </span>
                  ) : (
                    <span className={`status-pill ${v.status}`}>{v.status}</span>
                  )}
                </div>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.84rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {analysis?.summary ?? "Analysis in progress — check back in a few minutes."}
                </p>
                <p className="mono" style={{ margin: "10px 0 0", fontSize: "0.7rem", color: "var(--muted)", letterSpacing: "0.04em" }}>
                  {new Date(v.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase()}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
