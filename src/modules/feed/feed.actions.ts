"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isMockMode } from "@/lib/app-config";
import { requireWorkspace } from "@/modules/feed/workspace-context";
import { createGenerationRepository } from "@/server/services/generation.repository";
import type { FeedActionResult } from "@/modules/feed/feed.types";
import { createGenerationRequestService } from "@/server/services/generation-request.service";
import { ServiceError } from "@/server/services/service-error";
import { enqueueWorkerQueueJob } from "@/server/services/worker-queue.service";
import { createGenerationRequestSchema } from "@/server/validators/generation.validator";

const promptSchema = z.object({
  duration_seconds: z.number().int().min(30).max(600),
  prompt: z.string().trim().min(2).max(300),
  track_count: z.number().int().min(1).max(4),
});

const trackDetailsSchema = z.object({
  description: z.string().trim().max(5000),
  tags: z.array(z.string().trim().min(1).max(40)).max(15),
  title: z.string().trim().min(1).max(100),
  trackId: z.string().uuid(),
});

export async function createFeedGenerationAction(
  formData: FormData,
): Promise<FeedActionResult> {
  if (isMockMode) {
    return { message: "Mock generation queued.", ok: true };
  }

  const parsedPrompt = promptSchema.safeParse({
    duration_seconds: Number(formData.get("duration_seconds")),
    prompt: String(formData.get("prompt") ?? ""),
    track_count: Number(formData.get("track_count")),
  });

  if (!parsedPrompt.success) {
    return {
      message:
        parsedPrompt.error.issues[0]?.message ?? "Describe the track first.",
      ok: false,
    };
  }

  const { supabase, user, workspaceId } = await requireWorkspace();
  const parsed = createGenerationRequestSchema.safeParse({
    duration_seconds: parsedPrompt.data.duration_seconds,
    publish_mode: "draft",
    style: parsedPrompt.data.prompt,
    track_count: parsedPrompt.data.track_count,
  });

  if (!parsed.success) {
    return {
      message:
        parsed.error.issues[0]?.message ?? "Could not start the generation.",
      ok: false,
    };
  }

  try {
    const service = createGenerationRequestService({
      queue: {
        async enqueueGenerationJob(input) {
          await enqueueWorkerQueueJob({
            message: input,
            queueName: "generation-jobs",
          });
        },
      },
      repository: createGenerationRepository(supabase),
    });

    await service.create({
      createdByUserId: user.id,
      input: parsed.data,
      workspaceId,
    });
  } catch (error) {
    return {
      message:
        error instanceof ServiceError || error instanceof Error
          ? error.message
          : "Could not start the generation.",
      ok: false,
    };
  }

  revalidatePath("/dashboard");

  return { message: "Generation started.", ok: true };
}

export async function updateTrackDetailsAction(
  formData: FormData,
): Promise<FeedActionResult> {
  if (isMockMode) {
    return { message: "Mock track details saved.", ok: true };
  }

  const parsed = trackDetailsSchema.safeParse({
    description: String(formData.get("description") ?? ""),
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    title: String(formData.get("title") ?? ""),
    trackId: String(formData.get("trackId") ?? ""),
  });

  if (!parsed.success) {
    return {
      message: parsed.error.issues[0]?.message ?? "Invalid track details.",
      ok: false,
    };
  }

  const { supabase, workspaceId } = await requireWorkspace();
  const { description, tags, title, trackId } = parsed.data;
  const { error } = await supabase
    .from("tracks")
    .update({ description, tags, title })
    .eq("workspace_id", workspaceId)
    .eq("id", trackId)
    .not("status", "in", "(uploaded)");

  if (error) {
    return { message: error.message, ok: false };
  }

  const { error: uploadError } = await supabase
    .from("youtube_uploads")
    .update({ description, tags, title })
    .eq("workspace_id", workspaceId)
    .eq("track_id", trackId)
    .in("status", ["draft", "scheduled"]);

  if (uploadError) {
    return { message: uploadError.message, ok: false };
  }

  revalidatePath("/dashboard");

  return { message: "Track details saved.", ok: true };
}
