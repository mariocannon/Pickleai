import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, planForPriceId } from "@/lib/stripe";
import { PLANS } from "@/lib/plans";

/** Stripe is the source of truth for entitlements; this webhook mirrors it into Postgres. */
export async function POST(request: Request) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminClient();

  async function syncSubscription(sub: Stripe.Subscription) {
    const userId = sub.metadata?.user_id;
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const priceId = sub.items.data[0]?.price?.id ?? "";
    const plan = planForPriceId(priceId);
    const active = sub.status === "active" || sub.status === "trialing";

    const patch: Record<string, unknown> = {
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      status: sub.status,
      updated_at: new Date().toISOString(),
    };
    if (active && plan) {
      patch.plan = plan;
      patch.monthly_quota = PLANS[plan].quota;
    }
    if (sub.status === "canceled") {
      patch.plan = "free";
      patch.stripe_subscription_id = null;
    }
    const item = sub.items.data[0];
    if (item?.current_period_end) {
      patch.current_period_end = new Date(item.current_period_end * 1000).toISOString();
    }

    const query = admin.from("subscriptions").update(patch);
    if (userId) await query.eq("user_id", userId);
    else await query.eq("stripe_customer_id", customerId);
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;

    case "invoice.paid": {
      // Fresh billing period → reset the usage meter.
      const invoice = event.data.object;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        await admin
          .from("subscriptions")
          .update({ used_this_period: 0, updated_at: new Date().toISOString() })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
