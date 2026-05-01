import type { QueueClient } from "../queue/queue-client";
import { enqueueYoutubeUploadJob } from "../queue/queue-client";
import type { WorkerDatabaseService } from "../services/database";

export async function dispatchScheduledPublishJobs(input: {
  database: WorkerDatabaseService;
  queue: QueueClient;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const uploads = await input.database.listScheduledYoutubeUploads();
  let enqueued = 0;

  for (const upload of uploads) {
    if (new Date(upload.scheduledAt).getTime() > now.getTime()) {
      continue;
    }

    await input.database.markYoutubeUploadDispatching({
      workspaceId: upload.workspaceId,
      youtubeUploadId: upload.id,
    });
    await enqueueYoutubeUploadJob(input.queue, {
      trackId: upload.trackId,
      videoRenderId: upload.videoRenderId,
      workspaceId: upload.workspaceId,
      youtubeUploadId: upload.id,
    });
    enqueued += 1;
  }

  return { enqueued };
}
