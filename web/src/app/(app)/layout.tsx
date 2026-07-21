import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SideNav } from "@/components/SideNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, monthly_quota, used_this_period")
    .eq("user_id", user.id)
    .single();

  const remaining = sub ? Math.max(0, sub.monthly_quota - sub.used_this_period) : 0;

  return (
    <div className="shell">
      <aside className="side">
        <Link href="/dashboard" className="brand">
          <span className="brand-dot" />
          PickleAI
        </Link>
        <SideNav />
        <div className="side-actions">
          <SignOutButton />
        </div>
      </aside>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div className="topbar">
          <span style={{ flex: 1 }} />
          <span className="quota-pill">
            <b>{remaining}</b> of {sub?.monthly_quota ?? 1} analyses left
          </span>
          <ThemeToggle />
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
