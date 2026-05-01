import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";
import type { AuditLogAction } from "@/server/services/audit-log.service";
import { ServiceError } from "@/server/services/service-error";
import { assertStatusTransition } from "@/server/services/status-transition.service";

export type Track = Partial<Tables<"tracks">> & {
  id: string;
  workspace_id: string;
  status: string;
};

export type TrackRepository = {
  createAuditLog(input: {
    workspace_id: string;
    user_id?: string | null;
    action: AuditLogAction;
    entity_type?: string | null;
    entity_id?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<unknown>;
  createVideoRender(
    input: TablesInsert<"video_renders">,
  ): Promise<Partial<Tables<"video_renders">> & { status: string }>;
  getTrackById(input: {
    workspaceId: string;
    trackId: string;
  }): Promise<Track | null>;
  listTracks(workspaceId: string): Promise<Track[]>;
  updateTrack(input: {
    trackId: string;
    values: TablesUpdate<"tracks">;
  }): Promise<Track>;
};

export function createTrackService(input: { repository: TrackRepository }) {
  return {
    async getByIdWithWorkspaceGuard(params: {
      workspaceId: string;
      trackId: string;
    }) {
      const track = await input.repository.getTrackById(params);

      if (!track || track.workspace_id !== params.workspaceId) {
        throw new ServiceError("NOT_FOUND", "Track not found.");
      }

      return track;
    },
    listTracks(workspaceId: string) {
      return input.repository.listTracks(workspaceId);
    },
    async updateStatus(params: {
      workspaceId: string;
      trackId: string;
      status: string;
      failureReason?: string | null;
    }) {
      const track = await this.getByIdWithWorkspaceGuard(params);
      assertStatusTransition("tracks", track.status, params.status);

      return input.repository.updateTrack({
        trackId: params.trackId,
        values: {
          status: params.status,
          failure_reason: params.failureReason,
        },
      });
    },
    saveSunoId(params: { trackId: string; sunoTrackId: string }) {
      return input.repository.updateTrack({
        trackId: params.trackId,
        values: { suno_track_id: params.sunoTrackId },
      });
    },
    saveAudioPath(params: {
      trackId: string;
      audioStoragePath: string;
      sourceAudioUrl?: string | null;
    }) {
      return input.repository.updateTrack({
        trackId: params.trackId,
        values: {
          audio_storage_path: params.audioStoragePath,
          source_audio_url: params.sourceAudioUrl,
        },
      });
    },
    async approveTrack(params: {
      workspaceId: string;
      trackId: string;
      userId: string;
    }) {
      const track = await this.getByIdWithWorkspaceGuard(params);
      assertStatusTransition("tracks", track.status, "approved");

      const updatedTrack = await input.repository.updateTrack({
        trackId: params.trackId,
        values: { status: "approved" },
      });
      const render = await input.repository.createVideoRender({
        workspace_id: params.workspaceId,
        track_id: params.trackId,
        status: "queued",
      });

      await input.repository.createAuditLog({
        workspace_id: params.workspaceId,
        user_id: params.userId,
        action: "track.approved",
        entity_type: "track",
        entity_id: params.trackId,
      });

      return { render, track: updatedTrack };
    },
    async rejectTrack(params: {
      workspaceId: string;
      trackId: string;
      userId: string;
    }) {
      const track = await this.updateStatus({
        ...params,
        status: "rejected",
      });

      await input.repository.createAuditLog({
        workspace_id: params.workspaceId,
        user_id: params.userId,
        action: "track.rejected",
        entity_type: "track",
        entity_id: params.trackId,
      });

      return track;
    },
  };
}
