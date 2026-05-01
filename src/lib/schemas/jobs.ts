import { z } from "zod";

export const generationRequestSchema = z.object({
  prompt: z.string().min(5).max(2000),
  title: z.string().min(1).max(120),
  imagePath: z.string().min(1).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export type GenerationRequest = z.infer<typeof generationRequestSchema>;
