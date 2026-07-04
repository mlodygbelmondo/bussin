"use server";

import { z } from "zod";
import { runFeedAction } from "@/modules/feed/feed-action";
import type { FeedActionResult } from "@/modules/feed/feed.types";
import { createScheduledUploadRepository } from "@/server/services/scheduled-upload.repository";
import {
  cancelScheduledUpload,
  normalizeFutureSchedule,
  publishScheduledUploadNow,
  rescheduleUpload,
} from "@/server/services/scheduled-upload.service";

const uploadIdSchema = z.object({
  uploadId: z.string(),
});

const rescheduleSchema = uploadIdSchema.extend({
  scheduled_at: z.string(),
});

const readUploadIdValues = (form: FormData) => ({
  uploadId: String(form.get("uploadId") ?? ""),
});

export async function rescheduleUploadAction(
  formData: FormData,
): Promise<FeedActionResult> {
  return runFeedAction({
    errorFallback: "Could not reschedule this upload.",
    formData,
    mockMessage: "Mock upload rescheduled.",
    run: ({ ctx, input }) =>
      rescheduleUpload({
        repository: createScheduledUploadRepository(ctx.supabase),
        scheduledAt: normalizeFutureSchedule(input.scheduled_at),
        uploadId: input.uploadId,
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
      }),
    schema: rescheduleSchema,
    values: (form) => ({
      ...readUploadIdValues(form),
      scheduled_at: String(form.get("scheduled_at") ?? ""),
    }),
  });
}

export async function cancelScheduledUploadAction(
  formData: FormData,
): Promise<FeedActionResult> {
  return runFeedAction({
    errorFallback: "Could not cancel this upload.",
    formData,
    mockMessage: "Mock upload canceled.",
    run: ({ ctx, input }) =>
      cancelScheduledUpload({
        repository: createScheduledUploadRepository(ctx.supabase),
        uploadId: input.uploadId,
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
      }),
    schema: uploadIdSchema,
    values: readUploadIdValues,
  });
}

export async function publishScheduledUploadNowAction(
  formData: FormData,
): Promise<FeedActionResult> {
  return runFeedAction({
    errorFallback: "Could not publish this upload.",
    formData,
    mockMessage: "Mock upload queued for publishing.",
    run: ({ ctx, input }) =>
      publishScheduledUploadNow({
        repository: createScheduledUploadRepository(ctx.supabase),
        uploadId: input.uploadId,
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
      }),
    schema: uploadIdSchema,
    values: readUploadIdValues,
  });
}
