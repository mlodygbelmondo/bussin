import { describe, expect, it, vi } from "vitest";
import { createUsageRepository } from "@/server/services/generation.repository";
import { createAuditLogService } from "@/server/services/audit-log.service";
import { createImageAssetService } from "@/server/services/image-asset.service";
import { createUsageService } from "@/server/services/usage.service";
import { createVideoRenderService } from "@/server/services/video-render.service";
import { createWorkspaceService } from "@/server/services/workspace.service";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";

describe("workspace service", () => {
  it("requires owner or admin role before updating workspace settings", async () => {
    const repository = {
      createWorkspace: vi.fn(),
      getMembership: vi.fn().mockResolvedValue({
        id: "membership-id",
        workspace_id: workspaceId,
        user_id: userId,
        role: "member",
        created_at: "2026-01-01T00:00:00.000Z",
      }),
      getPrimaryMembershipForUser: vi.fn(),
      updateWorkspace: vi.fn(),
    };
    const service = createWorkspaceService(repository);

    await expect(
      service.updateWorkspaceSettings({
        workspaceId,
        userId,
        values: { name: "New name" },
      }),
    ).rejects.toThrow("Workspace admin access required.");
    expect(repository.updateWorkspace).not.toHaveBeenCalled();
  });
});

describe("usage service", () => {
  it("increments generated track counts atomically in the current period", async () => {
    const repository = {
      getCurrentPlan: vi.fn().mockResolvedValue("trial"),
      getUsageCounter: vi.fn().mockResolvedValue(null),
      incrementUsageCounter: vi.fn().mockResolvedValue({ id: "usage-id" }),
    };
    const service = createUsageService(repository);
    const period = service.getCurrentUsagePeriod();

    await service.incrementGeneratedTracks(workspaceId);

    expect(repository.incrementUsageCounter).toHaveBeenCalledWith({
      workspaceId,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      deltas: { generatedTracks: 1 },
    });
  });

  it("reads the usage summary scoped to the current period", async () => {
    const repository = {
      getCurrentPlan: vi.fn().mockResolvedValue("creator"),
      getUsageCounter: vi.fn().mockResolvedValue({
        generated_tracks_count: 4,
        uploaded_videos_count: 2,
        connected_channels_count: 1,
        scheduled_uploads_count: 3,
      }),
      incrementUsageCounter: vi.fn(),
    };
    const service = createUsageService(repository);
    const period = service.getCurrentUsagePeriod();

    const summary = await service.getUsageSummary(workspaceId);

    expect(repository.getUsageCounter).toHaveBeenCalledWith({
      workspaceId,
      ...period,
    });
    expect(summary).toEqual({
      currentPlan: "creator",
      monthlyGenerationRequests: 4,
      monthlyUploads: 2,
      scheduledUploads: 3,
      youtubeChannels: 1,
    });
  });

  it("maps usage counter deltas to the increment_usage_counter RPC", async () => {
    const usageCounter = { id: "usage-id" };
    const rpc = vi.fn().mockResolvedValue({
      data: usageCounter,
      error: null,
    });
    const repository = createUsageRepository({
      rpc,
    } as unknown as Parameters<typeof createUsageRepository>[0]);

    await expect(
      repository.incrementUsageCounter({
        workspaceId,
        periodStart: "2026-07-01T00:00:00.000Z",
        periodEnd: "2026-08-01T00:00:00.000Z",
        deltas: {
          connectedChannels: 4,
          generatedTracks: 1,
          scheduledUploads: 3,
          uploadedVideos: 2,
        },
      }),
    ).resolves.toBe(usageCounter);

    expect(rpc).toHaveBeenCalledWith("increment_usage_counter", {
      connected_channels_delta: 4,
      generated_tracks_delta: 1,
      scheduled_uploads_delta: 3,
      target_period_end: "2026-08-01T00:00:00.000Z",
      target_period_start: "2026-07-01T00:00:00.000Z",
      target_workspace_id: workspaceId,
      uploaded_videos_delta: 2,
    });
  });

  it("rejects an empty increment_usage_counter RPC result", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const repository = createUsageRepository({
      rpc,
    } as unknown as Parameters<typeof createUsageRepository>[0]);

    await expect(
      repository.incrementUsageCounter({
        workspaceId,
        periodStart: "2026-07-01T00:00:00.000Z",
        periodEnd: "2026-08-01T00:00:00.000Z",
        deltas: { generatedTracks: 1 },
      }),
    ).rejects.toThrow("increment_usage_counter returned no usage counter.");
  });
});

describe("audit, image asset, and render services", () => {
  it("creates audit logs with metadata", async () => {
    const repository = {
      createAuditLog: vi.fn().mockResolvedValue({ id: "audit-id" }),
      listAuditLogs: vi.fn(),
    };
    const service = createAuditLogService(repository);

    await service.create({
      workspaceId,
      userId,
      action: "billing.changed",
      metadata: { plan: "creator" },
    });

    expect(repository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "billing.changed",
        metadata: { plan: "creator" },
      }),
    );
  });

  it("rejects image asset paths outside the workspace boundary", () => {
    const service = createImageAssetService({
      createImageAsset: vi.fn(),
      listImageAssets: vi.fn(),
    });

    expect(() =>
      service.create({
        workspace_id: workspaceId,
        storage_path: "33333333-3333-4333-8333-333333333333/cover.png",
      }),
    ).toThrow("storage_path must start with workspace_id");
  });

  it("updates video render status through strict transitions", async () => {
    const repository = {
      createVideoRender: vi.fn(),
      getVideoRenderById: vi.fn().mockResolvedValue({
        id: "render-id",
        workspace_id: workspaceId,
        track_id: "track-id",
        status: "queued",
        video_storage_path: null,
        failure_reason: null,
        started_at: null,
        finished_at: null,
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T00:00:00.000Z",
      }),
      updateVideoRender: vi.fn().mockResolvedValue({ status: "running" }),
    };
    const service = createVideoRenderService(repository);

    await service.updateStatus({
      workspaceId,
      renderId: "render-id",
      status: "running",
    });

    expect(repository.updateVideoRender).toHaveBeenCalledWith({
      renderId: "render-id",
      values: {
        failure_reason: undefined,
        status: "running",
        video_storage_path: undefined,
      },
    });
  });
});
