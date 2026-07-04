// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  cancelScheduledUpload,
  publishScheduledUploadNow,
  rescheduleUpload,
  type ScheduledUploadRepository,
} from "@/server/services/scheduled-upload.service";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const uploadId = "33333333-3333-4333-8333-333333333333";

describe("scheduled upload actions", () => {
  it("reschedules an upload and records an audit event", async () => {
    const repository = makeRepository();

    const result = await rescheduleUpload({
      repository,
      scheduledAt: "2026-06-01T14:30:00.000Z",
      uploadId,
      userId,
      workspaceId,
    });

    expect(result).toEqual({ message: "Upload rescheduled.", ok: true });
    expect(repository.updateUpload).toHaveBeenCalledWith({
      allowedStatuses: ["draft", "failed", "scheduled"],
      uploadId,
      values: {
        failure_reason: null,
        scheduled_at: "2026-06-01T14:30:00.000Z",
        status: "scheduled",
      },
      workspaceId,
    });
    expect(repository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "upload.rescheduled" }),
    );
  });

  it("cancels an upload using the database cancelled status", async () => {
    const repository = makeRepository();

    const result = await cancelScheduledUpload({
      repository,
      uploadId,
      userId,
      workspaceId,
    });

    expect(result).toEqual({ message: "Upload canceled.", ok: true });
    expect(repository.updateUpload).toHaveBeenCalledWith({
      allowedStatuses: ["draft", "scheduled"],
      uploadId,
      values: { status: "cancelled" },
      workspaceId,
    });
  });

  it("publishes now through the atomic publish RPC", async () => {
    const repository = makeRepository();

    const result = await publishScheduledUploadNow({
      repository,
      uploadId,
      userId,
      workspaceId,
    });

    expect(result).toEqual({ message: "Publishing job queued.", ok: true });
    expect(repository.publishUploadNow).toHaveBeenCalledWith({
      uploadId,
      userId,
      workspaceId,
    });
    expect(repository.enqueueYoutubeUploadJob).not.toHaveBeenCalled();
  });

  it("does not report publish success when the atomic publish RPC fails", async () => {
    const repository = makeRepository();

    vi.mocked(repository.publishUploadNow).mockRejectedValueOnce(
      new Error("queue unavailable"),
    );

    await expect(
      publishScheduledUploadNow({
        repository,
        uploadId,
        userId,
        workspaceId,
      }),
    ).rejects.toThrow("queue unavailable");
    expect(repository.updateUpload).not.toHaveBeenCalled();
    expect(repository.enqueueYoutubeUploadJob).not.toHaveBeenCalled();
  });

  it("rejects invalid server-side status transitions", async () => {
    const repository = makeRepository();

    vi.mocked(repository.getUpload).mockResolvedValue({
      id: uploadId,
      scheduled_at: "2026-06-01T14:30:00.000Z",
      status: "uploaded",
      track_id: "track-id",
      video_render_id: "render-id",
      workspace_id: workspaceId,
    });

    await expect(
      rescheduleUpload({
        repository,
        scheduledAt: "2026-06-01T14:30:00.000Z",
        uploadId,
        userId,
        workspaceId,
      }),
    ).resolves.toEqual({
      message: "Only queued, scheduled, or failed uploads can be rescheduled.",
      ok: false,
    });
    await expect(
      cancelScheduledUpload({
        repository,
        uploadId,
        userId,
        workspaceId,
      }),
    ).resolves.toEqual({
      message: "Only queued or scheduled uploads can be canceled.",
      ok: false,
    });
    await expect(
      publishScheduledUploadNow({
        repository,
        uploadId,
        userId,
        workspaceId,
      }),
    ).resolves.toEqual({
      message: "Only queued or scheduled uploads can be published now.",
      ok: false,
    });
    expect(repository.updateUpload).not.toHaveBeenCalled();
  });
});

function makeRepository(): ScheduledUploadRepository {
  return {
    createAuditLog: vi.fn().mockResolvedValue({ id: "audit-id" }),
    enqueueYoutubeUploadJob: vi.fn().mockResolvedValue(undefined),
    getUpload: vi.fn().mockResolvedValue({
      id: uploadId,
      scheduled_at: "2026-06-01T14:30:00.000Z",
      status: "scheduled",
      track_id: "track-id",
      video_render_id: "render-id",
      workspace_id: workspaceId,
    }),
    publishUploadNow: vi.fn().mockResolvedValue({
      id: uploadId,
      scheduled_at: null,
      status: "uploading",
      track_id: "track-id",
      video_render_id: "render-id",
      workspace_id: workspaceId,
    }),
    updateUpload: vi.fn().mockResolvedValue({
      id: uploadId,
      scheduled_at: "2026-06-01T14:30:00.000Z",
      status: "scheduled",
      track_id: "track-id",
      video_render_id: "render-id",
      workspace_id: workspaceId,
    }),
  };
}
