import { z } from "zod";
import { escalateToServiceRole } from "@/lib/supabase";

export const privateStorageBuckets = [
  "image-assets",
  "audio-assets",
  "video-renders",
  "temp",
] as const;

export type PrivateStorageBucket = (typeof privateStorageBuckets)[number];

const signedUrlRequestSchema = z
  .object({
    bucket: z.enum(privateStorageBuckets),
    requesterUserId: z.string().uuid(),
    workspaceId: z.string().uuid(),
    path: z
      .string()
      .min(1)
      .refine((value) => !value.startsWith("/"), {
        message: "Storage path must be relative.",
      })
      .refine((value) => !value.split("/").includes(".."), {
        message: "Storage path cannot contain parent directory segments.",
      }),
    expiresIn: z
      .number()
      .int()
      .positive()
      .max(60 * 60 * 24 * 7)
      .default(3600),
  })
  .superRefine(({ path, workspaceId }, context) => {
    if (!path.startsWith(`${workspaceId}/`)) {
      context.addIssue({
        code: "custom",
        path: ["path"],
        message: "Storage path must start with the workspace id.",
      });
    }
  });

export type CreateStorageSignedUrlInput = z.input<
  typeof signedUrlRequestSchema
>;

export async function createStorageSignedUrl(
  input: CreateStorageSignedUrlInput,
): Promise<string> {
  const { bucket, expiresIn, path, requesterUserId, workspaceId } =
    signedUrlRequestSchema.parse(input);
  const supabase = escalateToServiceRole();

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", requesterUserId)
    .maybeSingle();

  if (membershipError || !membership) {
    throw new Error("Not authorized to access storage object.");
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(
      `Could not create signed storage URL for ${bucket}/${path}: ${
        error?.message ?? "missing signed URL"
      }`,
    );
  }

  return data.signedUrl;
}
