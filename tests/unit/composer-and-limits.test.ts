import { describe, expect, it } from "vitest";
import { composeYouTubeMetadata } from "@/server/services/metadata-composer.service";
import {
  PLAN_LIMITS,
  checkPlanLimit,
} from "@/server/services/plan-limits.service";
import { composePrompt } from "@/server/services/prompt-composer.service";

describe("prompt and metadata composers", () => {
  it("creates concise instrumental prompts without artist impersonation", () => {
    const result = composePrompt({
      style: "cinematic synthwave like Taylor Swift",
      mood: "focused night drive",
      duration_seconds: 180,
      track_count: 2,
    });

    expect(result.final_prompt).toContain("Instrumental only");
    expect(result.final_prompt).not.toMatch(/Taylor Swift/i);
    expect(result.prompt_summary).toContain("focused night drive");
    expect(result.title_seed.length).toBeGreaterThan(0);
    expect(result.suggested_tags).toContain("synthwave");
  });

  it("creates YouTube-friendly metadata without a forced AI disclaimer", () => {
    const result = composeYouTubeMetadata({
      title_seed: "Midnight Drive",
      style: "synthwave",
      mood: "focused",
      suggested_tags: ["synthwave", "focus", "driving"],
      target_youtube_channel_id: "11111111-1111-4111-8111-111111111111",
    });

    expect(result.title).toBe("Midnight Drive - Focused Synthwave");
    expect(result.description).not.toMatch(/AI generated/i);
    expect(result.privacy_status).toBe("private");
    expect(result.target_youtube_channel_id).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(result.tags.length).toBeLessThanOrEqual(10);
  });
});

describe("plan limits", () => {
  it("blocks usage at the current plan limit and suggests the next plan", () => {
    expect(PLAN_LIMITS.trial.monthlyUploads).toBe(10);

    expect(
      checkPlanLimit({
        currentPlan: "trial",
        metric: "youtubeChannels",
        currentUsage: 1,
      }),
    ).toEqual({
      allowed: false,
      reason: "trial allows 1 youtube channel.",
      currentPlan: "trial",
      requiredPlan: "creator",
    });
  });

  it("allows usage below the current plan limit", () => {
    expect(
      checkPlanLimit({
        currentPlan: "creator",
        metric: "monthlyGenerationRequests",
        currentUsage: 10,
      }),
    ).toEqual({ allowed: true, currentPlan: "creator" });
  });

  it("blocks a request that would push usage over the plan limit", () => {
    expect(
      checkPlanLimit({
        currentPlan: "trial",
        metric: "monthlyGenerationRequests",
        currentUsage: 9,
        requestedUsage: 2,
      }),
    ).toEqual({
      allowed: false,
      reason: "trial allows 10 monthly generation requests.",
      currentPlan: "trial",
      requiredPlan: "creator",
    });
  });
});
