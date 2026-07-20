import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const analysisId: unknown = body?.analysis_id;
  const rating: unknown = body?.rating;
  if (typeof analysisId !== "string" || (rating !== "up" && rating !== "down")) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  // RLS guarantees users can only attach feedback to themselves.
  const { error } = await supabase.from("feedback").insert({
    analysis_id: analysisId,
    user_id: user.id,
    rating,
  });
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
