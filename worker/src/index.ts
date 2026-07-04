import "dotenv/config";

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/database.types";
import { createSecretsService } from "../../src/server/services/secrets.service";
import { InvalidStatusTransitionError } from "../../src/server/services/status-transition.service";
import {
  StaleStatusError,
  StatusRowNotFoundError,
} from "../../src/server/services/status-writer.service";
import { loadWorkerConfig, type WorkerConfig } from "./config";
import { startHealthServer } from "./health";
import { runMaintenanceJob } from "./jobs/maintenance";
import { pollSunoJob } from "./jobs/poll-suno";
import { processGenerationJob } from "./jobs/process-generation";
import { renderVideoJob } from "./jobs/render-video";
import { uploadYoutubeJob } from "./jobs/upload-youtube";
import { createWorkerLogger, type WorkerLogger } from "./logger";
import {
  ackMessage,
  consumeQueue,
  createSupabaseQueueClient,
  failMessage,
  retryMessage,
  type QueueClient,
  type QueueMessage,
} from "./queue/queue-client";
import {
  calculateRetryDelaySeconds,
  mapJobError,
  shouldRetryJob,
} from "./queue/retry-policy";
import {
  QUEUE_NAMES,
  type GenerationJobPayload,
  type MaintenanceJobPayload,
  type QueueName,
  type RenderJobPayload,
  type SunoPollingJobPayload,
  type YoutubeUploadJobPayload,
} from "./queue/queue-types";
import {
  createWorkerDatabaseService,
  type WorkerDatabaseService,
} from "./services/database";
import { createFfmpegService, type FfmpegService } from "./services/ffmpeg";
import {
  createWorkerStorageService,
  type WorkerStorageService,
} from "./services/storage";
import { createSunoService, type SunoService } from "./services/suno";
import { createYoutubeService, type YoutubeService } from "./services/youtube";

export type WorkerServices = {
  database: WorkerDatabaseService;
  ffmpeg: FfmpegService;
  logger: WorkerLogger;
  queue: QueueClient;
  storage: WorkerStorageService;
  suno: SunoService;
  youtube: YoutubeService;
};

const WORKER_QUEUES = [
  QUEUE_NAMES.generation,
  QUEUE_NAMES.sunoPolling,
  QUEUE_NAMES.render,
  QUEUE_NAMES.youtubeUpload,
  QUEUE_NAMES.maintenance,
] as const;

async function main() {
  const config = loadWorkerConfig();
  const logger = createWorkerLogger({ workerId: config.workerId });
  const shutdown = new AbortController();

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      logger.info("Shutdown requested.", { signal });
      shutdown.abort();
    });
  }

  const supabase = createClient<Database>(
    config.supabaseUrl,
    config.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
  const queue = createSupabaseQueueClient(supabase);
  const secrets = createSecretsService({
    encryptionKey: config.secretsEncryptionKey,
  });
  const database = createWorkerDatabaseService(supabase);
  const services: WorkerServices = {
    database,
    ffmpeg: createFfmpegService(),
    logger,
    queue,
    storage: createWorkerStorageService(supabase),
    suno: createSunoService({
      database,
      fallbackApiBaseUrl: config.sunoApiBaseUrl,
      fallbackApiKey: config.sunoApiKey,
      secrets,
    }),
    youtube: createYoutubeService({
      googleClientId: config.googleClientId,
      googleClientSecret: config.googleClientSecret,
      secrets,
    }),
  };

  logger.info("Bussin worker started.", {
    maxConcurrency: config.maxConcurrency,
    pollIntervalMs: config.pollIntervalMs,
  });

  const health = startHealthServer({ logger, port: config.healthPort });
  await health.ready;

  try {
    await runWorkerLoop({
      config,
      onTick: () => health.recordTick(),
      services,
      signal: shutdown.signal,
    });
  } finally {
    await health.stop();
  }
}

export async function runWorkerLoop(input: {
  config: WorkerConfig;
  onTick?: () => void;
  services: WorkerServices;
  signal?: AbortSignal;
}) {
  while (!input.signal?.aborted) {
    input.onTick?.();

    const processedCount = await processQueues(input);

    if (processedCount === 0) {
      await sleep(input.config.pollIntervalMs, input.signal);
    }
  }
}

async function processQueues(input: {
  config: WorkerConfig;
  services: WorkerServices;
}) {
  let processedCount = 0;

  for (const queueName of WORKER_QUEUES) {
    let messages: QueueMessage[];

    try {
      messages = await consumeQueue(input.services.queue, queueName, {
        maxMessages: input.config.maxConcurrency,
        visibilityTimeoutSeconds: input.config.queueVisibilityTimeoutSeconds,
      });
    } catch (error) {
      input.services.logger.error("Worker queue poll failed.", {
        error,
        queueName,
      });
      continue;
    }

    processedCount += messages.length;

    await Promise.all(
      messages.map((message) =>
        handleMessage({
          config: input.config,
          message,
          queueName,
          services: input.services,
        }),
      ),
    );
  }

  return processedCount;
}

async function handleMessage(input: {
  config: WorkerConfig;
  message: QueueMessage;
  queueName: QueueName;
  services: WorkerServices;
}) {
  try {
    await runJobHandler(input.queueName, input.message.payload, input.services);
    await ackMessage(input.services.queue, input.message);
    input.services.logger.info("Worker job completed.", {
      messageId: input.message.id,
      queueName: input.queueName,
    });
  } catch (error) {
    const mappedError = mapJobError(error);
    const attempt = Math.max(input.message.readCount, 1);

    input.services.logger.error("Worker job failed.", {
      attempt,
      error,
      failureReason: mappedError.failureReason,
      messageId: input.message.id,
      queueName: input.queueName,
      retryable: mappedError.retryable,
    });

    if (
      mappedError.retryable &&
      shouldRetryJob({ attempt, maxAttempts: input.config.maxAttempts })
    ) {
      await retryMessage(
        input.services.queue,
        input.message,
        calculateRetryDelaySeconds({
          attempt,
          baseDelaySeconds: input.config.retryBaseDelaySeconds,
          maxDelaySeconds: input.config.retryMaxDelaySeconds,
        }),
      );
      return;
    }

    await markFailed(input.queueName, input.message.payload, {
      database: input.services.database,
      failureReason: mappedError.failureReason,
    });
    await failMessage(
      input.services.queue,
      input.message,
      mappedError.failureReason,
    );
  }
}

async function runJobHandler(
  queueName: QueueName,
  payload: unknown,
  services: WorkerServices,
) {
  switch (queueName) {
    case QUEUE_NAMES.generation:
      return processGenerationJob(payload as GenerationJobPayload, services);
    case QUEUE_NAMES.sunoPolling:
      return pollSunoJob(payload as SunoPollingJobPayload, services);
    case QUEUE_NAMES.render:
      return renderVideoJob(payload as RenderJobPayload, services);
    case QUEUE_NAMES.youtubeUpload:
      return uploadYoutubeJob(payload as YoutubeUploadJobPayload, services);
    case QUEUE_NAMES.maintenance:
      return runMaintenanceJob(payload as MaintenanceJobPayload, services);
  }
}

async function markFailed(
  queueName: QueueName,
  payload: unknown,
  input: {
    database: WorkerDatabaseService;
    failureReason: string;
  },
) {
  switch (queueName) {
    case QUEUE_NAMES.generation: {
      const job = payload as GenerationJobPayload;
      await markFailedIfStillLegal(() =>
        input.database.updateTrackStatus({
          failureReason: input.failureReason,
          status: "failed",
          trackId: job.trackId,
          workspaceId: job.workspaceId,
        }),
      );
      break;
    }
    case QUEUE_NAMES.sunoPolling: {
      const job = payload as SunoPollingJobPayload;
      await markFailedIfStillLegal(() =>
        input.database.updateTrackStatus({
          failureReason: input.failureReason,
          status: "failed",
          trackId: job.trackId,
          workspaceId: job.workspaceId,
        }),
      );
      break;
    }
    case QUEUE_NAMES.render: {
      const job = payload as RenderJobPayload;
      await markFailedIfStillLegal(() =>
        input.database.updateTrackStatus({
          failureReason: input.failureReason,
          status: "failed",
          trackId: job.trackId,
          workspaceId: job.workspaceId,
        }),
      );
      await markFailedIfStillLegal(() =>
        input.database.updateVideoRenderStatus({
          failureReason: input.failureReason,
          status: "failed",
          videoRenderId: job.videoRenderId,
          workspaceId: job.workspaceId,
        }),
      );
      break;
    }
    case QUEUE_NAMES.youtubeUpload: {
      const job = payload as YoutubeUploadJobPayload;
      await markFailedIfStillLegal(() =>
        input.database.updateYoutubeUploadStatus({
          failureReason: input.failureReason,
          status: "failed",
          workspaceId: job.workspaceId,
          youtubeUploadId: job.youtubeUploadId,
        }),
      );
      break;
    }
  }
}

/**
 * A row may legally refuse the "failed" write when the user already moved it
 * on (e.g. cancelled the request or deleted the row) between the job failing
 * and this cleanup. That must not block acking the queue message.
 */
async function markFailedIfStillLegal(write: () => Promise<void>) {
  try {
    await write();
  } catch (error) {
    if (
      error instanceof InvalidStatusTransitionError ||
      error instanceof StaleStatusError ||
      error instanceof StatusRowNotFoundError
    ) {
      return;
    }

    throw error;
  }
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }

    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
}

if (isMainModule()) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

function isMainModule() {
  if (!process.argv[1]) {
    return false;
  }

  return import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
}
