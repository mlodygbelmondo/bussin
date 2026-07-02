import {
  checkPlanLimit,
  type PlanLimitResult,
} from "@/server/services/plan-limits.service";

export type UploadLimitsRepository = {
  getEffectivePlan(workspaceId: string): Promise<string | null>;
  getMonthlyPendingUploadCount(workspaceId: string): Promise<number>;
  getMonthlyUploadedCount(workspaceId: string): Promise<number>;
  countScheduledUploads(workspaceId: string): Promise<number>;
};

export type UploadLimitMode = "publish_now" | "schedule";

export async function checkUploadPlanLimit(input: {
  mode: UploadLimitMode;
  repository: UploadLimitsRepository;
  workspaceId: string;
}): Promise<PlanLimitResult> {
  const currentPlan = await input.repository.getEffectivePlan(
    input.workspaceId,
  );

  if (input.mode === "schedule") {
    const scheduled = await input.repository.countScheduledUploads(
      input.workspaceId,
    );

    return checkPlanLimit({
      currentPlan,
      currentUsage: scheduled,
      metric: "scheduledUploads",
    });
  }

  const [uploaded, pending] = await Promise.all([
    input.repository.getMonthlyUploadedCount(input.workspaceId),
    input.repository.getMonthlyPendingUploadCount(input.workspaceId),
  ]);

  return checkPlanLimit({
    currentPlan,
    currentUsage: uploaded + pending,
    metric: "monthlyUploads",
  });
}

export function uploadLimitMessage(result: PlanLimitResult) {
  if (result.allowed) {
    return null;
  }

  return result.requiredPlan && result.requiredPlan !== result.currentPlan
    ? `${result.reason} Upgrade to ${result.requiredPlan} to publish more.`
    : result.reason;
}
