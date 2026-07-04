"use server";

import { z } from "zod";
import { runFeedAction } from "@/modules/feed/feed-action";
import type { FeedActionResult } from "@/modules/feed/feed.types";
import { createGenerationRepository } from "@/server/services/generation.repository";
import { createGenerationRequestService } from "@/server/services/generation-request.service";
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
  return runFeedAction({
    errorFallback: "Could not start the generation.",
    formData,
    invalidMessage: "Describe the track first.",
    mockMessage: "Mock generation queued.",
    async run({ ctx, input }) {
      const parsed = createGenerationRequestSchema.safeParse({
        duration_seconds: input.duration_seconds,
        publish_mode: "draft",
        style: input.prompt,
        track_count: input.track_count,
      });

      if (!parsed.success) {
        return {
          message:
            parsed.error.issues[0]?.message ??
            "Could not start the generation.",
          ok: false,
        };
      }

      const service = createGenerationRequestService({
        queue: {
          async enqueueGenerationJob(queueInput) {
            await enqueueWorkerQueueJob({
              message: queueInput,
              queueName: "generation-jobs",
            });
          },
        },
        repository: createGenerationRepository(ctx.supabase),
      });

      await service.create({
        createdByUserId: ctx.user.id,
        input: parsed.data,
        workspaceId: ctx.workspaceId,
      });

      return { message: "Generation started.", ok: true };
    },
    schema: promptSchema,
    values: (form) => ({
      duration_seconds: Number(form.get("duration_seconds")),
      prompt: String(form.get("prompt") ?? ""),
      track_count: Number(form.get("track_count")),
    }),
  });
}

export async function updateTrackDetailsAction(
  formData: FormData,
): Promise<FeedActionResult> {
  return runFeedAction({
    errorFallback: "Could not save track details.",
    formData,
    invalidMessage: "Invalid track details.",
    mockMessage: "Mock track details saved.",
    async run({ ctx, input }) {
      const { description, tags, title, trackId } = input;
      const { error } = await ctx.supabase
        .from("tracks")
        .update({ description, tags, title })
        .eq("workspace_id", ctx.workspaceId)
        .eq("id", trackId)
        .not("status", "in", "(uploaded)");

      if (error) {
        return { message: error.message, ok: false };
      }

      const { error: uploadError } = await ctx.supabase
        .from("youtube_uploads")
        .update({ description, tags, title })
        .eq("workspace_id", ctx.workspaceId)
        .eq("track_id", trackId)
        .in("status", ["draft", "scheduled"]);

      if (uploadError) {
        return { message: uploadError.message, ok: false };
      }

      return { message: "Track details saved.", ok: true };
    },
    schema: trackDetailsSchema,
    values: (form) => ({
      description: String(form.get("description") ?? ""),
      tags: String(form.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      title: String(form.get("title") ?? ""),
      trackId: String(form.get("trackId") ?? ""),
    }),
  });
}
