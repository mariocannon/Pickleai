"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MAX_FILE_MB, SHOT_TYPES } from "@/lib/plans";

export default function UploadPage() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [shot, setShot] = useState<string>("third_shot_drop");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle");
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState("");

  function pick(f: File | undefined | null) {
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setError("That doesn't look like a video file — MP4 or MOV works best.");
      return;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`That file is over ${MAX_FILE_MB} MB. Trim the clip to 30–90 seconds and try again.`);
      return;
    }
    setError("");
    setFile(f);
  }

  async function analyze() {
    if (!file) return;
    setState("uploading");
    setProgressMsg("Uploading your clip…");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired — sign in again.");

      const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("videos").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

      setProgressMsg("Queuing your analysis…");
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storage_path: path, shot_type: shot, note }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not queue the analysis.");

      router.push(`/reports/${body.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
      setState("error");
    }
  }

  return (
    <main style={{ maxWidth: 680 }}>
      <p className="eyebrow" style={{ marginBottom: 8 }}>New analysis</p>

      <div
        role="button"
        tabIndex={0}
        aria-label="Choose a video clip"
        onClick={() => fileInput.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInput.current?.click();
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files?.[0]);
        }}
        style={{
          border: "2px dashed var(--line-strong)", borderRadius: 16,
          background: "var(--surface)", padding: "42px 24px",
          textAlign: "center", cursor: "pointer",
        }}
      >
        <h3 style={{ margin: "0 0 4px", fontSize: "1.08rem" }}>
          {file ? `${file.name} ✓` : "Drag a clip here, or click to browse"}
        </h3>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>
          {file
            ? `${(file.size / 1024 / 1024).toFixed(1)} MB · ready to analyze`
            : `MP4 or MOV · 30–90 seconds · up to ${MAX_FILE_MB} MB`}
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>

      <div style={{ marginTop: 24 }}>
        <label style={{ display: "block", fontWeight: 650, fontSize: "0.92rem", marginBottom: 10 }}>
          What should we analyze?
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
          {SHOT_TYPES.map((s) => (
            <button
              key={s.id}
              type="button"
              className="chip"
              aria-pressed={shot === s.id}
              onClick={() => setShot(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <label
          htmlFor="note"
          style={{ display: "block", fontWeight: 650, fontSize: "0.92rem", marginBottom: 10 }}
        >
          Anything specific? <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "0.82rem" }}>— optional</span>
        </label>
        <textarea
          id="note"
          className="input"
          rows={3}
          placeholder="e.g. My drops keep sailing long and I can't figure out why."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <p className="mono" style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: 18 }}>
        Your clip is private by default. Only you see it, and you can delete it anytime.
      </p>

      {error && (
        <p role="alert" style={{ color: "var(--danger)", fontSize: "0.9rem" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 18, alignItems: "center" }}>
        <button
          className="btn btn-primary"
          disabled={!file || state === "uploading"}
          onClick={analyze}
        >
          {state === "uploading" ? progressMsg : "Analyze my clip →"}
        </button>
      </div>
    </main>
  );
}
