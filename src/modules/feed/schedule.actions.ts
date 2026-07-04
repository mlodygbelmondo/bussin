"use server";

import { revalidatePath } from "next/cache";
import { isMockMode } from "@/lib/app-config";
import { requireWorkspace } from "@/modules/feed/workspace-context";
import type { FeedActionResult } from "@/modules/feed/feed.types";
import { createScheduledUploadRepository } from "@/server/services/scheduled-upload.repository";
import {
  cancelScheduledUpload,
  normalizeFutureSchedule,
  publishScheduledUploadNow,
  rescheduleUpload,
} from "@/server/services/scheduled-upload.service";

export async function rescheduleUploadAction(
  formData: FormData,
): Promise<FeedActionResult> {
  if (isMockMode) {
    return { message: "Mock upload rescheduled.", ok: true };
  }

  const { repository, userId, workspaceId } = await requireScheduledContext();

  try {
    const result = await rescheduleUpload({
      repository,
      scheduledAt: normalizeFutureSchedule(formData.get("scheduled_at")),
      uploadId: readUploadId(formData),
      userId,
      workspaceId,
    });

    if (result.ok) {
      revalidateScheduled();
    }

    return result;
  } catch (error) {
    return actionError(error, "Could not reschedule this upload.");
  }
}

export async function cancelScheduledUploadAction(
  formData: FormData,
): Promise<FeedActionResult> {
  if (isMockMode) {
    return { message: "Mock upload canceled.", ok: true };
  }

  const { repository, userId, workspaceId } = await requireScheduledContext();

  try {
    const result = await cancelScheduledUpload({
      repository,
      uploadId: readUploadId(formData),
      userId,
      workspaceId,
    });

    if (result.ok) {
      revalidateScheduled();
    }

    return result;
  } catch (error) {
    return actionError(error, "Could not cancel this upload.");
  }
}

export async function publishScheduledUploadNowAction(
  formData: FormData,
): Promise<FeedActionResult> {
  if (isMockMode) {
    return { message: "Mock upload queued for publishing.", ok: true };
  }

  const { repository, userId, workspaceId } = await requireScheduledContext();

  try {
    const result = await publishScheduledUploadNow({
      repository,
      uploadId: readUploadId(formData),
      userId,
      workspaceId,
    });

    if (result.ok) {
      revalidateScheduled();
    }

    return result;
  } catch (error) {
    return actionError(error, "Could not publish this upload.");
  }
}

async function requireScheduledContext() {
  const { supabase, userId, workspaceId } = await requireWorkspace();

  return {
    repository: createScheduledUploadRepository(supabase),
    userId,
    workspaceId,
  };
}

function readUploadId(formData: FormData) {
  return String(formData.get("uploadId") ?? "");
}

function revalidateScheduled() {
  revalidatePath("/dashboard");
}

function actionError(error: unknown, fallback: string): FeedActionResult {
  return {
    message: error instanceof Error ? error.message : fallback,
    ok: false,
  };
}
