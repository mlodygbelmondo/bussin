"use server";

import { z } from "zod";
import { runFeedAction } from "@/modules/feed/feed-action";
import type { FeedActionResult } from "@/modules/feed/feed.types";
import { createGenerationRepository } from "@/server/services/generation.repository";
import { createGenerationRequestService } from "@/server/services/generation-request.service";
import { enqueueWorkerQueueJob } from "@/server/services/worker-queue.service";
import {
  createGenerationRequestSchema,
  SUNO_MODELS,
} from "@/server/validators/generation.validator";

const promptSchema = z.object({
  duration_seconds: z.number().int().min(30).max(600),
  lyrics: z.string().trim().max(3000),
  model: z.enum(SUNO_MODELS),
  prompt: z.string().trim().min(2).max(300),
  style_weight: z.number().min(0).max(1),
  track_count: z.number().int().min(1).max(4),
  weirdness: z.number().min(0).max(1),
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
        suno_options: {
          lyrics: input.lyrics || undefined,
          model: input.model,
          style_weight: input.style_weight,
          weirdness: input.weirdness,
        },
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
      lyrics: String(form.get("lyrics") ?? ""),
      model: String(form.get("model") ?? SUNO_MODELS[0]),
      prompt: String(form.get("prompt") ?? ""),
      style_weight: Number(form.get("style_weight") ?? 0.5),
      track_count: Number(form.get("track_count")),
      weirdness: Number(form.get("weirdness") ?? 0.5),
    }),
  });
}

const MAX_COVER_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function uploadTrackCoverAction(
  formData: FormData,
): Promise<FeedActionResult> {
  return runFeedAction({
    errorFallback: "Could not upload the cover.",
    formData,
    invalidMessage: "Invalid cover upload.",
    mockMessage: "Mock cover uploaded.",
    async run({ ctx, input }) {
      const file = formData.get("cover");

      if (!(file instanceof File) || !file.type.startsWith("image/")) {
        return { message: "Choose an image file.", ok: false };
      }

      if (file.size > MAX_COVER_UPLOAD_BYTES) {
        return { message: "Covers must be 10 MB or smaller.", ok: false };
      }

      const extension = file.type === "image/png" ? "png" : "jpg";
      const storagePath = `${ctx.workspaceId}/covers/custom-${input.trackId}.${extension}`;
      const { error: uploadError } = await ctx.supabase.storage
        .from("image-assets")
        .upload(storagePath, file, { contentType: file.type, upsert: true });

      if (uploadError) {
        return { message: uploadError.message, ok: false };
      }

      const { data: image, error: imageError } = await ctx.supabase
        .from("image_assets")
        .upsert(
          {
            file_name: file.name,
            mime_type: file.type,
            source: "uploaded",
            storage_path: storagePath,
            workspace_id: ctx.workspaceId,
          },
          { onConflict: "workspace_id,storage_path" },
        )
        .select("id")
        .single();

      if (imageError || !image) {
        return { message: imageError?.message ?? "Upload failed.", ok: false };
      }

      const { error: trackError } = await ctx.supabase
        .from("tracks")
        .update({ image_asset_id: image.id })
        .eq("workspace_id", ctx.workspaceId)
        .eq("id", input.trackId);

      if (trackError) {
        return { message: trackError.message, ok: false };
      }

      return { message: "Cover updated.", ok: true };
    },
    schema: z.object({ trackId: z.string().uuid() }),
    values: (form) => ({ trackId: String(form.get("trackId") ?? "") }),
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
