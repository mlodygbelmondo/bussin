"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, TablesInsert } from "@/lib/database.types";
import { isMockMode } from "@/lib/app-config";
import { createClient } from "@/lib/supabase/server";
import {
  createTrackService,
  type TrackRepository,
} from "@/server/services/track.service";
import { enqueueWorkerQueueJob } from "@/server/services/worker-queue.service";
import type { TrackActionResult } from "@/modules/tracks/track-preview.types";

type Supabase = SupabaseClient<Database>;
type ExistingYoutubeUpload = Pick<
  Database["public"]["Tables"]["youtube_uploads"]["Row"],
  "id" | "status"
>;

export async function approveTrackAction(
  formData: FormData,
): Promise<TrackActionResult> {
  if (isMockMode) {
    return { message: "Mock track approved. Render queued.", ok: true };
  }

  const trackId = readTrackId(formData);
  const { supabase, userId, workspaceId } = await requireWorkspace();

  try {
    const service = createTrackService({
      repository: createTrackRepository(supabase),
    });
    const result = await service.approveTrack({ trackId, userId, workspaceId });
    const videoRenderId = result.render.id;

    if (!videoRenderId) {
      throw new Error("Approval did not create a render job.");
    }

    await enqueueRender(supabase, { trackId, videoRenderId, workspaceId });
  } catch (error) {
    return actionError(error, "Could not approve this track.");
  }

  revalidateTrack(trackId);

  return { message: "Track approved. Render queued.", ok: true };
}

export async function rejectTrackAction(
  formData: FormData,
): Promise<TrackActionResult> {
  if (isMockMode) {
    return { message: "Mock track rejected.", ok: true };
  }

  const trackId = readTrackId(formData);
  const { supabase, userId, workspaceId } = await requireWorkspace();

  try {
    const service = createTrackService({
      repository: createTrackRepository(supabase),
    });

    await service.rejectTrack({ trackId, userId, workspaceId });
  } catch (error) {
    return actionError(error, "Could not reject this track.");
  }

  revalidateTrack(trackId);

  return { message: "Track rejected. Uploads are blocked.", ok: true };
}

export async function publishTrackNowAction(
  formData: FormData,
): Promise<TrackActionResult> {
  if (isMockMode) {
    return { message: "Mock publishing job queued.", ok: true };
  }

  const trackId = readTrackId(formData);
  const { supabase, userId, workspaceId } = await requireWorkspace();

  try {
    const context = await ensureRenderContext({
      supabase,
      trackId,
      userId,
      workspaceId,
    });

    if (!context.renderReady && !context.shouldEnqueueRender) {
      return {
        message:
          "This track is already rendering. Publish after the render finishes.",
        ok: false,
      };
    }

    const upload = await createOrReuseYoutubeUpload({
      scheduledAt: null,
      status: "draft",
      supabase,
      trackId,
      videoRenderId: context.videoRenderId,
      workspaceId,
    });

    if (upload.created) {
      await createAuditLog(supabase, {
        action: "upload.scheduled",
        entity_id: upload.id,
        entity_type: "youtube_upload",
        metadata: { mode: "publish_now" },
        user_id: userId,
        workspace_id: workspaceId,
      });
    }

    if (context.renderReady && upload.status === "draft") {
      await enqueueYoutubeUpload(supabase, {
        trackId,
        videoRenderId: context.videoRenderId,
        workspaceId,
        youtubeUploadId: upload.id,
      });
    } else if (context.shouldEnqueueRender && upload.status === "draft") {
      await enqueueRender(supabase, {
        trackId,
        videoRenderId: context.videoRenderId,
        workspaceId,
      });
    }
  } catch (error) {
    return actionError(error, "Could not queue publishing.");
  }

  revalidateTrack(trackId);

  return { message: "Publishing job queued.", ok: true };
}

export async function scheduleTrackAction(
  formData: FormData,
): Promise<TrackActionResult> {
  if (isMockMode) {
    return { message: "Mock upload scheduled.", ok: true };
  }

  const trackId = readTrackId(formData);
  const scheduledAt = normalizeSchedule(formData.get("scheduled_at"));
  const { supabase, userId, workspaceId } = await requireWorkspace();

  if (!scheduledAt) {
    return { message: "Choose a future schedule time.", ok: false };
  }

  try {
    const context = await ensureRenderContext({
      supabase,
      trackId,
      userId,
      workspaceId,
    });

    if (!context.renderReady) {
      if (context.shouldEnqueueRender) {
        await enqueueRender(supabase, {
          trackId,
          videoRenderId: context.videoRenderId,
          workspaceId,
        });
      }

      revalidateTrack(trackId);

      return {
        message:
          "Render queued. Schedule this track after the video is rendered.",
        ok: false,
      };
    }

    const upload = await createYoutubeUpload({
      scheduledAt,
      status: "scheduled",
      supabase,
      trackId,
      videoRenderId: context.videoRenderId,
      workspaceId,
    });

    await createAuditLog(supabase, {
      action: "upload.scheduled",
      entity_id: upload.id,
      entity_type: "youtube_upload",
      metadata: { scheduled_at: scheduledAt },
      user_id: userId,
      workspace_id: workspaceId,
    });
  } catch (error) {
    return actionError(error, "Could not schedule this track.");
  }

  revalidateTrack(trackId);

  return { message: "Upload scheduled.", ok: true };
}

async function ensureRenderContext(input: {
  supabase: Supabase;
  trackId: string;
  userId: string;
  workspaceId: string;
}) {
  const existing = await loadLatestRender(input.supabase, {
    trackId: input.trackId,
    workspaceId: input.workspaceId,
  });

  if (existing) {
    return {
      renderReady: ["completed", "rendered"].includes(existing.status),
      shouldEnqueueRender: false,
      videoRenderId: existing.id,
    };
  }

  const service = createTrackService({
    repository: createTrackRepository(input.supabase),
  });
  const result = await service.approveTrack({
    trackId: input.trackId,
    userId: input.userId,
    workspaceId: input.workspaceId,
  });
  const videoRenderId = result.render.id;

  if (!videoRenderId) {
    throw new Error("Could not create a render job.");
  }

  return { renderReady: false, shouldEnqueueRender: true, videoRenderId };
}

async function loadLatestRender(
  supabase: Supabase,
  input: { trackId: string; workspaceId: string },
) {
  const { data, error } = await supabase
    .from("video_renders")
    .select("id, status")
    .eq("workspace_id", input.workspaceId)
    .eq("track_id", input.trackId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function createOrReuseYoutubeUpload(input: {
  scheduledAt: string | null;
  status: "draft" | "scheduled";
  supabase: Supabase;
  trackId: string;
  videoRenderId: string;
  workspaceId: string;
}): Promise<ExistingYoutubeUpload & { created: boolean }> {
  const [track, channel, existing] = await Promise.all([
    loadTrackForUpload(input.supabase, input),
    loadDefaultChannel(input.supabase, input.workspaceId),
    loadActiveYoutubeUpload(input.supabase, input),
  ]);

  if (!channel) {
    throw new Error("Connect a YouTube channel before publishing.");
  }

  if (existing) {
    return { ...existing, created: false };
  }

  const { data, error } = await input.supabase
    .from("youtube_uploads")
    .insert({
      description: track.description,
      privacy_status: "private",
      scheduled_at: input.scheduledAt,
      status: input.status,
      tags: track.tags,
      title: track.title ?? "Bussin Track",
      track_id: input.trackId,
      video_render_id: input.videoRenderId,
      workspace_id: input.workspaceId,
      youtube_channel_id: channel.id,
    })
    .select("id, status")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { ...data, created: true };
}

async function createYoutubeUpload(input: {
  scheduledAt: string | null;
  status: "draft" | "scheduled";
  supabase: Supabase;
  trackId: string;
  videoRenderId: string;
  workspaceId: string;
}) {
  const [track, channel] = await Promise.all([
    loadTrackForUpload(input.supabase, input),
    loadDefaultChannel(input.supabase, input.workspaceId),
  ]);

  if (!channel) {
    throw new Error("Connect a YouTube channel before publishing.");
  }

  const { data, error } = await input.supabase
    .from("youtube_uploads")
    .insert({
      description: track.description,
      privacy_status: "private",
      scheduled_at: input.scheduledAt,
      status: input.status,
      tags: track.tags,
      title: track.title ?? "Bussin Track",
      track_id: input.trackId,
      video_render_id: input.videoRenderId,
      workspace_id: input.workspaceId,
      youtube_channel_id: channel.id,
    })
    .select("id, status")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function loadActiveYoutubeUpload(
  supabase: Supabase,
  input: { trackId: string; videoRenderId: string; workspaceId: string },
): Promise<ExistingYoutubeUpload | null> {
  const { data, error } = await supabase
    .from("youtube_uploads")
    .select("id, status")
    .eq("workspace_id", input.workspaceId)
    .eq("track_id", input.trackId)
    .eq("video_render_id", input.videoRenderId)
    .in("status", ["draft", "scheduled", "uploading"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function loadTrackForUpload(
  supabase: Supabase,
  input: { trackId: string; workspaceId: string },
) {
  const { data, error } = await supabase
    .from("tracks")
    .select("title, description, tags, status")
    .eq("workspace_id", input.workspaceId)
    .eq("id", input.trackId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.status === "rejected") {
    throw new Error("Rejected tracks cannot be published.");
  }

  return data;
}

async function loadDefaultChannel(supabase: Supabase, workspaceId: string) {
  const { data, error } = await supabase
    .from("youtube_channels")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("status", "connected")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function enqueueRender(
  _supabase: Supabase,
  message: { trackId: string; videoRenderId: string; workspaceId: string },
) {
  await enqueueWorkerQueueJob({ message, queueName: "render-jobs" });
}

async function enqueueYoutubeUpload(
  _supabase: Supabase,
  message: {
    trackId: string;
    videoRenderId: string;
    workspaceId: string;
    youtubeUploadId: string;
  },
) {
  await enqueueWorkerQueueJob({ message, queueName: "youtube-upload-jobs" });
}

async function requireWorkspace() {
  const supabase = await createClient();
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

  return { supabase, userId: user.id, workspaceId: data.workspace_id };
}

function createTrackRepository(supabase: Supabase): TrackRepository {
  return {
    async createAuditLog(input) {
      return createAuditLog(supabase, input);
    },
    async createVideoRender(input: TablesInsert<"video_renders">) {
      const { data, error } = await supabase
        .from("video_renders")
        .insert(input)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    async getTrackById(input) {
      const { data, error } = await supabase
        .from("tracks")
        .select("*")
        .eq("workspace_id", input.workspaceId)
        .eq("id", input.trackId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    async listTracks(workspaceId) {
      const { data, error } = await supabase
        .from("tracks")
        .select("*")
        .eq("workspace_id", workspaceId);

      if (error) {
        throw new Error(error.message);
      }

      return data ?? [];
    },
    async updateTrack(input) {
      const { data, error } = await supabase
        .from("tracks")
        .update(input.values)
        .eq("id", input.trackId)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  };
}

async function createAuditLog(
  supabase: Supabase,
  input: {
    action: string;
    entity_id?: string | null;
    entity_type?: string | null;
    metadata?: Record<string, unknown>;
    user_id?: string | null;
    workspace_id: string;
  },
) {
  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      ...input,
      metadata: (input.metadata ?? {}) as Json,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function normalizeSchedule(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
    return null;
  }

  return date.toISOString();
}

function readTrackId(formData: FormData) {
  const trackId = String(formData.get("trackId") ?? "");

  if (!trackId) {
    throw new Error("Missing track id.");
  }

  return trackId;
}

function revalidateTrack(trackId: string) {
  revalidatePath(`/dashboard/tracks/${trackId}`);
  revalidatePath("/dashboard/queue");
  revalidatePath("/dashboard/library");
}

function actionError(error: unknown, fallback: string): TrackActionResult {
  return {
    message: error instanceof Error ? error.message : fallback,
    ok: false,
  };
}
