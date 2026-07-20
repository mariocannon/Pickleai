import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SHOT_TYPES } from "@/lib/plans";

/**
 * Registers an uploaded clip and queues it for analysis.
 * Server-side so the monthly quota is actually enforced (videos INSERT is
 * denied to end users by RLS; quota is claimed atomically in SQL).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const storagePath: unknown = body?.storage_path;
  const shotType: unknown = body?.shot_type;
  const note: unknown = body?.note;

  if (
    typeof storagePath !== "string" ||
    !storagePath.startsWith(`${user.id}/`) ||
    storagePath.includes("..")
  ) {
    return NextResponse.json({ error: "Invalid storage path." }, { status: 400 });
  }
  if (typeof shotType !== "string" || !SHOT_TYPES.some((s) => s.id === shotType)) {
    return NextResponse.json({ error: "Unknown shot type." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: claimed, error: claimErr } = await admin.rpc("claim_analysis", {
    uid: user.id,
  });
  if (claimErr) {
    return NextResponse.json({ error: "Could not check your plan." }, { status: 500 });
  }
  if (!claimed) {
    return NextResponse.json(
      { error: "You're out of analyses this period — upgrade your plan for more." },
      { status: 402 }
    );
  }

  const { data: video, error: vidErr } = await admin
    .from("videos")
    .insert({
      user_id: user.id,
      storage_path: storagePath,
      shot_type: shotType,
      note: typeof note === "string" ? note.slice(0, 1000) : null,
      status: "uploaded",
    })
    .select("id")
    .single();

  if (vidErr || !video) {
    return NextResponse.json(
      { error: "Could not create the analysis job." },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: video.id });
}
