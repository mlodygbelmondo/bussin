import type { QueueClient } from "../queue/queue-client";
import { enqueueSunoPollingJob } from "../queue/queue-client";
import { NonRetryableJobError } from "../queue/retry-policy";
import {
  QUEUE_NAMES,
  type GenerationJobPayload,
  parseQueuePayload,
} from "../queue/queue-types";
import type { WorkerDatabaseService } from "../services/database";
import type { SunoService } from "../services/suno";

export async function processGenerationJob(
  rawPayload: GenerationJobPayload,
  services: {
    database: WorkerDatabaseService;
    queue: QueueClient;
    suno: SunoService;
  },
) {
  const payload = parseQueuePayload(QUEUE_NAMES.generation, rawPayload);
  const context = await services.database.getGenerationContext(payload);

  if (context.requestStatus === "cancelled") {
    throw new NonRetryableJobError("Generation request was cancelled.");
  }

  await services.database.updateTrackStatus({
    status: "generating",
    trackId: payload.trackId,
    workspaceId: payload.workspaceId,
  });

  const generation = context.existingSunoTrackId
    ? { sunoTrackId: context.existingSunoTrackId }
    : await services.suno.createCustomGeneration({
        options: context.sunoOptions,
        prompt: context.finalPrompt,
        title: context.title,
        trackId: payload.trackId,
        workspaceId: payload.workspaceId,
      });

  if (!context.existingSunoTrackId) {
    await services.database.saveSunoTrackId({
      sunoTrackId: generation.sunoTrackId,
      trackId: payload.trackId,
      workspaceId: payload.workspaceId,
    });
  }
  await services.database.updateTrackStatus({
    status: "polling",
    trackId: payload.trackId,
    workspaceId: payload.workspaceId,
  });
  await enqueueSunoPollingJob(services.queue, {
    attempt: 1,
    sunoTrackId: generation.sunoTrackId,
    trackId: payload.trackId,
    workspaceId: payload.workspaceId,
  });
}
