// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { pollSunoJob } from "../../worker/src/jobs/poll-suno";
import { processGenerationJob } from "../../worker/src/jobs/process-generation";
import { dispatchScheduledPublishJobs } from "../../worker/src/jobs/publish-scheduled";
import { uploadYoutubeJob } from "../../worker/src/jobs/upload-youtube";
import {
  ackMessage,
  consumeQueue,
  createInMemoryQueueClient,
  enqueueGenerationJob,
} from "../../worker/src/queue/queue-client";
import { QUEUE_NAMES } from "../../worker/src/queue/queue-types";
import type { WorkerDatabaseService } from "../../worker/src/services/database";
import type { WorkerStorageService } from "../../worker/src/services/storage";
import type { SunoService } from "../../worker/src/services/suno";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const generationRequestId = "22222222-2222-4222-8222-222222222222";
const trackId = "33333333-3333-4333-8333-333333333333";
const renderId = "44444444-4444-4444-8444-444444444444";
const uploadId = "55555555-5555-4555-8555-555555555555";

describe("worker queue integration", () => {
  it("enqueues, consumes, and acknowledges a generation queue message", async () => {
    const queue = createInMemoryQueueClient();

    const messageId = await enqueueGenerationJob(queue, {
      workspaceId,
      generationRequestId,
      trackId,
    });

    const messages = await consumeQueue(queue, QUEUE_NAMES.generation, {
      maxMessages: 1,
      visibilityTimeoutSeconds: 30,
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      id: messageId,
      queueName: QUEUE_NAMES.generation,
      payload: { workspaceId, generationRequestId, trackId },
    });

    await ackMessage(queue, messages[0]);

    expect(
      await consumeQueue(queue, QUEUE_NAMES.generation, {
        maxMessages: 1,
        visibilityTimeoutSeconds: 30,
      }),
    ).toEqual([]);
  });
});

describe("worker job processors", () => {
  it("processes a generation job with mocked Suno and enqueues polling", async () => {
    const queue = createInMemoryQueueClient();
    const database = makeDatabaseService({
      getGenerationContext: vi.fn().mockResolvedValue({
        finalPrompt: "upbeat synthwave track",
        title: "Launch Loop",
      }),
    });
    const suno: SunoService = {
      createCustomGeneration: vi.fn().mockResolvedValue({
        sunoTrackId: "suno-track-1",
      }),
      getTrackStatus: vi.fn(),
    };

    await processGenerationJob(
      { workspaceId, generationRequestId, trackId },
      { database, queue, suno },
    );

    expect(database.updateTrackStatus).toHaveBeenCalledWith({
      workspaceId,
      trackId,
      status: "generating",
    });
    expect(suno.createCustomGeneration).toHaveBeenCalledWith({
      prompt: "upbeat synthwave track",
      title: "Launch Loop",
      workspaceId,
      trackId,
    });
    expect(database.saveSunoTrackId).toHaveBeenCalledWith({
      workspaceId,
      trackId,
      sunoTrackId: "suno-track-1",
    });
    expect(database.updateTrackStatus).toHaveBeenCalledWith({
      workspaceId,
      trackId,
      status: "polling",
    });

    const pollingMessages = await consumeQueue(queue, QUEUE_NAMES.sunoPolling, {
      maxMessages: 1,
      visibilityTimeoutSeconds: 30,
    });

    expect(pollingMessages[0]?.payload).toEqual({
      workspaceId,
      trackId,
      sunoTrackId: "suno-track-1",
      attempt: 1,
    });
  });

  it("reuses an existing Suno task id on generation retry", async () => {
    const queue = createInMemoryQueueClient();
    const database = makeDatabaseService({
      getGenerationContext: vi.fn().mockResolvedValue({
        existingSunoTrackId: "suno-track-existing",
        finalPrompt: "upbeat synthwave track",
        title: "Launch Loop",
      }),
    });
    const suno: SunoService = {
      createCustomGeneration: vi.fn(),
      getTrackStatus: vi.fn(),
    };

    await processGenerationJob(
      { workspaceId, generationRequestId, trackId },
      { database, queue, suno },
    );

    expect(suno.createCustomGeneration).not.toHaveBeenCalled();
    expect(database.saveSunoTrackId).not.toHaveBeenCalled();

    const pollingMessages = await consumeQueue(queue, QUEUE_NAMES.sunoPolling, {
      maxMessages: 1,
      visibilityTimeoutSeconds: 30,
    });

    expect(pollingMessages[0]?.payload).toEqual({
      workspaceId,
      trackId,
      sunoTrackId: "suno-track-existing",
      attempt: 1,
    });
  });

  it("marks a ready Suno track as preview ready and audits it", async () => {
    const queue = createInMemoryQueueClient();
    const database = makeDatabaseService();
    const suno: SunoService = {
      createCustomGeneration: vi.fn(),
      getTrackStatus: vi.fn().mockResolvedValue({
        status: "ready",
        audioUrl: "https://audio.example.test/track.mp3",
      }),
    };
    const storage: WorkerStorageService = {
      copyAudioFromUrl: vi
        .fn()
        .mockResolvedValue(`${workspaceId}/audio/${trackId}.mp3`),
      downloadVideo: vi.fn(),
      uploadVideo: vi.fn(),
    };

    await pollSunoJob(
      {
        workspaceId,
        trackId,
        sunoTrackId: "suno-track-1",
        attempt: 2,
      },
      { database, queue, storage, suno },
    );

    expect(storage.copyAudioFromUrl).toHaveBeenCalledWith({
      workspaceId,
      trackId,
      audioUrl: "https://audio.example.test/track.mp3",
    });
    expect(database.saveTrackAudio).toHaveBeenCalledWith({
      workspaceId,
      trackId,
      audioStoragePath: `${workspaceId}/audio/${trackId}.mp3`,
      sourceAudioUrl: "https://audio.example.test/track.mp3",
    });
    expect(database.updateTrackStatus).toHaveBeenCalledWith({
      workspaceId,
      trackId,
      status: "preview_ready",
    });
    expect(database.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "track.preview_ready",
        entityId: trackId,
        workspaceId,
      }),
    );

    expect(
      await consumeQueue(queue, QUEUE_NAMES.sunoPolling, {
        maxMessages: 1,
        visibilityTimeoutSeconds: 30,
      }),
    ).toEqual([]);
  });
});

describe("YouTube upload worker", () => {
  it("downloads the rendered video and uploads it with channel credentials", async () => {
    const video = new Uint8Array([1, 2, 3]);
    const database = makeDatabaseService({
      getYoutubeUploadContext: vi.fn().mockResolvedValue({
        description: "Generated by Bussin",
        encryptedAccessToken: "encrypted-access-token",
        encryptedRefreshToken: "encrypted-refresh-token",
        privacyStatus: "unlisted",
        tags: ["lofi"],
        title: "Launch Loop",
        tokenExpiresAt: "2026-06-01T13:00:00.000Z",
        videoStoragePath: `${workspaceId}/renders/${renderId}.mp4`,
        youtubeChannelId: "UC123",
      }),
    });
    const storage: WorkerStorageService = {
      copyAudioFromUrl: vi.fn(),
      downloadVideo: vi.fn().mockResolvedValue(video),
      uploadVideo: vi.fn(),
    };
    const youtube = {
      uploadVideo: vi.fn().mockResolvedValue({ youtubeVideoId: "yt-123" }),
    };

    await uploadYoutubeJob(
      {
        workspaceId,
        trackId,
        videoRenderId: renderId,
        youtubeUploadId: uploadId,
      },
      { database, storage, youtube },
    );

    expect(storage.downloadVideo).toHaveBeenCalledWith(
      `${workspaceId}/renders/${renderId}.mp4`,
    );
    expect(youtube.uploadVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        encryptedAccessToken: "encrypted-access-token",
        encryptedRefreshToken: "encrypted-refresh-token",
        title: "Launch Loop",
        video,
        youtubeChannelId: "UC123",
      }),
    );
    expect(database.saveYoutubeVideoId).toHaveBeenCalledWith({
      workspaceId,
      youtubeUploadId: uploadId,
      youtubeVideoId: "yt-123",
    });
  });

  it("skips provider upload when a YouTube video id was already saved", async () => {
    const database = makeDatabaseService({
      getYoutubeUploadContext: vi.fn().mockResolvedValue({
        description: "Generated by Bussin",
        encryptedAccessToken: "encrypted-access-token",
        encryptedRefreshToken: "encrypted-refresh-token",
        privacyStatus: "unlisted",
        tags: ["lofi"],
        title: "Launch Loop",
        tokenExpiresAt: "2026-06-01T13:00:00.000Z",
        videoStoragePath: `${workspaceId}/renders/${renderId}.mp4`,
        youtubeChannelId: "UC123",
        youtubeVideoId: "yt-existing",
      }),
    });
    const storage: WorkerStorageService = {
      copyAudioFromUrl: vi.fn(),
      downloadVideo: vi.fn(),
      uploadVideo: vi.fn(),
    };
    const youtube = {
      uploadVideo: vi.fn(),
    };

    await uploadYoutubeJob(
      {
        workspaceId,
        trackId,
        videoRenderId: renderId,
        youtubeUploadId: uploadId,
      },
      { database, storage, youtube },
    );

    expect(storage.downloadVideo).not.toHaveBeenCalled();
    expect(youtube.uploadVideo).not.toHaveBeenCalled();
    expect(database.saveYoutubeVideoId).not.toHaveBeenCalled();
    expect(database.updateYoutubeUploadStatus).toHaveBeenCalledWith({
      workspaceId,
      youtubeUploadId: uploadId,
      status: "uploaded",
    });
  });
});

describe("scheduled publish dispatcher", () => {
  it("ignores future scheduled uploads", async () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    const queue = createInMemoryQueueClient();
    const database = makeDatabaseService({
      listScheduledYoutubeUploads: vi.fn().mockResolvedValue([
        {
          id: uploadId,
          workspaceId,
          trackId,
          videoRenderId: renderId,
          scheduledAt: "2026-06-01T12:05:00.000Z",
        },
      ]),
    });

    const result = await dispatchScheduledPublishJobs({
      database,
      queue,
      now,
    });

    expect(result.enqueued).toBe(0);
    expect(database.markYoutubeUploadDispatching).not.toHaveBeenCalled();
    expect(
      await consumeQueue(queue, QUEUE_NAMES.youtubeUpload, {
        maxMessages: 1,
        visibilityTimeoutSeconds: 30,
      }),
    ).toEqual([]);
  });

  it("enqueues due scheduled uploads", async () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    const queue = createInMemoryQueueClient();
    const database = makeDatabaseService({
      listScheduledYoutubeUploads: vi.fn().mockResolvedValue([
        {
          id: uploadId,
          workspaceId,
          trackId,
          videoRenderId: renderId,
          scheduledAt: "2026-06-01T11:59:00.000Z",
        },
      ]),
    });

    const result = await dispatchScheduledPublishJobs({
      database,
      queue,
      now,
    });

    expect(result.enqueued).toBe(1);
    expect(database.markYoutubeUploadDispatching).toHaveBeenCalledWith({
      workspaceId,
      youtubeUploadId: uploadId,
    });

    const messages = await consumeQueue(queue, QUEUE_NAMES.youtubeUpload, {
      maxMessages: 1,
      visibilityTimeoutSeconds: 30,
    });

    expect(messages[0]?.payload).toEqual({
      workspaceId,
      trackId,
      videoRenderId: renderId,
      youtubeUploadId: uploadId,
    });
  });
});

function makeDatabaseService(
  overrides: Partial<WorkerDatabaseService> = {},
): WorkerDatabaseService {
  return {
    createAuditLog: vi.fn().mockResolvedValue(undefined),
    getGenerationContext: vi.fn().mockResolvedValue({
      finalPrompt: "test prompt",
      title: "Test Track",
    }),
    getRenderContext: vi.fn(),
    getYoutubeUploadContext: vi.fn(),
    incrementUploadedVideosUsage: vi.fn().mockResolvedValue(undefined),
    listScheduledYoutubeUploads: vi.fn().mockResolvedValue([]),
    markYoutubeUploadDispatching: vi.fn().mockResolvedValue(undefined),
    saveSunoTrackId: vi.fn().mockResolvedValue(undefined),
    saveTrackAudio: vi.fn().mockResolvedValue(undefined),
    saveVideoRenderOutput: vi.fn().mockResolvedValue(undefined),
    saveYoutubeVideoId: vi.fn().mockResolvedValue(undefined),
    updateTrackStatus: vi.fn().mockResolvedValue(undefined),
    updateVideoRenderStatus: vi.fn().mockResolvedValue(undefined),
    updateYoutubeUploadStatus: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
