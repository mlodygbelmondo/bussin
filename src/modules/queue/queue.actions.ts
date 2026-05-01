"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { isMockMode } from "@/lib/app-config";
import { createClient } from "@/lib/supabase/server";
import type { QueueActionResult } from "@/modules/queue/queue.types";

const TARGETS = [
  "generation_request",
  "track",
  "video_render",
  "youtube_upload",
] as const;

type Target = (typeof TARGETS)[number];
type QueueName = "generation-jobs" | "render-jobs" | "youtube-upload-jobs";
type Supabase = SupabaseClient<Database>;
type QueueRpcClient = Supabase & {
  rpc(
    fn: "worker_queue_send",
    args: {
      delay_seconds: number;
      message: Record<string, string>;
      queue_name: QueueName;
    },
  ): Promise<{ data: unknown; error: { message: string } | null }>;
};

export async function retryFailedQueueItem(
  formData: FormData,
): Promise<QueueActionResult> {
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

  revalidatePath("/dashboard/queue");

  return { message: "Retry queued.", ok: true };
}

export async function cancelQueueRequest(
  formData: FormData,
): Promise<QueueActionResult> {
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
  const { error } = await supabase
    .from("generation_requests")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .in("status", ["queued", "running"]);

  if (error) {
    return { message: error.message, ok: false };
  }

  if (trackIds.length > 0) {
    const { error: trackError } = await supabase
      .from("tracks")
      .update({
        failure_reason: "Generation request cancelled.",
        status: "failed",
      })
      .eq("workspace_id", workspaceId)
      .in("id", trackIds)
      .in("status", ["draft", "generating", "polling"]);

    if (trackError) {
      return { message: trackError.message, ok: false };
    }

    const { error: renderError } = await supabase
      .from("video_renders")
      .update({
        failure_reason: "Generation request cancelled.",
        status: "failed",
      })
      .eq("workspace_id", workspaceId)
      .in("track_id", trackIds)
      .in("status", ["queued", "running"]);

    if (renderError) {
      return { message: renderError.message, ok: false };
    }

    const { error: uploadError } = await supabase
      .from("youtube_uploads")
      .update({
        failure_reason: "Generation request cancelled.",
        status: "cancelled",
      })
      .eq("workspace_id", workspaceId)
      .in("track_id", trackIds)
      .in("status", ["draft", "scheduled", "uploading"]);

    if (uploadError) {
      return { message: uploadError.message, ok: false };
    }
  }

  await supabase.from("audit_logs").insert({
    action: "queue.cancel_requested",
    entity_id: id,
    entity_type: "generation_request",
    metadata: {},
    user_id: userId,
    workspace_id: workspaceId,
  });

  revalidatePath("/dashboard/queue");

  return { message: "Request cancelled.", ok: true };
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

  await updateOrThrow(
    input.supabase
      .from("generation_requests")
      .update({ failure_reason: null, status: "queued" })
      .eq("id", input.target.id)
      .eq("workspace_id", input.workspaceId),
  );

  for (const track of tracks) {
    await updateOrThrow(
      input.supabase
        .from("tracks")
        .update({ failure_reason: null, status: "draft" })
        .eq("id", track.id)
        .eq("workspace_id", input.workspaceId),
    );
    await enqueueWorkerJob(input.supabase, "generation-jobs", {
      generationRequestId: input.target.id,
      trackId: track.id,
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

  await updateOrThrow(
    input.supabase
      .from("generation_requests")
      .update({ failure_reason: null, status: "queued" })
      .eq("id", track.generation_request_id)
      .eq("workspace_id", input.workspaceId),
  );
  await updateOrThrow(
    input.supabase
      .from("tracks")
      .update({ failure_reason: null, status: "draft" })
      .eq("id", input.target.id)
      .eq("workspace_id", input.workspaceId),
  );
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

  await updateOrThrow(
    input.supabase
      .from("video_renders")
      .update({ failure_reason: null, status: "queued" })
      .eq("id", input.target.id)
      .eq("workspace_id", input.workspaceId),
  );
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

  await updateOrThrow(
    input.supabase
      .from("youtube_uploads")
      .update({ failure_reason: null, status: "draft" })
      .eq("id", input.target.id)
      .eq("workspace_id", input.workspaceId),
  );
  await enqueueWorkerJob(input.supabase, "youtube-upload-jobs", {
    trackId: upload.track_id,
    videoRenderId: upload.video_render_id,
    workspaceId: input.workspaceId,
    youtubeUploadId: input.target.id,
  });
}

async function enqueueWorkerJob(
  supabase: Supabase,
  queueName: QueueName,
  message: Record<string, string>,
) {
  const { error } = await (supabase as QueueRpcClient).rpc(
    "worker_queue_send",
    {
      delay_seconds: 0,
      message,
      queue_name: queueName,
    },
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function updateOrThrow(
  request: PromiseLike<{ error: { message: string } | null }>,
) {
  const { error } = await request;

  if (error) {
    throw new Error(error.message);
  }
}
