import { z } from "zod";

export const billingPlanSchema = z.enum(["trial", "creator", "pro", "studio"]);
export const youtubePrivacyStatusSchema = z.enum([
  "private",
  "unlisted",
  "public",
]);

export const billingCheckoutSchema = z.object({
  workspace_id: z.string().uuid(),
  plan: z.enum(["creator", "pro", "studio"]),
});

export const workspaceSettingsSchema = z.object({
  auto_normalize_audio: z.boolean(),
  default_bpm: z.coerce.number().int().min(40).max(240),
  default_format: z.string().trim().min(2).max(80),
  default_genre: z.string().trim().min(1).max(80),
  default_image_asset_id: z.string().uuid().nullable(),
  default_key: z.string().trim().min(1).max(24),
  default_license: z.string().trim().min(2).max(80),
  default_mood: z.string().trim().min(1).max(80),
  default_privacy_status: youtubePrivacyStatusSchema,
  default_storage_location: z.string().trim().min(2).max(80),
  default_youtube_channel_id: z.string().uuid().nullable(),
  extract_stems_on_upload: z.boolean(),
  notify_billing_payments: z.boolean(),
  notify_generation_completions: z.boolean(),
  notify_marketing_emails: z.boolean(),
  notify_product_updates: z.boolean(),
  timezone: z.string().trim().min(1).max(80),
  youtube_description_template: z.string().trim().max(5000).nullable(),
  youtube_title_template: z.string().trim().max(100).nullable(),
});

export type BillingCheckoutInput = z.input<typeof billingCheckoutSchema>;
export type BillingPlan = z.infer<typeof billingPlanSchema>;
export type PaidBillingPlan = z.infer<typeof billingCheckoutSchema>["plan"];
export type WorkspaceSettingsInput = z.infer<typeof workspaceSettingsSchema>;
