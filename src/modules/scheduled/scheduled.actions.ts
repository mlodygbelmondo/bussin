"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isMockMode } from "@/lib/app-config";
import { createWorkspaceClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import type { ScheduledActionResult } from "@/modules/scheduled/scheduled.types";
import { enqueueWorkerQueueJob } from "@/server/services/worker-queue.service";
import {
  cancelScheduledUpload,
  normalizeFutureSchedule,
  publishScheduledUploadNow,
  rescheduleUpload,
  type ScheduledUploadRepository,
} from "@/modules/scheduled/scheduled.service";

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

export async function rescheduleUploadAction(
  formData: FormData,
): Promise<ScheduledActionResult> {
  if (isMockMode) {
    return { message: "Mock upload rescheduled.", ok: true };
  }

  const { repository, userId, workspaceId } = await requireScheduledContext();

  try {
    const result = await rescheduleUpload({
      repository,
      scheduledAt: normalizeFutureSchedule(formData.get("scheduled_at")),
      uploadId: readUploadId(formData),
      userId,
      workspaceId,
    });

    if (result.ok) {
      revalidateScheduled();
    }

    return result;
  } catch (error) {
    return actionError(error, "Could not reschedule this upload.");
  }
}

export async function cancelScheduledUploadAction(
  formData: FormData,
): Promise<ScheduledActionResult> {
  if (isMockMode) {
    return { message: "Mock upload canceled.", ok: true };
  }

  const { repository, userId, workspaceId } = await requireScheduledContext();

  try {
    const result = await cancelScheduledUpload({
      repository,
      uploadId: readUploadId(formData),
      userId,
      workspaceId,
    });

    if (result.ok) {
      revalidateScheduled();
    }

    return result;
  } catch (error) {
    return actionError(error, "Could not cancel this upload.");
  }
}

export async function publishScheduledUploadNowAction(
  formData: FormData,
): Promise<ScheduledActionResult> {
  if (isMockMode) {
    return { message: "Mock upload queued for publishing.", ok: true };
  }

  const { repository, userId, workspaceId } = await requireScheduledContext();

  try {
    const result = await publishScheduledUploadNow({
      repository,
      uploadId: readUploadId(formData),
      userId,
      workspaceId,
    });

    if (result.ok) {
      revalidateScheduled();
    }

    return result;
  } catch (error) {
    return actionError(error, "Could not publish this upload.");
  }
}

async function requireScheduledContext() {
  const supabase = await createWorkspaceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    redirect("/onboarding");
  }

  return {
    repository: createScheduledRepository(supabase),
    userId: user.id,
    workspaceId: data.workspace_id,
  };
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

function readUploadId(formData: FormData) {
  return String(formData.get("uploadId") ?? "");
}

function revalidateScheduled() {
  revalidatePath("/dashboard/scheduled");
  revalidatePath("/dashboard");
}

function actionError(error: unknown, fallback: string): ScheduledActionResult {
  return {
    message: error instanceof Error ? error.message : fallback,
    ok: false,
  };
}
