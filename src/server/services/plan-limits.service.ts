import type { BillingPlan } from "@/server/validators/billing.validator";

export const PLAN_LIMITS = {
  trial: {
    youtubeChannels: 1,
    monthlyUploads: 10,
    monthlyGenerationRequests: 10,
    scheduledUploads: 5,
  },
  creator: {
    youtubeChannels: 2,
    monthlyUploads: 100,
    monthlyGenerationRequests: 100,
    scheduledUploads: 100,
  },
  pro: {
    youtubeChannels: 5,
    monthlyUploads: 500,
    monthlyGenerationRequests: 500,
    scheduledUploads: 500,
  },
  studio: {
    youtubeChannels: 15,
    monthlyUploads: 2000,
    monthlyGenerationRequests: 2000,
    scheduledUploads: 2000,
  },
} as const;

const PLAN_ORDER: BillingPlan[] = ["trial", "creator", "pro", "studio"];

const METRIC_LABELS = {
  youtubeChannels: "youtube channel",
  monthlyUploads: "monthly upload",
  monthlyGenerationRequests: "monthly generation request",
  scheduledUploads: "scheduled upload",
} as const;

export type PlanLimitMetric = keyof (typeof PLAN_LIMITS)["trial"];

export type PlanLimitResult =
  | { allowed: true; currentPlan: BillingPlan }
  | {
      allowed: false;
      reason: string;
      currentPlan: BillingPlan;
      requiredPlan?: BillingPlan;
    };

export function getPlanLimits(plan: string | null | undefined) {
  return PLAN_LIMITS[toBillingPlan(plan)];
}

const GOOD_STANDING_STATUSES = new Set(["trialing", "active"]);

// A paid plan only grants paid limits while Stripe says the subscription is
// in good standing; past_due/unpaid/canceled fall back to trial limits.
export function effectiveBillingPlan(
  plan: string | null | undefined,
  status: string | null | undefined,
): BillingPlan {
  const billingPlan = toBillingPlan(plan);

  if (billingPlan === "trial") {
    return "trial";
  }

  return !status || GOOD_STANDING_STATUSES.has(status) ? billingPlan : "trial";
}

export function checkPlanLimit(input: {
  currentPlan: string | null | undefined;
  metric: PlanLimitMetric;
  currentUsage: number;
  requestedUsage?: number;
}): PlanLimitResult {
  const currentPlan = toBillingPlan(input.currentPlan);
  const limit = PLAN_LIMITS[currentPlan][input.metric];
  const projectedUsage = input.currentUsage + (input.requestedUsage ?? 1);

  if (projectedUsage <= limit) {
    return { allowed: true, currentPlan };
  }

  return {
    allowed: false,
    reason: `${currentPlan} allows ${limit} ${pluralize(
      METRIC_LABELS[input.metric],
      limit,
    )}.`,
    currentPlan,
    requiredPlan: findRequiredPlan(input.metric, projectedUsage),
  };
}

export function assertPlanLimit(input: {
  currentPlan: string | null | undefined;
  metric: PlanLimitMetric;
  currentUsage: number;
}) {
  const result = checkPlanLimit(input);

  if (!result.allowed) {
    throw new Error(result.reason);
  }

  return result;
}

function toBillingPlan(plan: string | null | undefined): BillingPlan {
  return PLAN_ORDER.includes(plan as BillingPlan)
    ? (plan as BillingPlan)
    : "trial";
}

function findRequiredPlan(
  metric: PlanLimitMetric,
  requestedUsage: number,
): BillingPlan | undefined {
  return PLAN_ORDER.find((plan) => PLAN_LIMITS[plan][metric] >= requestedUsage);
}

function pluralize(label: string, count: number) {
  return count === 1 ? label : `${label}s`;
}
