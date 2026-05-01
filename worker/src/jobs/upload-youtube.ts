import {
  QUEUE_NAMES,
  type YoutubeUploadJobPayload,
  parseQueuePayload,
} from "../queue/queue-types";
import type { WorkerDatabaseService } from "../services/database";
import type { WorkerStorageService } from "../services/storage";
import type { YoutubeService } from "../services/youtube";

export async function uploadYoutubeJob(
  rawPayload: YoutubeUploadJobPayload,
  services: {
    database: WorkerDatabaseService;
    storage: WorkerStorageService;
    youtube: YoutubeService;
  },
) {
  const payload = parseQueuePayload(QUEUE_NAMES.youtubeUpload, rawPayload);

  await services.database.updateYoutubeUploadStatus({
    status: "uploading",
    workspaceId: payload.workspaceId,
    youtubeUploadId: payload.youtubeUploadId,
  });

  const context = await services.database.getYoutubeUploadContext({
    workspaceId: payload.workspaceId,
    youtubeUploadId: payload.youtubeUploadId,
  });

  if (context.youtubeVideoId) {
    await services.database.updateYoutubeUploadStatus({
      status: "uploaded",
      workspaceId: payload.workspaceId,
      youtubeUploadId: payload.youtubeUploadId,
    });
    return { skipped: true, youtubeVideoId: context.youtubeVideoId };
  }

  const video = await services.storage.downloadVideo(context.videoStoragePath);
  const upload = await services.youtube.uploadVideo({
    description: context.description,
    encryptedAccessToken: context.encryptedAccessToken,
    encryptedRefreshToken: context.encryptedRefreshToken,
    privacyStatus: context.privacyStatus,
    tags: context.tags,
    title: context.title,
    tokenExpiresAt: context.tokenExpiresAt,
    video,
    workspaceId: payload.workspaceId,
    youtubeChannelId: context.youtubeChannelId,
  });

  await services.database.saveYoutubeVideoId({
    workspaceId: payload.workspaceId,
    youtubeUploadId: payload.youtubeUploadId,
    youtubeVideoId: upload.youtubeVideoId,
  });
  await services.database.updateYoutubeUploadStatus({
    status: "uploaded",
    workspaceId: payload.workspaceId,
    youtubeUploadId: payload.youtubeUploadId,
  });
  await services.database.updateTrackStatus({
    status: "uploaded",
    trackId: payload.trackId,
    workspaceId: payload.workspaceId,
  });
  await services.database.incrementUploadedVideosUsage(payload.workspaceId);
  await services.database.createAuditLog({
    action: "upload.uploaded",
    entityId: payload.youtubeUploadId,
    entityType: "youtube_upload",
    metadata: { youtube_video_id: upload.youtubeVideoId },
    workspaceId: payload.workspaceId,
  });

  return { skipped: false, youtubeVideoId: upload.youtubeVideoId };
}
