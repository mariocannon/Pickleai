import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, priceIdForPlan } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  const plan = form.get("plan");
  if (plan !== "starter" && plan !== "pro") {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const stripe = getStripe();
  const admin = createAdminClient();
  const origin = new URL(request.url).origin;

  // Reuse the Stripe customer if we have one.
  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  let customerId = sub?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin
      .from("subscriptions")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceIdForPlan(plan), quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    success_url: `${origin}/account?upgraded=1`,
    cancel_url: `${origin}/account`,
  });

  return NextResponse.redirect(session.url!, 303);
}
