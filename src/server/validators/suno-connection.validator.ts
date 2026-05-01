import { z } from "zod";

export const createSunoConnectionSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  cookie: z.string().min(1),
  api_url: z.string().url(),
});

export type CreateSunoConnectionInput = z.input<
  typeof createSunoConnectionSchema
>;
