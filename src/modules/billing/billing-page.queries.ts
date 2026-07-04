import { createWorkspaceClient } from "@/lib/supabase";
import { isMockMode } from "@/lib/app-config";
import { mockBillingPageData } from "@/modules/dev/mock-data";
import {
  BILLING_PLAN_CONFIG,
  PAID_BILLING_PLANS,
} from "@/modules/billing/plan-config";
import type {
  BillingPageData,
  WorkspaceSettingsData,
} from "@/modules/billing/billing.types";
import type { BillingPlan } from "@/server/validators/billing.validator";

export async function getBillingPageData(
  userId: string,
): Promise<BillingPageData | null> {
  if (isMockMode) {
    return mockBillingPageData;
  }

  const supabase = await createWorkspaceClient();
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return null;
  }

  const workspaceId = membership.workspace_id;
  const [
    subscriptionResult,
    usageResult,
    channelsResult,
    imageAssetsResult,
    settingsResult,
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    supabase
      .from("usage_counters")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("youtube_channels")
      .select("id, title, handle, is_default")
      .eq("workspace_id", workspaceId)
      .order("is_default", { ascending: false })
      .order("title", { ascending: true }),
    supabase
      .from("image_assets")
      .select("id, file_name, public_url, storage_path")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("workspace_settings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
  ]);

  for (const result of [
    subscriptionResult,
    usageResult,
    channelsResult,
    imageAssetsResult,
    settingsResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const subscription = subscriptionResult.data;
  const usage = usageResult.data;
  const plan = toBillingPlan(subscription?.plan);
  const limits = BILLING_PLAN_CONFIG[plan].limits;
  const usageData = {
    connectedChannels: usage?.connected_channels_count ?? 0,
    generatedTracks: usage?.generated_tracks_count ?? 0,
    scheduledUploads: usage?.scheduled_uploads_count ?? 0,
    uploadedVideos: usage?.uploaded_videos_count ?? 0,
  };

  return {
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    channels: (channelsResult.data ?? []).map((channel) => ({
      handle: channel.handle,
      id: channel.id,
      isDefault: channel.is_default,
      title: channel.title,
    })),
    currentPeriodStart: subscription?.current_period_start ?? null,
    currentPeriodEnd: subscription?.current_period_end ?? null,
    imageAssets: (imageAssetsResult.data ?? []).map((asset) => ({
      fileName: asset.file_name,
      id: asset.id,
      publicUrl: asset.public_url,
      storagePath: asset.storage_path,
    })),
    limits,
    monthlyPriceUsd: BILLING_PLAN_CONFIG[plan].monthlyPriceUsd,
    plan,
    planDisplayName: BILLING_PLAN_CONFIG[plan].displayName,
    settings: toWorkspaceSettingsData(settingsResult.data),
    status: subscription?.status ?? "trialing",
    usage: usageData,
    usageMetrics: [
      {
        key: "generatedTracks",
        label: "Generations",
        limit: limits.monthlyGenerationRequests,
        used: usageData.generatedTracks,
      },
      {
        key: "uploadedVideos",
        label: "Uploads",
        limit: limits.monthlyUploads,
        used: usageData.uploadedVideos,
      },
      {
        key: "connectedChannels",
        label: "Channels",
        limit: limits.youtubeChannels,
        used: usageData.connectedChannels,
      },
      {
        key: "scheduledUploads",
        label: "Scheduled",
        limit: limits.scheduledUploads,
        used: usageData.scheduledUploads,
      },
    ],
    workspaceId,
    upgradeOptions: PAID_BILLING_PLANS.map((paidPlan) => {
      const config = BILLING_PLAN_CONFIG[paidPlan];

      return {
        displayName: config.displayName,
        features: config.features,
        monthlyPriceUsd: config.monthlyPriceUsd,
        plan: paidPlan,
      };
    }),
  };
}

function toBillingPlan(plan: string | null | undefined): BillingPlan {
  return plan && plan in BILLING_PLAN_CONFIG ? (plan as BillingPlan) : "trial";
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettingsData = {
  autoNormalizeAudio: true,
  defaultBpm: 120,
  defaultFormat: "MP3 320kbps",
  defaultGenre: "Synthwave",
  defaultImageAssetId: null,
  defaultKey: "auto",
  defaultLicense: "Standard License",
  defaultMood: "Night Drive",
  defaultPrivacyStatus: "private",
  defaultStorageLocation: "library",
  defaultYoutubeChannelId: null,
  extractStemsOnUpload: false,
  notifyBillingPayments: true,
  notifyGenerationCompletions: true,
  notifyMarketingEmails: false,
  notifyProductUpdates: true,
  timezone: "America/Los_Angeles",
};

function toWorkspaceSettingsData(
  settings: {
    auto_normalize_audio?: boolean | null;
    default_bpm?: number | null;
    default_format?: string | null;
    default_genre?: string | null;
    default_image_asset_id?: string | null;
    default_key?: string | null;
    default_license?: string | null;
    default_mood?: string | null;
    default_privacy_status?: "private" | "unlisted" | "public" | null;
    default_storage_location?: string | null;
    default_youtube_channel_id?: string | null;
    extract_stems_on_upload?: boolean | null;
    notify_billing_payments?: boolean | null;
    notify_generation_completions?: boolean | null;
    notify_marketing_emails?: boolean | null;
    notify_product_updates?: boolean | null;
    timezone?: string | null;
  } | null,
): WorkspaceSettingsData {
  return {
    autoNormalizeAudio:
      settings?.auto_normalize_audio ??
      DEFAULT_WORKSPACE_SETTINGS.autoNormalizeAudio,
    defaultBpm: settings?.default_bpm ?? DEFAULT_WORKSPACE_SETTINGS.defaultBpm,
    defaultFormat:
      settings?.default_format ?? DEFAULT_WORKSPACE_SETTINGS.defaultFormat,
    defaultGenre:
      settings?.default_genre ?? DEFAULT_WORKSPACE_SETTINGS.defaultGenre,
    defaultImageAssetId:
      settings?.default_image_asset_id ??
      DEFAULT_WORKSPACE_SETTINGS.defaultImageAssetId,
    defaultKey: settings?.default_key ?? DEFAULT_WORKSPACE_SETTINGS.defaultKey,
    defaultLicense:
      settings?.default_license ?? DEFAULT_WORKSPACE_SETTINGS.defaultLicense,
    defaultMood:
      settings?.default_mood ?? DEFAULT_WORKSPACE_SETTINGS.defaultMood,
    defaultPrivacyStatus:
      settings?.default_privacy_status ??
      DEFAULT_WORKSPACE_SETTINGS.defaultPrivacyStatus,
    defaultStorageLocation:
      settings?.default_storage_location ??
      DEFAULT_WORKSPACE_SETTINGS.defaultStorageLocation,
    defaultYoutubeChannelId:
      settings?.default_youtube_channel_id ??
      DEFAULT_WORKSPACE_SETTINGS.defaultYoutubeChannelId,
    extractStemsOnUpload:
      settings?.extract_stems_on_upload ??
      DEFAULT_WORKSPACE_SETTINGS.extractStemsOnUpload,
    notifyBillingPayments:
      settings?.notify_billing_payments ??
      DEFAULT_WORKSPACE_SETTINGS.notifyBillingPayments,
    notifyGenerationCompletions:
      settings?.notify_generation_completions ??
      DEFAULT_WORKSPACE_SETTINGS.notifyGenerationCompletions,
    notifyMarketingEmails:
      settings?.notify_marketing_emails ??
      DEFAULT_WORKSPACE_SETTINGS.notifyMarketingEmails,
    notifyProductUpdates:
      settings?.notify_product_updates ??
      DEFAULT_WORKSPACE_SETTINGS.notifyProductUpdates,
    timezone: settings?.timezone ?? DEFAULT_WORKSPACE_SETTINGS.timezone,
  };
}
