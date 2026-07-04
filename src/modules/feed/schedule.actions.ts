"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { runFeedAction } from "@/modules/feed/feed-action";
import type { FeedActionResult } from "@/modules/feed/feed.types";
import type { Database } from "@/lib/database.types";
import { enqueueWorkerQueueJob } from "@/server/services/worker-queue.service";
import {
  cancelScheduledUpload,
  normalizeFutureSchedule,
  publishScheduledUploadNow,
  rescheduleUpload,
  type ScheduledUploadRepository,
} from "@/server/services/scheduled-upload.service";

type Supabase = SupabaseClient<Database>;
type QueueRpcClient = Supabase & {
  rpc(
    fn: "publish_youtube_upload_now",
    args: {
      acting_user_id: string;
      target_upload_id: string;
      target_workspace_id: string;
    },
  ): Promise<{
    data:
      | {
          id: string;
          scheduled_at: string | null;
          status: string;
          track_id: string | null;
          video_render_id: string | null;
          workspace_id: string;
        }[]
      | null;
    error: { message: string } | null;
  }>;
};

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
        repository: createScheduledRepository(ctx.supabase),
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
        repository: createScheduledRepository(ctx.supabase),
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
        repository: createScheduledRepository(ctx.supabase),
        uploadId: input.uploadId,
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
      }),
    schema: uploadIdSchema,
    values: readUploadIdValues,
  });
}

function createScheduledRepository(
  supabase: Supabase,
): ScheduledUploadRepository {
  return {
    async createAuditLog(input) {
      const { error } = await supabase.from("audit_logs").insert(input);

      if (error) {
        throw new Error(error.message);
      }
    },
    async enqueueYoutubeUploadJob(input) {
      await enqueueWorkerQueueJob({
        message: input,
        queueName: "youtube-upload-jobs",
      });
    },
    async publishUploadNow(input) {
      const { data, error } = await (supabase as QueueRpcClient).rpc(
        "publish_youtube_upload_now",
        {
          acting_user_id: input.userId,
          target_upload_id: input.uploadId,
          target_workspace_id: input.workspaceId,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      return data?.[0] ?? null;
    },
    async getUpload(input) {
      const { data, error } = await supabase
        .from("youtube_uploads")
        .select(
          "id, workspace_id, track_id, video_render_id, scheduled_at, status",
        )
        .eq("workspace_id", input.workspaceId)
        .eq("id", input.uploadId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    async updateUpload(input) {
      let query = supabase
        .from("youtube_uploads")
        .update(input.values)
        .eq("workspace_id", input.workspaceId)
        .eq("id", input.uploadId);

      if (input.allowedStatuses?.length) {
        query = query.in("status", input.allowedStatuses);
      }

      const { data, error } = await query
        .select(
          "id, workspace_id, track_id, video_render_id, scheduled_at, status",
        )
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  };
}
