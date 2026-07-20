export type PlanId = "free" | "starter" | "pro";

export const PLANS: Record<
  PlanId,
  { name: string; priceLabel: string; quota: number; stripePriceEnv?: string }
> = {
  free: { name: "Free trial", priceLabel: "$0", quota: 1 },
  starter: {
    name: "Starter",
    priceLabel: "$14/mo",
    quota: 10,
    stripePriceEnv: "STRIPE_PRICE_STARTER",
  },
  pro: {
    name: "Pro",
    priceLabel: "$28/mo",
    quota: 30,
    stripePriceEnv: "STRIPE_PRICE_PRO",
  },
};

export const SHOT_TYPES = [
  { id: "third_shot_drop", label: "Third-shot drop" },
  { id: "dink", label: "Dink" },
  { id: "serve", label: "Serve" },
  { id: "volley", label: "Volley" },
  { id: "full_point", label: "Full point" },
] as const;

export const MAX_CLIP_SECONDS = 90;
export const MAX_FILE_MB = 200;
