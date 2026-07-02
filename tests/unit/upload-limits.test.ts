// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { effectiveBillingPlan } from "@/server/services/plan-limits.service";
import {
  checkUploadPlanLimit,
  uploadLimitMessage,
} from "@/server/services/upload-limits.service";

const workspaceId = "11111111-1111-4111-8111-111111111111";

describe("effectiveBillingPlan", () => {
  it("keeps paid plans in good standing", () => {
    expect(effectiveBillingPlan("pro", "active")).toBe("pro");
    expect(effectiveBillingPlan("creator", "trialing")).toBe("creator");
  });

  it("falls back to trial limits when payment lapses", () => {
    expect(effectiveBillingPlan("pro", "past_due")).toBe("trial");
    expect(effectiveBillingPlan("studio", "unpaid")).toBe("trial");
    expect(effectiveBillingPlan("creator", "canceled")).toBe("trial");
  });

  it("treats unknown plans as trial", () => {
    expect(effectiveBillingPlan(null, null)).toBe("trial");
    expect(effectiveBillingPlan("unknown-plan", "active")).toBe("trial");
  });
});

describe("checkUploadPlanLimit", () => {
  it("blocks publishing past the monthly upload limit", async () => {
    const result = await checkUploadPlanLimit({
      mode: "publish_now",
      repository: makeRepository({
        monthlyPendingUploads: 0,
        monthlyUploaded: 10,
        plan: "trial",
      }),
      workspaceId,
    });

    expect(result.allowed).toBe(false);
    expect(uploadLimitMessage(result)).toMatch(/trial allows 10/);
  });

  it("allows publishing under the monthly upload limit", async () => {
    const result = await checkUploadPlanLimit({
      mode: "publish_now",
      repository: makeRepository({
        monthlyPendingUploads: 0,
        monthlyUploaded: 4,
        plan: "trial",
      }),
      workspaceId,
    });

    expect(result.allowed).toBe(true);
  });

  it("blocks publishing when completed uploads plus pending publish-now jobs reach the monthly limit", async () => {
    const result = await checkUploadPlanLimit({
      mode: "publish_now",
      repository: makeRepository({
        monthlyPendingUploads: 2,
        monthlyUploaded: 8,
        plan: "trial",
      }),
      workspaceId,
    });

    expect(result.allowed).toBe(false);
    expect(uploadLimitMessage(result)).toMatch(/trial allows 10/);
  });

  it("blocks scheduling past the concurrent scheduled-upload limit", async () => {
    const result = await checkUploadPlanLimit({
      mode: "schedule",
      repository: makeRepository({ plan: "trial", scheduled: 5 }),
      workspaceId,
    });

    expect(result.allowed).toBe(false);
    expect(uploadLimitMessage(result)).toMatch(/scheduled upload/);
  });

  it("uses paid limits for active paid plans", async () => {
    const result = await checkUploadPlanLimit({
      mode: "schedule",
      repository: makeRepository({ plan: "creator", scheduled: 50 }),
      workspaceId,
    });

    expect(result.allowed).toBe(true);
  });
});

function makeRepository(input: {
  monthlyPendingUploads?: number;
  monthlyUploaded?: number;
  plan?: string;
  scheduled?: number;
}) {
  return {
    countScheduledUploads: vi.fn().mockResolvedValue(input.scheduled ?? 0),
    getEffectivePlan: vi.fn().mockResolvedValue(input.plan ?? "trial"),
    getMonthlyPendingUploadCount: vi
      .fn()
      .mockResolvedValue(input.monthlyPendingUploads ?? 0),
    getMonthlyUploadedCount: vi
      .fn()
      .mockResolvedValue(input.monthlyUploaded ?? 0),
  };
}
