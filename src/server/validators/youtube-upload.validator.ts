import { z } from "zod";

export const youtubePrivacyStatusSchema = z.enum([
  "private",
  "unlisted",
  "public",
]);

export const scheduleYoutubeUploadSchema = z.object({
  track_id: z.string().uuid(),
  video_render_id: z.string().uuid(),
  youtube_channel_id: z.string().uuid(),
  title: z.string().trim().min(1).max(100),
  description: z.string().max(5000).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  privacy_status: youtubePrivacyStatusSchema.default("private"),
  scheduled_at: z.string().datetime(),
  status: z.literal("scheduled").default("scheduled"),
});

export type ScheduleYoutubeUploadInput = z.input<
  typeof scheduleYoutubeUploadSchema
>;
