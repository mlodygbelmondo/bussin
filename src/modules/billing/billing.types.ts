import type { BillingPlan } from "@/server/validators/billing.validator";
import type { PLAN_LIMITS } from "@/server/services/plan-limits.service";

export type BillingUsageMetric = {
  key:
    | "generatedTracks"
    | "uploadedVideos"
    | "connectedChannels"
    | "scheduledUploads";
  label: string;
  limit: number;
  used: number;
};

export type BillingPageData = {
  workspaceId: string;
  plan: BillingPlan;
  planDisplayName: string;
  monthlyPriceUsd: number;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  currentPeriodStart: string | null;
  usage: {
    generatedTracks: number;
    uploadedVideos: number;
    connectedChannels: number;
    scheduledUploads: number;
  };
  usageMetrics: BillingUsageMetric[];
  limits: (typeof PLAN_LIMITS)[BillingPlan];
  upgradeOptions: Array<{
    displayName: string;
    features: string[];
    monthlyPriceUsd: number;
    plan: Exclude<BillingPlan, "trial">;
  }>;
  channels: Array<{
    handle: string | null;
    id: string;
    isDefault: boolean;
    title: string;
  }>;
  imageAssets: Array<{
    fileName: string | null;
    id: string;
    publicUrl: string | null;
    storagePath: string;
  }>;
  settings: WorkspaceSettingsData;
};

export type WorkspaceSettingsData = {
  autoNormalizeAudio: boolean;
  defaultBpm: number;
  defaultFormat: string;
  defaultGenre: string;
  defaultImageAssetId: string | null;
  defaultKey: string;
  defaultLicense: string;
  defaultMood: string;
  defaultPrivacyStatus: "private" | "unlisted" | "public";
  defaultStorageLocation: string;
  defaultYoutubeChannelId: string | null;
  extractStemsOnUpload: boolean;
  notifyBillingPayments: boolean;
  notifyGenerationCompletions: boolean;
  notifyMarketingEmails: boolean;
  notifyProductUpdates: boolean;
  timezone: string;
  youtubeDescriptionTemplate: string | null;
  youtubeTitleTemplate: string | null;
};
