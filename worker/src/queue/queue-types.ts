import { z } from "zod";

export const QUEUE_NAMES = {
  generation: "generation-jobs",
  sunoPolling: "suno-polling-jobs",
  render: "render-jobs",
  youtubeUpload: "youtube-upload-jobs",
  scheduledPublish: "scheduled-publish-jobs",
  maintenance: "maintenance-jobs",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const uuidSchema = z.string().uuid();

export const generationJobPayloadSchema = z
  .object({
    workspaceId: uuidSchema,
    generationRequestId: uuidSchema,
    trackId: uuidSchema,
  })
  .strict();

export const sunoPollingJobPayloadSchema = z
  .object({
    workspaceId: uuidSchema,
    trackId: uuidSchema,
    sunoTrackId: z.string().min(1),
    attempt: z.number().int().positive(),
  })
  .strict();

export const renderJobPayloadSchema = z
  .object({
    workspaceId: uuidSchema,
    trackId: uuidSchema,
    videoRenderId: uuidSchema,
  })
  .strict();

export const youtubeUploadJobPayloadSchema = z
  .object({
    workspaceId: uuidSchema,
    trackId: uuidSchema,
    videoRenderId: uuidSchema,
    youtubeUploadId: uuidSchema,
  })
  .strict();

export const scheduledPublishJobPayloadSchema = z
  .object({
    requestedAt: z.string().datetime().optional(),
  })
  .strict();

export const maintenanceJobPayloadSchema = z
  .object({
    task: z.enum([
      "stale-job-recovery",
      "sync-suno-limits",
      "cleanup-temp-assets",
    ]),
  })
  .strict();

const payloadSchemas = {
  [QUEUE_NAMES.generation]: generationJobPayloadSchema,
  [QUEUE_NAMES.sunoPolling]: sunoPollingJobPayloadSchema,
  [QUEUE_NAMES.render]: renderJobPayloadSchema,
  [QUEUE_NAMES.youtubeUpload]: youtubeUploadJobPayloadSchema,
  [QUEUE_NAMES.scheduledPublish]: scheduledPublishJobPayloadSchema,
  [QUEUE_NAMES.maintenance]: maintenanceJobPayloadSchema,
} as const;

export type GenerationJobPayload = z.infer<typeof generationJobPayloadSchema>;
export type SunoPollingJobPayload = z.infer<typeof sunoPollingJobPayloadSchema>;
export type RenderJobPayload = z.infer<typeof renderJobPayloadSchema>;
export type YoutubeUploadJobPayload = z.infer<
  typeof youtubeUploadJobPayloadSchema
>;
export type ScheduledPublishJobPayload = z.infer<
  typeof scheduledPublishJobPayloadSchema
>;
export type MaintenanceJobPayload = z.infer<typeof maintenanceJobPayloadSchema>;

export type QueuePayloadByName = {
  [QUEUE_NAMES.generation]: GenerationJobPayload;
  [QUEUE_NAMES.sunoPolling]: SunoPollingJobPayload;
  [QUEUE_NAMES.render]: RenderJobPayload;
  [QUEUE_NAMES.youtubeUpload]: YoutubeUploadJobPayload;
  [QUEUE_NAMES.scheduledPublish]: ScheduledPublishJobPayload;
  [QUEUE_NAMES.maintenance]: MaintenanceJobPayload;
};

export type QueuePayload = QueuePayloadByName[QueueName];

export class QueuePayloadError extends Error {
  constructor(
    public readonly queueName: QueueName,
    message: string,
  ) {
    super(message);
    this.name = "QueuePayloadError";
  }
}

export function parseQueuePayload<TQueueName extends QueueName>(
  queueName: TQueueName,
  payload: unknown,
): QueuePayloadByName[TQueueName] {
  const parsed = payloadSchemas[queueName].safeParse(payload);

  if (!parsed.success) {
    throw new QueuePayloadError(
      queueName,
      `Invalid ${queueName} payload: ${parsed.error.issues
        .map((issue) => issue.path.join(".") || issue.message)
        .join(", ")}`,
    );
  }

  return parsed.data as QueuePayloadByName[TQueueName];
}
