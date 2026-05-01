import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";
import { assertStatusTransition } from "@/server/services/status-transition.service";

export type VideoRender = Tables<"video_renders">;

export type VideoRenderRepository = {
  createVideoRender(input: TablesInsert<"video_renders">): Promise<VideoRender>;
  getVideoRenderById(input: {
    workspaceId: string;
    renderId: string;
  }): Promise<VideoRender | null>;
  updateVideoRender(input: {
    renderId: string;
    values: TablesUpdate<"video_renders">;
  }): Promise<VideoRender>;
};

export function createVideoRenderService(repository: VideoRenderRepository) {
  return {
    createQueuedRender(input: { workspaceId: string; trackId: string }) {
      return repository.createVideoRender({
        workspace_id: input.workspaceId,
        track_id: input.trackId,
        status: "queued",
      });
    },
    async updateStatus(input: {
      workspaceId: string;
      renderId: string;
      status: string;
      failureReason?: string | null;
      videoStoragePath?: string | null;
    }) {
      const render = await repository.getVideoRenderById(input);

      if (!render) {
        throw new Error("Video render not found.");
      }

      assertStatusTransition("video_renders", render.status, input.status);

      return repository.updateVideoRender({
        renderId: input.renderId,
        values: {
          status: input.status,
          failure_reason: input.failureReason,
          video_storage_path: input.videoStoragePath,
        },
      });
    },
  };
}
