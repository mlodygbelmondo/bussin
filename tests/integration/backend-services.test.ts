// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  createGenerationRequestService,
  type GenerationRequestRepository,
} from "@/server/services/generation-request.service";
import {
  createTrackService,
  type TrackRepository,
} from "@/server/services/track.service";
import {
  createYoutubeUploadService,
  type YoutubeUploadRepository,
} from "@/server/services/youtube-upload.service";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const trackId = "33333333-3333-4333-8333-333333333333";
const renderId = "44444444-4444-4444-8444-444444444444";
const channelId = "55555555-5555-4555-8555-555555555555";

describe("backend service orchestration", () => {
  it("creates a generation request, tracks, queue jobs, prompt history, and audit log", async () => {
    const queue = {
      enqueueGenerationJob: vi.fn().mockResolvedValue(undefined),
    };
    const repository = makeGenerationRepository();
    const service = createGenerationRequestService({ queue, repository });

    const result = await service.create({
      workspaceId,
      createdByUserId: userId,
      input: {
        style: "lofi house",
        mood: "focused",
        duration_seconds: 120,
        track_count: 2,
        publish_mode: "draft",
      },
    });

    expect(result.tracks).toHaveLength(2);
    expect(repository.createGenerationRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: workspaceId,
        created_by_user_id: userId,
        status: "queued",
      }),
    );
    expect(repository.createTrack).toHaveBeenCalledTimes(2);
    expect(queue.enqueueGenerationJob).toHaveBeenCalledTimes(2);
    expect(repository.createPromptHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: workspaceId,
        generation_request_id: result.request.id,
      }),
    );
    expect(repository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "generation.created",
        workspace_id: workspaceId,
      }),
    );
    expect(repository.incrementGeneratedTracks).toHaveBeenCalledWith(
      workspaceId,
      2,
    );
  });

  it("blocks generation requests that exceed the remaining plan allowance", async () => {
    const queue = {
      enqueueGenerationJob: vi.fn().mockResolvedValue(undefined),
    };
    const repository = makeGenerationRepository();
    repository.getUsageSummary = vi.fn().mockResolvedValue({
      currentPlan: "trial",
      monthlyGenerationRequests: 9,
      monthlyUploads: 0,
      scheduledUploads: 0,
      youtubeChannels: 0,
    });
    const service = createGenerationRequestService({ queue, repository });

    await expect(
      service.create({
        workspaceId,
        createdByUserId: userId,
        input: {
          style: "lofi house",
          mood: "focused",
          duration_seconds: 120,
          track_count: 2,
          publish_mode: "draft",
        },
      }),
    ).rejects.toMatchObject({ code: "PLAN_LIMIT_EXCEEDED" });
    expect(repository.createGenerationRequest).not.toHaveBeenCalled();
    expect(queue.enqueueGenerationJob).not.toHaveBeenCalled();
  });

  it("approving a track creates a queued render row and audit log", async () => {
    const repository = makeTrackRepository();
    const service = createTrackService({ repository });

    const result = await service.approveTrack({ workspaceId, trackId, userId });

    expect(result.track.status).toBe("approved");
    expect(result.render.status).toBe("queued");
    expect(repository.createVideoRender).toHaveBeenCalledWith({
      workspace_id: workspaceId,
      track_id: trackId,
      status: "queued",
    });
    expect(repository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "track.approved" }),
    );
  });

  it("schedules a YouTube upload row and audit log", async () => {
    const repository = makeYoutubeUploadRepository();
    const service = createYoutubeUploadService({ repository });

    const upload = await service.scheduleUpload({
      workspaceId,
      userId,
      input: {
        track_id: trackId,
        video_render_id: renderId,
        youtube_channel_id: channelId,
        title: "Midnight Focus",
        privacy_status: "private",
        scheduled_at: "2026-06-01T10:00:00.000Z",
      },
    });

    expect(upload.status).toBe("scheduled");
    expect(repository.createYoutubeUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: workspaceId,
        status: "scheduled",
        scheduled_at: "2026-06-01T10:00:00.000Z",
      }),
    );
    expect(repository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "upload.scheduled" }),
    );
  });
});

function makeGenerationRepository(): GenerationRequestRepository {
  return {
    createAuditLog: vi.fn().mockResolvedValue({ id: "audit-id" }),
    createGenerationRequest: vi.fn().mockResolvedValue({
      id: "generation-request-id",
      workspace_id: workspaceId,
      status: "queued",
    }),
    createPromptHistory: vi.fn().mockResolvedValue({ id: "prompt-history-id" }),
    createTrack: vi
      .fn()
      .mockResolvedValueOnce({
        id: "track-1",
        workspace_id: workspaceId,
        status: "draft",
      })
      .mockResolvedValueOnce({
        id: "track-2",
        workspace_id: workspaceId,
        status: "draft",
      }),
    getUsageSummary: vi.fn().mockResolvedValue({
      currentPlan: "trial",
      monthlyGenerationRequests: 0,
      monthlyUploads: 0,
      scheduledUploads: 0,
      youtubeChannels: 0,
    }),
    incrementGeneratedTracks: vi.fn().mockResolvedValue({ id: "usage-id" }),
  };
}

function makeTrackRepository(): TrackRepository {
  return {
    createAuditLog: vi.fn().mockResolvedValue({ id: "audit-id" }),
    createVideoRender: vi.fn().mockResolvedValue({
      id: renderId,
      workspace_id: workspaceId,
      track_id: trackId,
      status: "queued",
    }),
    getTrackById: vi.fn().mockResolvedValue({
      id: trackId,
      workspace_id: workspaceId,
      status: "ready",
    }),
    listTracks: vi.fn().mockResolvedValue([]),
    updateTrack: vi.fn().mockResolvedValue({
      id: trackId,
      workspace_id: workspaceId,
      status: "approved",
    }),
  };
}

function makeYoutubeUploadRepository(): YoutubeUploadRepository {
  return {
    createAuditLog: vi.fn().mockResolvedValue({ id: "audit-id" }),
    createYoutubeUpload: vi.fn().mockResolvedValue({
      id: "upload-id",
      workspace_id: workspaceId,
      status: "scheduled",
      scheduled_at: "2026-06-01T10:00:00.000Z",
    }),
  };
}
