"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { isMockMode } from "@/lib/app-config";
import { requireWorkspace } from "@/modules/feed/workspace-context";
import type { FeedActionResult } from "@/modules/feed/feed.types";
import { InvalidStatusTransitionError } from "@/server/services/status-transition.service";
import {
  createStatusWriter,
  type StatusWriter,
} from "@/server/services/status-writer.service";
import { enqueueWorkerQueueJob } from "@/server/services/worker-queue.service";

const TARGETS = [
  "generation_request",
  "track",
  "video_render",
  "youtube_upload",
] as const;

type Target = (typeof TARGETS)[number];
type QueueName = "generation-jobs" | "render-jobs" | "youtube-upload-jobs";
type Supabase = SupabaseClient<Database>;

export async function retryFailedQueueItem(
  formData: FormData,
): Promise<FeedActionResult> {
  if (isMockMode) {
    return { message: "Mock retry queued.", ok: true };
  }

  const target = parseTarget(formData);
  const { supabase, userId, workspaceId } = await requireWorkspace();

  try {
    await retryTarget({ supabase, target, workspaceId });
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Could not retry this job.",
      ok: false,
    };
  }

  await supabase.from("audit_logs").insert({
    action: "queue.retry_requested",
    entity_id: target.id,
    entity_type: target.type,
    metadata: {},
    user_id: userId,
    workspace_id: workspaceId,
  });

  revalidatePath("/dashboard");

  return { message: "Retry queued.", ok: true };
}

export async function cancelQueueRequest(
  formData: FormData,
): Promise<FeedActionResult> {
  if (isMockMode) {
    return { message: "Mock queue request canceled.", ok: true };
  }

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { message: "Missing request id.", ok: false };
  }

  const { supabase, userId, workspaceId } = await requireWorkspace();
  const { data: tracks, error: tracksError } = await supabase
    .from("tracks")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("generation_request_id", id);

  if (tracksError) {
    return { message: tracksError.message, ok: false };
  }

  const trackIds = (tracks ?? []).map((track) => track.id);
  const statusWriter = createStatusWriter(supabase);
  const cancelReason = "Generation request cancelled.";

  try {
    await statusWriter.updateGenerationRequestStatus({
      generationRequestId: id,
      status: "cancelled",
      workspaceId,
    });
    await statusWriter.transitionTracks({
      failureReason: cancelReason,
      from: ["draft", "generating", "polling"],
      status: "failed",
      trackIds,
      workspaceId,
    });
    await statusWriter.transitionRendersForTracks({
      failureReason: cancelReason,
      from: ["queued", "running"],
      status: "failed",
      trackIds,
      workspaceId,
    });
    // An upload that is already "uploading" cannot be stopped anymore; only
    // uploads that have not started get cancelled.
    await statusWriter.transitionUploadsForTracks({
      failureReason: cancelReason,
      from: ["draft", "scheduled"],
      status: "cancelled",
      trackIds,
      workspaceId,
    });
  } catch (error) {
    if (error instanceof InvalidStatusTransitionError) {
      return { message: "This request can no longer be cancelled.", ok: false };
    }

    return {
      message:
        error instanceof Error ? error.message : "Could not cancel this job.",
      ok: false,
    };
  }

  await supabase.from("audit_logs").insert({
    action: "queue.cancel_requested",
    entity_id: id,
    entity_type: "generation_request",
    metadata: {},
    user_id: userId,
    workspace_id: workspaceId,
  });

  revalidatePath("/dashboard");

  return { message: "Request cancelled.", ok: true };
}

function parseTarget(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const type = String(formData.get("type") ?? "") as Target;

  if (!id || !TARGETS.includes(type)) {
    throw new Error("Invalid queue action target.");
  }

  return {
    id,
    type,
  };
}

async function retryTarget(input: {
  supabase: Supabase;
  target: { id: string; type: Target };
  workspaceId: string;
}) {
  switch (input.target.type) {
    case "generation_request":
      return retryGenerationRequest(input);
    case "track":
      return retryTrack(input);
    case "video_render":
      return retryRender(input);
    case "youtube_upload":
      return retryUpload(input);
  }
}

async function retryGenerationRequest(input: {
  supabase: Supabase;
  target: { id: string };
  workspaceId: string;
}) {
  const { data: tracks, error: tracksError } = await input.supabase
    .from("tracks")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("generation_request_id", input.target.id);

  if (tracksError) {
    throw new Error(tracksError.message);
  }

  if (!tracks?.length) {
    throw new Error("No tracks found for this generation request.");
  }

  const statusWriter = createStatusWriter(input.supabase);
  // Only failed tracks are reset; siblings that already produced audio keep
  // their progress.
  const resetTrackIds = await statusWriter.transitionTracks({
    failureReason: null,
    from: ["failed"],
    status: "draft",
    trackIds: tracks.map((track) => track.id),
    workspaceId: input.workspaceId,
  });

  if (!resetTrackIds.length) {
    throw new Error("No failed tracks to retry for this request.");
  }

  await statusWriter.updateGenerationRequestStatus({
    failureReason: null,
    generationRequestId: input.target.id,
    status: "queued",
    workspaceId: input.workspaceId,
  });

  for (const trackId of resetTrackIds) {
    await enqueueWorkerJob(input.supabase, "generation-jobs", {
      generationRequestId: input.target.id,
      trackId,
      workspaceId: input.workspaceId,
    });
  }
}

async function retryTrack(input: {
  supabase: Supabase;
  target: { id: string };
  workspaceId: string;
}) {
  const { data: track, error } = await input.supabase
    .from("tracks")
    .select("generation_request_id")
    .eq("workspace_id", input.workspaceId)
    .eq("id", input.target.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!track?.generation_request_id) {
    throw new Error("Track is missing a generation request.");
  }

  const statusWriter = createStatusWriter(input.supabase);

  await statusWriter.updateTrackStatus({
    failureReason: null,
    status: "draft",
    trackId: input.target.id,
    workspaceId: input.workspaceId,
  });
  await statusWriter.updateGenerationRequestStatus({
    failureReason: null,
    generationRequestId: track.generation_request_id,
    status: "queued",
    workspaceId: input.workspaceId,
  });
  await enqueueWorkerJob(input.supabase, "generation-jobs", {
    generationRequestId: track.generation_request_id,
    trackId: input.target.id,
    workspaceId: input.workspaceId,
  });
}

async function retryRender(input: {
  supabase: Supabase;
  target: { id: string };
  workspaceId: string;
}) {
  const { data: render, error } = await input.supabase
    .from("video_renders")
    .select("track_id")
    .eq("workspace_id", input.workspaceId)
    .eq("id", input.target.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!render?.track_id) {
    throw new Error("Render is missing a track.");
  }

  const statusWriter = createStatusWriter(input.supabase);

  await statusWriter.updateVideoRenderStatus({
    failureReason: null,
    status: "queued",
    videoRenderId: input.target.id,
    workspaceId: input.workspaceId,
  });
  // The failed render also marked the track failed; put it back to approved
  // so the render job can move it approved -> rendering again.
  await statusWriter.transitionTracks({
    failureReason: null,
    from: ["failed"],
    status: "approved",
    trackIds: [render.track_id],
    workspaceId: input.workspaceId,
  });
  await enqueueWorkerJob(input.supabase, "render-jobs", {
    trackId: render.track_id,
    videoRenderId: input.target.id,
    workspaceId: input.workspaceId,
  });
}

async function retryUpload(input: {
  supabase: Supabase;
  target: { id: string };
  workspaceId: string;
}) {
  const { data: upload, error } = await input.supabase
    .from("youtube_uploads")
    .select("track_id, video_render_id")
    .eq("workspace_id", input.workspaceId)
    .eq("id", input.target.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!upload?.track_id || !upload.video_render_id) {
    throw new Error("Upload is missing track or render details.");
  }

  const statusWriter: StatusWriter = createStatusWriter(input.supabase);

  await statusWriter.updateYoutubeUploadStatus({
    failureReason: null,
    status: "draft",
    workspaceId: input.workspaceId,
    youtubeUploadId: input.target.id,
  });
  await enqueueWorkerJob(input.supabase, "youtube-upload-jobs", {
    trackId: upload.track_id,
    videoRenderId: upload.video_render_id,
    workspaceId: input.workspaceId,
    youtubeUploadId: input.target.id,
  });
}

async function enqueueWorkerJob(
  _supabase: Supabase,
  queueName: QueueName,
  message: Record<string, string>,
) {
  await enqueueWorkerQueueJob({ message, queueName });
}
