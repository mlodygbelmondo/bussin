import { z } from "zod";

export const publishModeSchema = z.enum([
  "draft",
  "publish_now",
  "schedule_later",
]);

export const createGenerationRequestSchema = z
  .object({
    style: z.string().trim().min(2).max(300),
    mood: z.string().trim().min(2).max(300),
    duration_seconds: z.number().int().min(30).max(600),
    track_count: z.number().int().min(1).max(20),
    target_youtube_channel_id: z.string().uuid().optional(),
    image_asset_id: z.string().uuid().optional(),
    publish_mode: publishModeSchema.default("draft"),
    scheduled_at: z.string().datetime().optional(),
  })
  .superRefine((value, context) => {
    if (value.publish_mode === "schedule_later" && !value.scheduled_at) {
      context.addIssue({
        code: "custom",
        path: ["scheduled_at"],
        message:
          "scheduled_at is required when publish_mode is schedule_later.",
      });
    }
  });

export type CreateGenerationRequestInput = z.input<
  typeof createGenerationRequestSchema
>;
