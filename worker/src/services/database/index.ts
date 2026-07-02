import type { SupabaseClient } from "@supabase/supabase-js";

export type GenerationContext = {
  finalPrompt: string;
  existingSunoTrackId?: string | null;
  requestStatus: string;
  title: string;
};

export type SunoConnectionContext = {
  connectionId: string;
  encryptedApiUrl: string;
  encryptedCookie: string;
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
  getSunoConnection(workspaceId: string): Promise<SunoConnectionContext | null>;
  markSunoConnectionError(input: {
    workspaceId: string;
    connectionId: string;
    lastError: string;
  }): Promise<void>;
  getYoutubeUploadContext(input: {
    workspaceId: string;
    youtubeUploadId: string;
  }): Promise<YoutubeUploadContext>;
  incrementUploadedVideosUsage(workspaceId: string): Promise<void>;
  reserveUploadedVideosUsage(workspaceId: string): Promise<void>;
  listConnectedSunoConnections(): Promise<
    Array<{ connectionId: string; workspaceId: string }>
  >;
  listStaleTempObjects(olderThanDays: number): Promise<string[]>;
  recoverStaleJobs(staleMinutes: number): Promise<{
    staleTracks: number;
    staleRenders: number;
    staleUploads: number;
  }>;
  updateSunoConnectionLimits(input: {
    connectionId: string;
    workspaceId: string;
    creditsLeft: number | null;
    monthlyLimit: number | null;
    monthlyUsage: number | null;
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

export class WorkerPlanLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkerPlanLimitError";
  }
}

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
    async getSunoConnection(workspaceId) {
      const connection = await selectMaybeSingle<{
        id: string;
        encrypted_api_url: string | null;
        encrypted_cookie: string | null;
      }>(
        client
          .from("suno_connections")
          .select("id, encrypted_api_url, encrypted_cookie")
          .eq("workspace_id", workspaceId)
          .eq("status", "connected")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      );

      if (!connection?.encrypted_api_url || !connection.encrypted_cookie) {
        return null;
      }

      return {
        connectionId: connection.id,
        encryptedApiUrl: connection.encrypted_api_url,
        encryptedCookie: connection.encrypted_cookie,
      };
    },
    async markSunoConnectionError(input) {
      await throwOnError(
        client
          .from("suno_connections")
          .update({
            last_checked_at: new Date().toISOString(),
            last_error: input.lastError,
            status: "error",
          })
          .eq("workspace_id", input.workspaceId)
          .eq("id", input.connectionId),
      );
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

      await throwOnError(
        client.rpc("increment_usage_counter", {
          target_period_end: periodEnd,
          target_period_start: periodStart,
          target_workspace_id: workspaceId,
          uploaded_videos_delta: 1,
        }),
      );
    },
    async reserveUploadedVideosUsage(workspaceId) {
      const { periodEnd, periodStart } = currentMonthlyPeriod();
      const { data, error } = await client.rpc(
        "reserve_monthly_upload_capacity",
        {
          target_period_end: periodEnd,
          target_period_start: periodStart,
          target_workspace_id: workspaceId,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      const result = data as { allowed?: boolean; reason?: string | null };

      if (!result.allowed) {
        throw new WorkerPlanLimitError(
          result.reason ?? "Monthly upload limit reached.",
        );
      }
    },
    async listConnectedSunoConnections() {
      const { data, error } = await client
        .from("suno_connections")
        .select("id, workspace_id")
        .eq("status", "connected");

      if (error) {
        throw new Error(error.message);
      }

      const rows = (data ?? []) as Array<{ id: string; workspace_id: string }>;

      return rows.map((row) => ({
        connectionId: row.id,
        workspaceId: row.workspace_id,
      }));
    },
    async listStaleTempObjects(olderThanDays) {
      const { data, error } = await client.rpc("list_stale_temp_objects", {
        older_than_days: olderThanDays,
      });

      if (error) {
        throw new Error(error.message);
      }

      const rows = (data ?? []) as Array<{ name: string }>;

      return rows.map((row) => row.name);
    },
    async recoverStaleJobs(staleMinutes) {
      const { data, error } = await client.rpc("recover_stale_jobs", {
        stale_minutes: staleMinutes,
      });

      if (error) {
        throw new Error(error.message);
      }

      const counts = (data ?? {}) as Partial<{
        staleTracks: number;
        staleRenders: number;
        staleUploads: number;
      }>;

      return {
        staleRenders: counts.staleRenders ?? 0,
        staleTracks: counts.staleTracks ?? 0,
        staleUploads: counts.staleUploads ?? 0,
      };
    },
    async updateSunoConnectionLimits(input) {
      await throwOnError(
        client
          .from("suno_connections")
          .update({
            credits_left: input.creditsLeft,
            last_checked_at: new Date().toISOString(),
            last_error: null,
            monthly_limit: input.monthlyLimit,
            monthly_usage: input.monthlyUsage,
          })
          .eq("workspace_id", input.workspaceId)
          .eq("id", input.connectionId),
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
  rpc(
    functionName: string,
    args?: Record<string, unknown>,
  ): Promise<QueryResponse<unknown>>;
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
