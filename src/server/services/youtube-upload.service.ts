import type { Tables, TablesInsert } from "@/lib/database.types";
import type { AuditLogAction } from "@/server/services/audit-log.service";
import {
  scheduleYoutubeUploadSchema,
  type ScheduleYoutubeUploadInput,
} from "@/server/validators/youtube-upload.validator";

export type YoutubeUpload = Partial<Tables<"youtube_uploads">> & {
  id: string;
  workspace_id: string;
  status: string;
};

export type YoutubeUploadRepository = {
  createYoutubeUpload(
    input: TablesInsert<"youtube_uploads">,
  ): Promise<YoutubeUpload>;
  createAuditLog(input: {
    workspace_id: string;
    user_id?: string | null;
    action: AuditLogAction;
    entity_type?: string | null;
    entity_id?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<unknown>;
};

export function createYoutubeUploadService(input: {
  repository: YoutubeUploadRepository;
}) {
  return {
    async scheduleUpload(params: {
      workspaceId: string;
      userId: string;
      input: ScheduleYoutubeUploadInput;
    }) {
      const parsed = scheduleYoutubeUploadSchema.parse(params.input);
      const upload = await input.repository.createYoutubeUpload({
        workspace_id: params.workspaceId,
        track_id: parsed.track_id,
        video_render_id: parsed.video_render_id,
        youtube_channel_id: parsed.youtube_channel_id,
        title: parsed.title,
        description: parsed.description,
        tags: parsed.tags,
        privacy_status: parsed.privacy_status,
        scheduled_at: parsed.scheduled_at,
        status: "scheduled",
      });

      await input.repository.createAuditLog({
        workspace_id: params.workspaceId,
        user_id: params.userId,
        action: "upload.scheduled",
        entity_type: "youtube_upload",
        entity_id: upload.id,
        metadata: { scheduled_at: parsed.scheduled_at },
      });

      return upload;
    },
  };
}
