import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "@/lib/plans";

export const metadata = { title: "Account — PickleAI" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const { upgraded } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: sub }] = await Promise.all([
    supabase.from("profiles").select("display_name, skill_level").eq("id", user!.id).single(),
    supabase
      .from("subscriptions")
      .select("plan, status, monthly_quota, used_this_period, current_period_end, stripe_customer_id")
      .eq("user_id", user!.id)
      .single(),
  ]);

  const plan = (sub?.plan ?? "free") as PlanId;

  return (
    <main style={{ maxWidth: 720 }}>
      {upgraded && (
        <div className="card" style={{ marginBottom: 18, borderColor: "var(--teal)" }}>
          <b>You&apos;re upgraded.</b>{" "}
          <span style={{ color: "var(--muted)" }}>
            Your new quota is live — go upload a clip.
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <div className="card">
          <p className="eyebrow">Plan</p>
          <div style={{ fontWeight: 800, fontSize: "1.4rem", letterSpacing: "-0.02em", margin: "6px 0" }}>
            {PLANS[plan].name}
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.86rem", margin: 0 }}>
            {sub?.used_this_period ?? 0} of {sub?.monthly_quota ?? 1} analyses used
            {sub?.current_period_end &&
              ` · renews ${new Date(sub.current_period_end).toLocaleDateString()}`}
          </p>
        </div>
        <div className="card">
          <p className="eyebrow">Profile</p>
          <div style={{ fontWeight: 700, margin: "6px 0" }}>
            {profile?.display_name ?? "Player"}
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.86rem", margin: 0 }}>
            Skill {profile?.skill_level ?? "3.0"} · {user?.email}
          </p>
        </div>
      </div>

      <h3 style={{ margin: "28px 0 12px", fontSize: "1.05rem", letterSpacing: "-0.01em" }}>
        {plan === "free" ? "Upgrade" : "Change plan"}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {(["starter", "pro"] as const).map((p) => (
          <div className="card" key={p} style={plan === p ? { borderColor: "var(--optic)" } : undefined}>
            <p className="eyebrow">{PLANS[p].name}</p>
            <div style={{ fontWeight: 800, fontSize: "1.6rem", margin: "6px 0 2px" }}>
              {PLANS[p].priceLabel}
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.86rem", margin: "0 0 14px" }}>
              {PLANS[p].quota} analyses / month
            </p>
            {plan === p ? (
              <span className="status-pill done">current plan</span>
            ) : (
              <form action="/api/stripe/checkout" method="post">
                <input type="hidden" name="plan" value={p} />
                <button className="btn btn-primary btn-sm" type="submit">
                  Choose {PLANS[p].name}
                </button>
              </form>
            )}
          </div>
        ))}
      </div>

      {sub?.stripe_customer_id && (
        <form action="/api/stripe/portal" method="post" style={{ marginTop: 18 }}>
          <button className="btn btn-ghost btn-sm" type="submit">
            Manage billing (invoices, card, cancel)
          </button>
        </form>
      )}

      <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 26 }}>
        Videos are private to you. Deleting a video removes its report; deleting your
        account removes everything. Contact support to delete your account.
      </p>
    </main>
  );
}
