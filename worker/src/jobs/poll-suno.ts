import type { QueueClient } from "../queue/queue-client";
import { enqueueSunoPollingJob } from "../queue/queue-client";
import {
  calculateRetryDelaySeconds,
  NonRetryableJobError,
} from "../queue/retry-policy";
import {
  QUEUE_NAMES,
  type SunoPollingJobPayload,
  parseQueuePayload,
} from "../queue/queue-types";
import type { WorkerDatabaseService } from "../services/database";
import type { WorkerStorageService } from "../services/storage";
import type { SunoService } from "../services/suno";

export async function pollSunoJob(
  rawPayload: SunoPollingJobPayload,
  services: {
    database: WorkerDatabaseService;
    queue: QueueClient;
    storage: WorkerStorageService;
    suno: SunoService;
  },
) {
  const payload = parseQueuePayload(QUEUE_NAMES.sunoPolling, rawPayload);
  const status = await services.suno.getTrackStatus({
    sunoTrackId: payload.sunoTrackId,
    trackId: payload.trackId,
    workspaceId: payload.workspaceId,
  });

  if (status.status !== "ready") {
    if (status.status === "processing") {
      await enqueueSunoPollingJob(
        services.queue,
        {
          ...payload,
          attempt: payload.attempt + 1,
        },
        {
          delaySeconds: calculateRetryDelaySeconds({
            attempt: payload.attempt,
          }),
        },
      );
      return { requeued: true };
    }

    await services.database.updateTrackStatus({
      failureReason: status.failureReason ?? "Suno generation failed.",
      status: "failed",
      trackId: payload.trackId,
      workspaceId: payload.workspaceId,
    });
    throw new NonRetryableJobError(status.failureReason ?? "Suno failed.");
  }

  const audioStoragePath = await services.storage.copyAudioFromUrl({
    audioUrl: status.audioUrl,
    trackId: payload.trackId,
    workspaceId: payload.workspaceId,
  });

  await services.database.saveTrackAudio({
    audioStoragePath,
    sourceAudioUrl: status.audioUrl,
    trackId: payload.trackId,
    workspaceId: payload.workspaceId,
  });

  // Suno ships free cover art with every track; persist it as the track's
  // image asset (video background + future thumbnail) unless the user
  // already picked one. Never fail the track over a missing cover.
  if (status.imageUrl) {
    try {
      const coverStoragePath = await services.storage.copyCoverFromUrl({
        imageUrl: status.imageUrl,
        trackId: payload.trackId,
        workspaceId: payload.workspaceId,
      });

      await services.database.saveTrackCover({
        storagePath: coverStoragePath,
        trackId: payload.trackId,
        workspaceId: payload.workspaceId,
      });
    } catch {
      // Cover is best-effort; the track ships without one.
    }
  }

  await services.database.updateTrackStatus({
    status: "preview_ready",
    trackId: payload.trackId,
    workspaceId: payload.workspaceId,
  });
  await services.database.createAuditLog({
    action: "track.preview_ready",
    entityId: payload.trackId,
    entityType: "track",
    metadata: { suno_track_id: payload.sunoTrackId },
    workspaceId: payload.workspaceId,
  });

  return { requeued: false };
}
