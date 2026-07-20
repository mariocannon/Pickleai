"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const redirectTo = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) {
      setError(error.message);
      setState("error");
    } else {
      setState("sent");
    }
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="panel" style={{ width: "min(420px, 100%)", padding: 32 }}>
        <Link href="/" className="brand" style={{ marginBottom: 22 }}>
          <span className="brand-dot" />
          PickleAI
        </Link>
        <h1 style={{ fontSize: "1.5rem", letterSpacing: "-0.02em", margin: "16px 0 6px" }}>
          Sign in
        </h1>
        <p style={{ color: "var(--muted)", margin: "0 0 22px", fontSize: "0.95rem" }}>
          New here? Signing in creates your account — your first analysis is free.
        </p>

        {!process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? (
          <div className="card" style={{ background: "var(--surface-2)" }}>
            <b>Almost there — backend not connected yet.</b>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "0.92rem" }}>
              This deploy is missing its Supabase environment variables. Add the
              values from <span className="mono">web/.env.example</span> in your
              hosting settings and redeploy.
            </p>
          </div>
        ) : state === "sent" ? (
          <div className="card" style={{ background: "var(--surface-2)" }}>
            <b>Check your email.</b>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "0.92rem" }}>
              We sent a sign-in link to <span className="mono">{email}</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={sendMagicLink} style={{ display: "grid", gap: 12 }}>
            <input
              className="input"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email address"
            />
            <button className="btn btn-primary" type="submit" disabled={state === "sending"}>
              {state === "sending" ? "Sending link…" : "Email me a sign-in link"}
            </button>
            {state === "error" && (
              <p role="alert" style={{ color: "var(--danger)", fontSize: "0.88rem", margin: 0 }}>
                {error}
              </p>
            )}
            <div
              aria-hidden
              style={{
                display: "flex", alignItems: "center", gap: 10,
                color: "var(--muted)", fontSize: "0.8rem", margin: "4px 0",
              }}
            >
              <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
              or
              <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
            </div>
            <button className="btn btn-ghost" type="button" onClick={signInWithGoogle}>
              Continue with Google
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
