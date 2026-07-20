import Stripe from "stripe";
import type { PlanId } from "@/lib/plans";

export function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export function priceIdForPlan(plan: Exclude<PlanId, "free">): string {
  const id =
    plan === "starter"
      ? process.env.STRIPE_PRICE_STARTER
      : process.env.STRIPE_PRICE_PRO;
  if (!id) throw new Error(`Missing Stripe price env for plan: ${plan}`);
  return id;
}

export function planForPriceId(priceId: string): Exclude<PlanId, "free"> | null {
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return null;
}
