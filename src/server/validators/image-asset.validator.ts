import { z } from "zod";

export const imageAssetSourceSchema = z.enum([
  "uploaded",
  "fallback",
  "generated_later",
]);

export const createImageAssetSchema = z.object({
  workspace_id: z.string().uuid(),
  storage_path: z
    .string()
    .min(1)
    .refine((value) => !value.startsWith("/"), {
      message: "Storage path must be relative.",
    })
    .refine((value) => !value.split("/").includes(".."), {
      message: "Storage path cannot contain parent directory segments.",
    }),
  public_url: z.string().url().optional(),
  file_name: z.string().min(1).max(255).optional(),
  mime_type: z.string().min(3).max(120).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  source: imageAssetSourceSchema.default("uploaded"),
});

export type CreateImageAssetInput = z.input<typeof createImageAssetSchema>;
