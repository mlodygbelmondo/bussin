import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { ScheduledUploadRepository } from "@/server/services/scheduled-upload.service";
import {
  selectMaybeSingle,
  throwOnError,
} from "@/server/services/supabase-query";
import { enqueueWorkerQueueJob } from "@/server/services/worker-queue.service";

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

export function createScheduledUploadRepository(
  supabase: Supabase,
): ScheduledUploadRepository {
  return {
    async createAuditLog(input) {
      await throwOnError(supabase.from("audit_logs").insert(input));
    },
    async enqueueYoutubeUploadJob(input) {
      await enqueueWorkerQueueJob({
        message: input,
        queueName: "youtube-upload-jobs",
      });
    },
    async publishUploadNow(input) {
      const data = await selectMaybeSingle(
        (supabase as QueueRpcClient).rpc("publish_youtube_upload_now", {
          acting_user_id: input.userId,
          target_upload_id: input.uploadId,
          target_workspace_id: input.workspaceId,
        }),
      );

      return data?.[0] ?? null;
    },
    async getUpload(input) {
      return selectMaybeSingle(
        supabase
          .from("youtube_uploads")
          .select(
            "id, workspace_id, track_id, video_render_id, scheduled_at, status",
          )
          .eq("workspace_id", input.workspaceId)
          .eq("id", input.uploadId)
          .maybeSingle(),
      );
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

      return selectMaybeSingle(
        query
          .select(
            "id, workspace_id, track_id, video_render_id, scheduled_at, status",
          )
          .maybeSingle(),
      );
    },
  };
}
