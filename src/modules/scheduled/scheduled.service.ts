import type { ScheduledActionResult } from "@/modules/scheduled/scheduled.types";

export type ScheduledUploadRecord = {
  id: string;
  scheduled_at: string | null;
  status: string;
  track_id: string | null;
  video_render_id: string | null;
  workspace_id: string;
};

export type ScheduledUploadRepository = {
  createAuditLog(input: {
    action: string;
    entity_id: string;
    entity_type: "youtube_upload";
    metadata: Record<string, string | null>;
    user_id: string;
    workspace_id: string;
  }): Promise<unknown>;
  enqueueYoutubeUploadJob(input: {
    trackId: string;
    videoRenderId: string;
    workspaceId: string;
    youtubeUploadId: string;
  }): Promise<void>;
  getUpload(input: {
    uploadId: string;
    workspaceId: string;
  }): Promise<ScheduledUploadRecord | null>;
  publishUploadNow(input: {
    uploadId: string;
    userId: string;
    workspaceId: string;
  }): Promise<ScheduledUploadRecord | null>;
  updateUpload(input: {
    allowedStatuses?: string[];
    uploadId: string;
    values: {
      failure_reason?: string | null;
      scheduled_at?: string | null;
      status?: string;
    };
    workspaceId: string;
  }): Promise<ScheduledUploadRecord | null>;
};

export async function rescheduleUpload(input: {
  repository: ScheduledUploadRepository;
  scheduledAt: string | null;
  uploadId: string;
  userId: string;
  workspaceId: string;
}): Promise<ScheduledActionResult> {
  if (!input.uploadId) {
    return { message: "Missing upload id.", ok: false };
  }

  if (!input.scheduledAt) {
    return { message: "Choose a future schedule time.", ok: false };
  }

  const existing = await input.repository.getUpload({
    uploadId: input.uploadId,
    workspaceId: input.workspaceId,
  });

  if (!existing) {
    return { message: "Scheduled upload was not found.", ok: false };
  }

  if (!canReschedule(existing.status)) {
    return {
      message: "Only queued, scheduled, or failed uploads can be rescheduled.",
      ok: false,
    };
  }

  const upload = await input.repository.updateUpload({
    allowedStatuses: ["draft", "failed", "scheduled"],
    uploadId: input.uploadId,
    values: {
      failure_reason: null,
      scheduled_at: input.scheduledAt,
      status: "scheduled",
    },
    workspaceId: input.workspaceId,
  });

  if (!upload) {
    return {
      message: "Upload changed before it could be rescheduled.",
      ok: false,
    };
  }

  await createBestEffortAuditLog(input.repository, {
    action: "upload.rescheduled",
    entity_id: input.uploadId,
    entity_type: "youtube_upload",
    metadata: { scheduled_at: input.scheduledAt },
    user_id: input.userId,
    workspace_id: input.workspaceId,
  });

  return { message: "Upload rescheduled.", ok: true };
}

export async function cancelScheduledUpload(input: {
  repository: ScheduledUploadRepository;
  uploadId: string;
  userId: string;
  workspaceId: string;
}): Promise<ScheduledActionResult> {
  if (!input.uploadId) {
    return { message: "Missing upload id.", ok: false };
  }

  const existing = await input.repository.getUpload({
    uploadId: input.uploadId,
    workspaceId: input.workspaceId,
  });

  if (!existing) {
    return { message: "Scheduled upload was not found.", ok: false };
  }

  if (!canCancel(existing.status)) {
    return {
      message: "Only queued or scheduled uploads can be canceled.",
      ok: false,
    };
  }

  const upload = await input.repository.updateUpload({
    allowedStatuses: ["draft", "scheduled"],
    uploadId: input.uploadId,
    values: { status: "cancelled" },
    workspaceId: input.workspaceId,
  });

  if (!upload) {
    return {
      message: "Upload changed before it could be canceled.",
      ok: false,
    };
  }

  await createBestEffortAuditLog(input.repository, {
    action: "upload.cancelled",
    entity_id: input.uploadId,
    entity_type: "youtube_upload",
    metadata: {},
    user_id: input.userId,
    workspace_id: input.workspaceId,
  });

  return { message: "Upload canceled.", ok: true };
}

export async function publishScheduledUploadNow(input: {
  repository: ScheduledUploadRepository;
  uploadId: string;
  userId: string;
  workspaceId: string;
}): Promise<ScheduledActionResult> {
  if (!input.uploadId) {
    return { message: "Missing upload id.", ok: false };
  }

  const existing = await input.repository.getUpload({
    uploadId: input.uploadId,
    workspaceId: input.workspaceId,
  });

  if (!existing) {
    return { message: "Scheduled upload was not found.", ok: false };
  }

  if (!existing.track_id || !existing.video_render_id) {
    return {
      message: "This upload is missing a track or rendered video.",
      ok: false,
    };
  }

  if (!canPublishNow(existing.status)) {
    return {
      message: "Only queued or scheduled uploads can be published now.",
      ok: false,
    };
  }

  const upload = await input.repository.publishUploadNow({
    uploadId: input.uploadId,
    userId: input.userId,
    workspaceId: input.workspaceId,
  });

  if (!upload) {
    return {
      message: "Upload changed before it could be published.",
      ok: false,
    };
  }

  return { message: "Publishing job queued.", ok: true };
}

export function normalizeFutureSchedule(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
    return null;
  }

  return date.toISOString();
}

function canReschedule(status: string) {
  return ["draft", "failed", "scheduled"].includes(status);
}

function canCancel(status: string) {
  return ["draft", "scheduled"].includes(status);
}

function canPublishNow(status: string) {
  return ["draft", "scheduled"].includes(status);
}

async function createBestEffortAuditLog(
  repository: ScheduledUploadRepository,
  input: Parameters<ScheduledUploadRepository["createAuditLog"]>[0],
) {
  try {
    await repository.createAuditLog(input);
  } catch {
    // Audit logging must not make an already-applied upload action look failed.
  }
}
