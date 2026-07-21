import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SHOT_TYPES } from "@/lib/plans";

export const metadata = { title: "My reports — PickleAI" };

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: videos } = await supabase
    .from("videos")
    .select("id, shot_type, status, created_at, analyses ( summary, scores )")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <main>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: "1.15rem", letterSpacing: "-0.02em", margin: 0 }}>All analyses</h2>
        <Link href="/upload" className="btn btn-primary btn-sm">New analysis</Link>
      </div>

      {!videos?.length ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ margin: "0 0 16px", color: "var(--muted)" }}>
            Nothing here yet — your first analysis is free.
          </p>
          <Link href="/upload" className="btn btn-primary">Upload a clip</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {videos.map((v) => {
            const analysis = Array.isArray(v.analyses) ? v.analyses[0] : v.analyses;
            return (
              <Link
                key={v.id}
                href={`/reports/${v.id}`}
                className="card report-row"
              >
                <div className="report-row-main">
                  <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                    {SHOT_TYPES.find((s) => s.id === v.shot_type)?.label ?? v.shot_type}
                  </div>
                  <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "0.84rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {analysis?.summary ?? "Waiting for analysis…"}
                  </p>
                </div>
                <span className="mono" style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                  {new Date(v.created_at).toLocaleDateString()}
                </span>
                <span className={`status-pill ${v.status}`}>{v.status}</span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
