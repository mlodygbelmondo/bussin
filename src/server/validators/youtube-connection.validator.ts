import { z } from "zod";

export const createYoutubeConnectionSchema = z.object({
  provider_account_email: z.string().email(),
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  token_expires_at: z.string().datetime().optional(),
  scopes: z.array(z.string().min(1)).min(1),
});

export type CreateYoutubeConnectionInput = z.input<
  typeof createYoutubeConnectionSchema
>;
