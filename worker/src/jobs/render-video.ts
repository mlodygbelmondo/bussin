import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import type { QueueClient } from "../queue/queue-client";
import { enqueueYoutubeUploadJob } from "../queue/queue-client";
import {
  QUEUE_NAMES,
  type RenderJobPayload,
  parseQueuePayload,
} from "../queue/queue-types";
import type { WorkerDatabaseService } from "../services/database";
import type { FfmpegService } from "../services/ffmpeg";
import type { WorkerStorageService } from "../services/storage";

export async function renderVideoJob(
  rawPayload: RenderJobPayload,
  services: {
    database: WorkerDatabaseService;
    ffmpeg: FfmpegService;
    queue: QueueClient;
    storage: WorkerStorageService;
  },
) {
  const payload = parseQueuePayload(QUEUE_NAMES.render, rawPayload);

  await services.database.updateTrackStatus({
    status: "rendering",
    trackId: payload.trackId,
    workspaceId: payload.workspaceId,
  });
  await services.database.updateVideoRenderStatus({
    status: "running",
    videoRenderId: payload.videoRenderId,
    workspaceId: payload.workspaceId,
  });

  const context = await services.database.getRenderContext(payload);
  // FFmpeg reads local files, so stage the storage objects in the temp dir
  // for the duration of the render.
  const audioInput = join(
    tmpdir(),
    `render-${payload.videoRenderId}-audio.mp3`,
  );
  const imageInput = context.imageStoragePath
    ? join(
        tmpdir(),
        `render-${payload.videoRenderId}-cover${
          extname(context.imageStoragePath) || ".png"
        }`,
      )
    : null;

  let render: Awaited<ReturnType<FfmpegService["renderVideo"]>>;

  try {
    await writeFile(
      audioInput,
      await services.storage.downloadAudio(context.audioStoragePath),
    );

    if (imageInput && context.imageStoragePath) {
      await writeFile(
        imageInput,
        await services.storage.downloadImage(context.imageStoragePath),
      );
    }

    render = await services.ffmpeg.renderVideo({
      audioInput,
      imageInput,
      trackId: payload.trackId,
      videoRenderId: payload.videoRenderId,
      workspaceId: payload.workspaceId,
    });
  } finally {
    await Promise.all(
      [audioInput, imageInput]
        .filter((path): path is string => Boolean(path))
        .map((path) => rm(path, { force: true }).catch(() => undefined)),
    );
  }
  const videoStoragePath = await services.storage.uploadVideo({
    trackId: payload.trackId,
    video: render.video,
    videoRenderId: payload.videoRenderId,
    workspaceId: payload.workspaceId,
  });

  await services.database.saveVideoRenderOutput({
    videoRenderId: payload.videoRenderId,
    videoStoragePath,
    workspaceId: payload.workspaceId,
  });
  await services.database.updateVideoRenderStatus({
    status: "rendered",
    videoRenderId: payload.videoRenderId,
    workspaceId: payload.workspaceId,
  });
  await services.database.updateTrackStatus({
    status: "rendered",
    trackId: payload.trackId,
    workspaceId: payload.workspaceId,
  });

  if (context.publishNow && context.youtubeUploadId) {
    await enqueueYoutubeUploadJob(services.queue, {
      trackId: payload.trackId,
      videoRenderId: payload.videoRenderId,
      workspaceId: payload.workspaceId,
      youtubeUploadId: context.youtubeUploadId,
    });
  }
}
