"use client";

import { useState } from "react";

export function FeedbackButtons({ analysisId }: { analysisId: string }) {
  const [sent, setSent] = useState<"up" | "down" | null>(null);

  async function send(rating: "up" | "down") {
    setSent(rating);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis_id: analysisId, rating }),
    }).catch(() => {});
  }

  if (sent) {
    return (
      <span className="mono" style={{ fontSize: "0.8rem", color: "var(--teal)" }}>
        Thanks — noted.
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "var(--muted)", fontSize: "0.86rem" }}>
      Was this helpful?
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => send("up")} aria-label="Helpful">
        👍
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => send("down")} aria-label="Not helpful">
        👎
      </button>
    </span>
  );
}
