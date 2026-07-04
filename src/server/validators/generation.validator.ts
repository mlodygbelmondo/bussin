import { z } from "zod";

export const publishModeSchema = z.enum([
  "draft",
  "publish_now",
  "schedule_later",
]);

/** Suno models offered in the prompt options, newest first. */
export const SUNO_MODELS = ["V5_5", "V5", "V4_5PLUS", "V4_5"] as const;

export const SUNO_DEFAULT_MODEL = SUNO_MODELS[0];

export const sunoOptionsSchema = z
  .object({
    model: z.enum(SUNO_MODELS).default(SUNO_DEFAULT_MODEL),
    style_weight: z.number().min(0).max(1).optional(),
    weirdness: z.number().min(0).max(1).optional(),
    lyrics: z.string().trim().max(3000).optional(),
  })
  .strict();

export type SunoOptions = z.infer<typeof sunoOptionsSchema>;

export const createGenerationRequestSchema = z
  .object({
    style: z.string().trim().min(2).max(300),
    suno_options: sunoOptionsSchema.default({ model: SUNO_DEFAULT_MODEL }),
    mood: z.string().trim().max(300).optional().default(""),
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
