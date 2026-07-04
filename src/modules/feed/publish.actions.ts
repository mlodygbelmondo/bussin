"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/database.types";
import { runFeedAction } from "@/modules/feed/feed-action";
import type { FeedActionResult } from "@/modules/feed/feed.types";
import {
  selectMaybeSingle,
  selectSingle,
  throwOnError,
} from "@/server/services/supabase-query";
import { createTrackRepository } from "@/server/services/track.repository";
import { createTrackService } from "@/server/services/track.service";
import { createUploadLimitsRepository } from "@/server/services/upload-limits.repository";
import {
  checkUploadPlanLimit,
  uploadLimitMessage,
  type UploadLimitMode,
} from "@/server/services/upload-limits.service";
import { enqueueWorkerQueueJob } from "@/server/services/worker-queue.service";

type Supabase = SupabaseClient<Database>;
type ExistingYoutubeUpload = Pick<
  Database["public"]["Tables"]["youtube_uploads"]["Row"],
  "id" | "status"
>;

const trackIdSchema = z.object({
  trackId: z.string().min(1, "Missing track id."),
});

const scheduleSchema = trackIdSchema.extend({
  scheduled_at: z.string(),
});

const readTrackIdValues = (form: FormData) => ({
  trackId: String(form.get("trackId") ?? ""),
});

export async function approveTrackAction(
  formData: FormData,
): Promise<FeedActionResult> {
  return runFeedAction({
    errorFallback: "Could not approve this track.",
    formData,
    mockMessage: "Mock track approved. Render queued.",
    async run({ ctx, input }) {
      const { supabase, userId, workspaceId } = ctx;
      const { trackId } = input;
      const service = createTrackService({
        repository: createTrackRepository(supabase),
      });
      const result = await service.approveTrack({
        trackId,
        userId,
        workspaceId,
      });
      const videoRenderId = result.render.id;

      if (!videoRenderId) {
        throw new Error("Approval did not create a render job.");
      }

      await enqueueRender(supabase, { trackId, videoRenderId, workspaceId });

      return { message: "Track approved. Render queued.", ok: true };
    },
    schema: trackIdSchema,
    values: readTrackIdValues,
  });
}

export async function rejectTrackAction(
  formData: FormData,
): Promise<FeedActionResult> {
  return runFeedAction({
    errorFallback: "Could not reject this track.",
    formData,
    mockMessage: "Mock track rejected.",
    async run({ ctx, input }) {
      const service = createTrackService({
        repository: createTrackRepository(ctx.supabase),
      });

      await service.rejectTrack({
        trackId: input.trackId,
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
      });

      return { message: "Track rejected. Uploads are blocked.", ok: true };
    },
    schema: trackIdSchema,
    values: readTrackIdValues,
  });
}

export async function publishTrackNowAction(
  formData: FormData,
): Promise<FeedActionResult> {
  return runFeedAction({
    errorFallback: "Could not queue publishing.",
    formData,
    mockMessage: "Mock publishing job queued.",
    async run({ ctx, input }) {
      const { supabase, userId, workspaceId } = ctx;
      const { trackId } = input;
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
        ensureCanCreate: () =>
          assertUploadWithinPlanLimits(supabase, workspaceId, "publish_now"),
        scheduledAt: null,
        status: "draft",
        supabase,
        trackId,
        videoRenderId: context.videoRenderId,
        workspaceId,
      });

      if (upload.created) {
        await createTrackRepository(supabase).createAuditLog({
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

      return { message: "Publishing job queued.", ok: true };
    },
    schema: trackIdSchema,
    values: readTrackIdValues,
  });
}

export async function scheduleTrackAction(
  formData: FormData,
): Promise<FeedActionResult> {
  return runFeedAction({
    errorFallback: "Could not schedule this track.",
    formData,
    mockMessage: "Mock upload scheduled.",
    async run({ ctx, input }) {
      const { supabase, userId, workspaceId } = ctx;
      const { trackId } = input;
      const scheduledAt = normalizeSchedule(input.scheduled_at);

      if (!scheduledAt) {
        return { message: "Choose a future schedule time.", ok: false };
      }

      const context = await ensureRenderContext({
        supabase,
        trackId,
        userId,
        workspaceId,
      });

      if (context.shouldEnqueueRender) {
        await enqueueRender(supabase, {
          trackId,
          videoRenderId: context.videoRenderId,
          workspaceId,
        });
      }

      const upload = await createOrReuseYoutubeUpload({
        ensureCanCreate: () =>
          assertUploadWithinPlanLimits(supabase, workspaceId, "schedule"),
        scheduledAt,
        status: "scheduled",
        supabase,
        trackId,
        videoRenderId: context.videoRenderId,
        workspaceId,
      });

      if (!upload.created) {
        if (upload.status !== "scheduled") {
          return {
            message: "This track is already publishing.",
            ok: false,
          };
        }

        await throwOnError(
          supabase
            .from("youtube_uploads")
            .update({ scheduled_at: scheduledAt })
            .eq("workspace_id", workspaceId)
            .eq("id", upload.id)
            .eq("status", "scheduled"),
        );
      }

      await createTrackRepository(supabase).createAuditLog({
        action: "upload.scheduled",
        entity_id: upload.id,
        entity_type: "youtube_upload",
        metadata: { scheduled_at: scheduledAt },
        user_id: userId,
        workspace_id: workspaceId,
      });

      return { message: "Upload scheduled.", ok: true };
    },
    schema: scheduleSchema,
    values: (form) => ({
      ...readTrackIdValues(form),
      scheduled_at: String(form.get("scheduled_at") ?? ""),
    }),
  });
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
  return selectMaybeSingle(
    supabase
      .from("video_renders")
      .select("id, status")
      .eq("workspace_id", input.workspaceId)
      .eq("track_id", input.trackId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
}

async function createOrReuseYoutubeUpload(input: {
  ensureCanCreate?: () => Promise<void>;
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

  // Plan limits only gate creating a new upload; reusing or rescheduling an
  // existing one stays allowed.
  await input.ensureCanCreate?.();

  const data = await selectSingle(
    input.supabase
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
      .single(),
  );

  return { ...data, created: true };
}

async function assertUploadWithinPlanLimits(
  supabase: Supabase,
  workspaceId: string,
  mode: UploadLimitMode,
) {
  const result = await checkUploadPlanLimit({
    mode,
    repository: createUploadLimitsRepository(supabase),
    workspaceId,
  });

  if (!result.allowed) {
    throw new Error(
      uploadLimitMessage(result) ?? "Plan limit reached for uploads.",
    );
  }
}

async function loadActiveYoutubeUpload(
  supabase: Supabase,
  input: { trackId: string; videoRenderId: string; workspaceId: string },
): Promise<ExistingYoutubeUpload | null> {
  return selectMaybeSingle(
    supabase
      .from("youtube_uploads")
      .select("id, status")
      .eq("workspace_id", input.workspaceId)
      .eq("track_id", input.trackId)
      .eq("video_render_id", input.videoRenderId)
      .in("status", ["draft", "scheduled", "uploading"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
}

async function loadTrackForUpload(
  supabase: Supabase,
  input: { trackId: string; workspaceId: string },
) {
  const data = await selectMaybeSingle(
    supabase
      .from("tracks")
      .select("title, description, tags, status")
      .eq("workspace_id", input.workspaceId)
      .eq("id", input.trackId)
      .maybeSingle(),
  );

  if (!data || data.status === "rejected") {
    throw new Error("Rejected tracks cannot be published.");
  }

  return data;
}

async function loadDefaultChannel(supabase: Supabase, workspaceId: string) {
  return selectMaybeSingle(
    supabase
      .from("youtube_channels")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("status", "connected")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  );
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

function normalizeSchedule(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
    return null;
  }

  return date.toISOString();
}
