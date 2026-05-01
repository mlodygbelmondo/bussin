import type { SupabaseClient } from "@supabase/supabase-js";

export type GenerationContext = {
  finalPrompt: string;
  existingSunoTrackId?: string | null;
  requestStatus: string;
  title: string;
};

export type RenderContext = {
  audioStoragePath: string;
  imageStoragePath?: string | null;
  publishNow: boolean;
  youtubeUploadId?: string | null;
};

export type YoutubeUploadContext = {
  title: string;
  description?: string | null;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  tags?: string[] | null;
  privacyStatus: "private" | "unlisted" | "public";
  tokenExpiresAt?: string | null;
  videoStoragePath: string;
  youtubeChannelId: string;
  youtubeVideoId?: string | null;
};

export type ScheduledYoutubeUpload = {
  id: string;
  workspaceId: string;
  trackId: string;
  videoRenderId: string;
  scheduledAt: string;
};

export type WorkerDatabaseService = {
  createAuditLog(input: {
    workspaceId: string;
    userId?: string | null;
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
  getGenerationContext(input: {
    workspaceId: string;
    generationRequestId: string;
    trackId: string;
  }): Promise<GenerationContext>;
  getRenderContext(input: {
    workspaceId: string;
    trackId: string;
    videoRenderId: string;
  }): Promise<RenderContext>;
  getYoutubeUploadContext(input: {
    workspaceId: string;
    youtubeUploadId: string;
  }): Promise<YoutubeUploadContext>;
  incrementUploadedVideosUsage(workspaceId: string): Promise<void>;
  listScheduledYoutubeUploads(): Promise<ScheduledYoutubeUpload[]>;
  markYoutubeUploadDispatching(input: {
    workspaceId: string;
    youtubeUploadId: string;
  }): Promise<void>;
  saveSunoTrackId(input: {
    workspaceId: string;
    trackId: string;
    sunoTrackId: string;
  }): Promise<void>;
  saveTrackAudio(input: {
    workspaceId: string;
    trackId: string;
    audioStoragePath: string;
    sourceAudioUrl?: string | null;
  }): Promise<void>;
  saveVideoRenderOutput(input: {
    workspaceId: string;
    videoRenderId: string;
    videoStoragePath: string;
  }): Promise<void>;
  saveYoutubeVideoId(input: {
    workspaceId: string;
    youtubeUploadId: string;
    youtubeVideoId: string;
  }): Promise<void>;
  updateTrackStatus(input: {
    workspaceId: string;
    trackId: string;
    status: string;
    failureReason?: string | null;
  }): Promise<void>;
  updateVideoRenderStatus(input: {
    workspaceId: string;
    videoRenderId: string;
    status: string;
    failureReason?: string | null;
  }): Promise<void>;
  updateYoutubeUploadStatus(input: {
    workspaceId: string;
    youtubeUploadId: string;
    status: string;
    failureReason?: string | null;
  }): Promise<void>;
};

export function createWorkerDatabaseService(
  supabase: SupabaseClient,
): WorkerDatabaseService {
  const client = supabase as unknown as SupabaseDataClient;

  return {
    async createAuditLog(input) {
      await throwOnError(
        client.from("audit_logs").insert({
          action: input.action,
          entity_id: input.entityId,
          entity_type: input.entityType,
          metadata: input.metadata ?? {},
          user_id: input.userId,
          workspace_id: input.workspaceId,
        }),
      );
    },
    async getGenerationContext(input) {
      const request = await selectSingle<{
        final_prompt: string | null;
        status: string;
      }>(
        client
          .from("generation_requests")
          .select("final_prompt, status")
          .eq("workspace_id", input.workspaceId)
          .eq("id", input.generationRequestId)
          .single(),
      );
      const track = await selectSingle<{
        suno_track_id: string | null;
        title: string | null;
      }>(
        client
          .from("tracks")
          .select("title, suno_track_id")
          .eq("workspace_id", input.workspaceId)
          .eq("id", input.trackId)
          .single(),
      );

      if (!request.final_prompt) {
        throw new Error("Generation request is missing final_prompt.");
      }

      return {
        existingSunoTrackId: track.suno_track_id,
        finalPrompt: request.final_prompt,
        requestStatus: request.status,
        title: track.title ?? "Bussin track",
      };
    },
    async getRenderContext(input) {
      const track = await selectSingle<{
        audio_storage_path: string | null;
        image_asset_id: string | null;
      }>(
        client
          .from("tracks")
          .select("audio_storage_path, image_asset_id")
          .eq("workspace_id", input.workspaceId)
          .eq("id", input.trackId)
          .single(),
      );

      if (!track.audio_storage_path) {
        throw new Error("Track is missing audio_storage_path.");
      }

      let imageStoragePath: string | null = null;

      if (track.image_asset_id) {
        const image = await selectSingle<{ storage_path: string | null }>(
          client
            .from("image_assets")
            .select("storage_path")
            .eq("workspace_id", input.workspaceId)
            .eq("id", track.image_asset_id)
            .single(),
        );
        imageStoragePath = image.storage_path;
      }

      const upload = await selectMaybeSingle<{ id: string | null }>(
        client
          .from("youtube_uploads")
          .select("id")
          .eq("workspace_id", input.workspaceId)
          .eq("track_id", input.trackId)
          .eq("video_render_id", input.videoRenderId)
          .eq("status", "draft")
          .maybeSingle(),
      );

      return {
        audioStoragePath: track.audio_storage_path,
        imageStoragePath,
        publishNow: Boolean(upload?.id),
        youtubeUploadId: upload?.id ?? null,
      };
    },
    async getYoutubeUploadContext(input) {
      const upload = await selectSingle<{
        description: string | null;
        privacy_status: "private" | "unlisted" | "public";
        tags: string[] | null;
        title: string;
        video_render_id: string | null;
        youtube_channel_id: string | null;
        youtube_video_id: string | null;
      }>(
        client
          .from("youtube_uploads")
          .select(
            "title, description, tags, privacy_status, video_render_id, youtube_channel_id, youtube_video_id",
          )
          .eq("workspace_id", input.workspaceId)
          .eq("id", input.youtubeUploadId)
          .single(),
      );

      if (!upload.video_render_id || !upload.youtube_channel_id) {
        throw new Error("YouTube upload is missing render or channel details.");
      }

      const channel = await selectSingle<{
        youtube_channel_id: string;
        youtube_connection_id: string | null;
      }>(
        client
          .from("youtube_channels")
          .select("youtube_channel_id, youtube_connection_id")
          .eq("workspace_id", input.workspaceId)
          .eq("id", upload.youtube_channel_id)
          .single(),
      );

      if (!channel.youtube_connection_id) {
        throw new Error("YouTube channel is missing connection details.");
      }

      const connection = await selectSingle<{
        encrypted_access_token: string | null;
        encrypted_refresh_token: string | null;
        token_expires_at: string | null;
      }>(
        client
          .from("youtube_connections")
          .select(
            "encrypted_access_token, encrypted_refresh_token, token_expires_at",
          )
          .eq("workspace_id", input.workspaceId)
          .eq("id", channel.youtube_connection_id)
          .single(),
      );

      if (
        !connection.encrypted_access_token ||
        !connection.encrypted_refresh_token
      ) {
        throw new Error("YouTube connection is missing encrypted tokens.");
      }

      const render = await selectSingle<{ video_storage_path: string | null }>(
        client
          .from("video_renders")
          .select("video_storage_path")
          .eq("workspace_id", input.workspaceId)
          .eq("id", upload.video_render_id)
          .single(),
      );

      if (!render.video_storage_path) {
        throw new Error("Video render is missing video_storage_path.");
      }

      return {
        description: upload.description,
        encryptedAccessToken: connection.encrypted_access_token,
        encryptedRefreshToken: connection.encrypted_refresh_token,
        privacyStatus: upload.privacy_status,
        tags: upload.tags,
        title: upload.title,
        tokenExpiresAt: connection.token_expires_at,
        videoStoragePath: render.video_storage_path,
        youtubeChannelId: channel.youtube_channel_id,
        youtubeVideoId: upload.youtube_video_id,
      };
    },
    async incrementUploadedVideosUsage(workspaceId) {
      const { periodEnd, periodStart } = currentMonthlyPeriod();
      const existing = await selectMaybeSingle<{
        id: string;
        uploaded_videos_count: number;
      }>(
        client
          .from("usage_counters")
          .select("id, uploaded_videos_count")
          .eq("workspace_id", workspaceId)
          .eq("period_start", periodStart)
          .eq("period_end", periodEnd)
          .maybeSingle(),
      );

      if (existing) {
        await throwOnError(
          client
            .from("usage_counters")
            .update({
              uploaded_videos_count: existing.uploaded_videos_count + 1,
            })
            .eq("id", existing.id),
        );
        return;
      }

      await throwOnError(
        client.from("usage_counters").insert({
          period_end: periodEnd,
          period_start: periodStart,
          uploaded_videos_count: 1,
          workspace_id: workspaceId,
        }),
      );
    },
    async listScheduledYoutubeUploads() {
      const rows = await selectMany<{
        id: string;
        scheduled_at: string | null;
        track_id: string | null;
        video_render_id: string | null;
        workspace_id: string;
      }>(
        client
          .from("youtube_uploads")
          .select("id, workspace_id, track_id, video_render_id, scheduled_at")
          .eq("status", "scheduled")
          .order("scheduled_at", { ascending: true })
          .limit(100),
      );

      return rows
        .filter(
          (row) => row.scheduled_at && row.track_id && row.video_render_id,
        )
        .map((row) => ({
          id: row.id,
          scheduledAt: row.scheduled_at as string,
          trackId: row.track_id as string,
          videoRenderId: row.video_render_id as string,
          workspaceId: row.workspace_id,
        }));
    },
    async markYoutubeUploadDispatching(input) {
      await throwOnError(
        client
          .from("youtube_uploads")
          .update({ status: "uploading" })
          .eq("workspace_id", input.workspaceId)
          .eq("id", input.youtubeUploadId),
      );
    },
    async saveSunoTrackId(input) {
      await throwOnError(
        client
          .from("tracks")
          .update({ suno_track_id: input.sunoTrackId })
          .eq("workspace_id", input.workspaceId)
          .eq("id", input.trackId),
      );
    },
    async saveTrackAudio(input) {
      await throwOnError(
        client
          .from("tracks")
          .update({
            audio_storage_path: input.audioStoragePath,
            source_audio_url: input.sourceAudioUrl,
          })
          .eq("workspace_id", input.workspaceId)
          .eq("id", input.trackId),
      );
    },
    async saveVideoRenderOutput(input) {
      await throwOnError(
        client
          .from("video_renders")
          .update({ video_storage_path: input.videoStoragePath })
          .eq("workspace_id", input.workspaceId)
          .eq("id", input.videoRenderId),
      );
    },
    async saveYoutubeVideoId(input) {
      await throwOnError(
        client
          .from("youtube_uploads")
          .update({
            uploaded_at: new Date().toISOString(),
            youtube_video_id: input.youtubeVideoId,
          })
          .eq("workspace_id", input.workspaceId)
          .eq("id", input.youtubeUploadId),
      );
    },
    async updateTrackStatus(input) {
      await throwOnError(
        client
          .from("tracks")
          .update({
            failure_reason: input.failureReason,
            status: input.status,
          })
          .eq("workspace_id", input.workspaceId)
          .eq("id", input.trackId),
      );
    },
    async updateVideoRenderStatus(input) {
      await throwOnError(
        client
          .from("video_renders")
          .update({
            failure_reason: input.failureReason,
            finished_at: ["failed", "rendered", "completed"].includes(
              input.status,
            )
              ? new Date().toISOString()
              : undefined,
            started_at:
              input.status === "running" ? new Date().toISOString() : undefined,
            status: input.status,
          })
          .eq("workspace_id", input.workspaceId)
          .eq("id", input.videoRenderId),
      );
    },
    async updateYoutubeUploadStatus(input) {
      await throwOnError(
        client
          .from("youtube_uploads")
          .update({
            failure_reason: input.failureReason,
            status: input.status,
          })
          .eq("workspace_id", input.workspaceId)
          .eq("id", input.youtubeUploadId),
      );
    },
  };
}

async function selectSingle<T>(
  promise: Promise<QueryResponse<unknown>>,
): Promise<T> {
  const { data, error } = await promise;

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Expected one database row, found none.");
  }

  return data as T;
}

async function selectMaybeSingle<T>(
  promise: Promise<QueryResponse<unknown>>,
): Promise<T | null> {
  const { data, error } = await promise;

  if (error) {
    throw new Error(error.message);
  }

  return data as T | null;
}

async function selectMany<T>(promise: Promise<QueryResponse<unknown>>) {
  const { data, error } = await promise;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as T[];
}

async function throwOnError(promise: Promise<QueryResponse<unknown>>) {
  const { error } = await promise;

  if (error) {
    throw new Error(error.message);
  }
}

function currentMonthlyPeriod() {
  const now = new Date();
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );

  return {
    periodEnd: periodEnd.toISOString(),
    periodStart: periodStart.toISOString(),
  };
}

type QueryResponse<T> = {
  data: T | null;
  error: { message: string } | null;
};

type SupabaseDataClient = {
  from(table: string): SupabaseQueryBuilder;
};

type SupabaseQueryBuilder = Promise<QueryResponse<unknown>> & {
  eq(column: string, value: unknown): SupabaseQueryBuilder;
  insert(values: Record<string, unknown>): Promise<QueryResponse<unknown>>;
  limit(count: number): SupabaseQueryBuilder;
  maybeSingle(): Promise<QueryResponse<unknown | null>>;
  order(
    column: string,
    options?: { ascending?: boolean },
  ): SupabaseQueryBuilder;
  select(columns?: string): SupabaseQueryBuilder;
  single(): Promise<QueryResponse<unknown>>;
  update(values: Record<string, unknown>): SupabaseQueryBuilder;
};
