"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { isMockMode } from "@/lib/app-config";
import { createClient } from "@/lib/supabase/server";
import { createGenerationRepository } from "@/modules/generation/generation.repository";
import { createGenerationRequestService } from "@/server/services/generation-request.service";
import { enqueueWorkerQueueJob } from "@/server/services/worker-queue.service";
import { ServiceError } from "@/server/services/service-error";
import { createGenerationRequestSchema } from "@/server/validators/generation.validator";
import type { CreateGenerationActionState } from "@/modules/generation/generation.types";

const IMAGE_BUCKET = "image-assets";
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;

type Supabase = SupabaseClient<Database>;

export async function createGenerationAction(
  formData: FormData,
): Promise<CreateGenerationActionState> {
  if (isMockMode) {
    redirect("/dashboard/queue");
  }

  const { supabase, user, workspaceId } = await requireWorkspace();

  try {
    const imageAssetId = await resolveImageAssetId({
      formData,
      supabase,
      workspaceId,
    });
    const raw = {
      duration_seconds: Number(formData.get("duration_seconds")),
      image_asset_id: imageAssetId || undefined,
      mood: String(formData.get("mood") ?? ""),
      publish_mode: formData.get("publish_mode") ?? "draft",
      scheduled_at: normalizeOptionalDateTime(formData.get("scheduled_at")),
      style: String(formData.get("style") ?? ""),
      target_youtube_channel_id:
        String(formData.get("target_youtube_channel_id") ?? "") || undefined,
      track_count: Number(formData.get("track_count")),
    };
    const parsed = createGenerationRequestSchema.safeParse(raw);

    if (!parsed.success) {
      const errors: NonNullable<CreateGenerationActionState["errors"]> = {};

      for (const issue of parsed.error.issues) {
        const key = issue.path[0];

        if (typeof key === "string") {
          errors[key as keyof typeof errors] = issue.message;
        }
      }

      return {
        errors,
        ok: false,
      };
    }

    const service = createGenerationRequestService({
      queue: {
        async enqueueGenerationJob(input) {
          await enqueueWorkerQueueJob({
            message: input,
            queueName: "generation-jobs",
          });
        },
      },
      repository: createGenerationRepository(supabase),
    });

    await service.create({
      createdByUserId: user.id,
      input: parsed.data,
      workspaceId,
    });
  } catch (error) {
    return {
      errors: {
        form:
          error instanceof ServiceError || error instanceof Error
            ? error.message
            : "Could not create the generation.",
      },
      ok: false,
    };
  }

  revalidatePath("/dashboard/generate");
  redirect("/dashboard/queue");
}

async function requireWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    redirect("/onboarding");
  }

  return { supabase, user, workspaceId: data.workspace_id };
}

async function resolveImageAssetId(input: {
  formData: FormData;
  supabase: Supabase;
  workspaceId: string;
}) {
  const selectedId = String(input.formData.get("image_asset_id") ?? "");
  const upload = input.formData.get("image_file");

  if (!(upload instanceof File) || upload.size === 0) {
    return selectedId;
  }

  if (!upload.type.startsWith("image/")) {
    throw new Error("Upload must be an image file.");
  }

  if (upload.size > MAX_IMAGE_SIZE) {
    throw new Error("Image uploads must be 6 MB or smaller.");
  }

  const extension = upload.name.split(".").pop()?.toLowerCase() ?? "png";
  const safeName = upload.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const storagePath = `${input.workspaceId}/${crypto.randomUUID()}-${
    safeName || "cover"
  }.${extension}`;
  const { error: uploadError } = await input.supabase.storage
    .from(IMAGE_BUCKET)
    .upload(storagePath, upload, {
      contentType: upload.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data, error } = await input.supabase
    .from("image_assets")
    .insert({
      file_name: upload.name,
      mime_type: upload.type,
      source: "uploaded",
      storage_path: storagePath,
      workspace_id: input.workspaceId,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data.id;
}

function normalizeOptionalDateTime(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  return new Date(value).toISOString();
}
