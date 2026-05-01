import { env, requireEnv } from "@/lib/env";
import type { BillingPlan } from "@/server/validators/billing.validator";
import { PLAN_LIMITS } from "@/server/services/plan-limits.service";

export type PaidBillingPlan = Exclude<BillingPlan, "trial">;

export type BillingPlanConfig = {
  displayName: string;
  features: string[];
  limits: (typeof PLAN_LIMITS)[BillingPlan];
  monthlyPriceUsd: number;
  plan: BillingPlan;
  stripePriceId: string | null;
};

export const PAID_BILLING_PLANS = ["creator", "pro", "studio"] as const;

export const BILLING_PLAN_CONFIG = {
  trial: {
    displayName: "Trial",
    features: ["1 YouTube channel", "10 monthly uploads", "10 generations"],
    limits: PLAN_LIMITS.trial,
    monthlyPriceUsd: 0,
    plan: "trial",
    stripePriceId: null,
  },
  creator: {
    displayName: "Creator",
    features: ["2 YouTube channels", "100 monthly uploads", "100 generations"],
    limits: PLAN_LIMITS.creator,
    monthlyPriceUsd: 19,
    plan: "creator",
    stripePriceId: env.STRIPE_CREATOR_PRICE_ID ?? null,
  },
  pro: {
    displayName: "Pro",
    features: ["5 YouTube channels", "500 monthly uploads", "500 generations"],
    limits: PLAN_LIMITS.pro,
    monthlyPriceUsd: 49,
    plan: "pro",
    stripePriceId: env.STRIPE_PRO_PRICE_ID ?? null,
  },
  studio: {
    displayName: "Studio",
    features: [
      "15 YouTube channels",
      "2,000 monthly uploads",
      "2,000 generations",
    ],
    limits: PLAN_LIMITS.studio,
    monthlyPriceUsd: 99,
    plan: "studio",
    stripePriceId: env.STRIPE_STUDIO_PRICE_ID ?? null,
  },
} satisfies Record<BillingPlan, BillingPlanConfig>;

export function isPaidBillingPlan(plan: BillingPlan): plan is PaidBillingPlan {
  return plan !== "trial";
}

export function getStripePriceIdForPlan(plan: PaidBillingPlan): string {
  return requireEnv(
    BILLING_PLAN_CONFIG[plan].stripePriceId,
    priceEnvNameForPlan(plan),
  ) as string;
}

export function getPlanForStripePriceId(
  stripePriceId: string | null | undefined,
): PaidBillingPlan | null {
  if (!stripePriceId) {
    return null;
  }

  return (
    PAID_BILLING_PLANS.find(
      (plan) => BILLING_PLAN_CONFIG[plan].stripePriceId === stripePriceId,
    ) ?? null
  );
}

function priceEnvNameForPlan(plan: PaidBillingPlan) {
  return `STRIPE_${plan.toUpperCase()}_PRICE_ID`;
}
