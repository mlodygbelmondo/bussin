import { createWorkspaceClient } from "@/lib/supabase";
import { isMockMode } from "@/lib/app-config";
import { mockGenerateScreenData } from "@/modules/dev/mock-data";
import { getPlanLimits } from "@/server/services/plan-limits.service";
import type { GenerateScreenData } from "@/modules/generation/generation.types";

const FALLBACK_GENERATION_LIMIT = 10;

export async function getGenerateScreenData(
  userId: string,
): Promise<GenerateScreenData | null> {
  if (isMockMode) {
    return mockGenerateScreenData;
  }

  const supabase = await createWorkspaceClient();
  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership) {
    return null;
  }

  const workspaceId = membership.workspace_id;
  const [
    channelsResult,
    imagesResult,
    subscriptionResult,
    usageResult,
    sunoResult,
    defaultsResult,
  ] = await Promise.all([
    supabase
      .from("youtube_channels")
      .select("id, title, handle, status, is_default")
      .eq("workspace_id", workspaceId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("image_assets")
      .select("id, file_name, public_url, storage_path, source")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("subscriptions")
      .select("plan")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    supabase
      .from("usage_counters")
      .select("generated_tracks_count")
      .eq("workspace_id", workspaceId)
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("suno_connections")
      .select("status")
      .eq("workspace_id", workspaceId)
      .eq("status", "connected")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("prompt_history")
      .select("style, mood, duration_seconds, track_count")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  for (const result of [
    channelsResult,
    imagesResult,
    subscriptionResult,
    usageResult,
    sunoResult,
    defaultsResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const planName = subscriptionResult.data?.plan ?? "trial";
  const planLimits = getPlanLimits(planName);
  const currentUsage = usageResult.data?.generated_tracks_count ?? 0;
  const limit =
    planLimits.monthlyGenerationRequests ?? FALLBACK_GENERATION_LIMIT;

  return {
    channels: (channelsResult.data ?? []).map((channel) => ({
      handle: channel.handle,
      id: channel.id,
      isDefault: channel.is_default,
      status: channel.status,
      title: channel.title,
    })),
    defaults: {
      durationSeconds: defaultsResult.data?.duration_seconds ?? 150,
      mood: defaultsResult.data?.mood ?? "Nostalgic, Uplifting",
      style: defaultsResult.data?.style ?? "Synthwave, Retrowave",
      trackCount: defaultsResult.data?.track_count ?? 1,
    },
    hasSunoConnection: Boolean(sunoResult.data),
    images: (imagesResult.data ?? []).map((image) => ({
      fileName: image.file_name,
      id: image.id,
      publicUrl: image.public_url,
      source: image.source,
      storagePath: image.storage_path,
    })),
    plan: {
      availableCredits: Math.max(limit - currentUsage, 0),
      currentUsage,
      limit,
      name: planName,
      planLimitReached: currentUsage >= limit,
    },
    workspaceId,
  };
}
