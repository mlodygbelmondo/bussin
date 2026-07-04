import { mockUser, mockWorkspaceId } from "@/lib/app-config";
import { APP_NAME } from "@/lib/app-public-config";
import type { BillingPageData } from "@/modules/billing/billing.types";
import type { ChannelsScreenData } from "@/modules/channels/channels.types";
import type { OnboardingData } from "@/modules/onboarding/onboarding.types";
import type { FeedData } from "@/modules/feed/feed.types";

const now = Date.now();

export const mockFeedData: FeedData = {
  connections: {
    channelTitle: "Bussin Beats",
    sunoConnected: true,
    youtubeConnected: true,
  },
  groups: [
    {
      createdAt: new Date(now - 4 * 60 * 1000).toISOString(),
      failureReason: null,
      id: "feed-group-1",
      prompt: "Chill lofi beats with vinyl crackle for late-night studying",
      status: "running",
      trackCount: 2,
      tracks: [
        {
          audioUrl: null,
          coverUrl: null,
          description: "Laid-back lofi instrumental with dusty drums.",
          durationSeconds: 180,
          failureReason: null,
          id: "feed-track-1",
          retryTarget: null,
          scheduledAt: null,
          status: "preview_ready",
          tags: ["lofi", "instrumental", "bussin"],
          title: "Midnight Rain",
          uploadId: null,
          youtubeVideoId: null,
        },
        {
          audioUrl: null,
          coverUrl: null,
          description: null,
          durationSeconds: null,
          failureReason: null,
          id: "feed-track-2",
          retryTarget: null,
          scheduledAt: null,
          status: "generating",
          tags: [],
          title: "Untitled track",
          uploadId: null,
          youtubeVideoId: null,
        },
      ],
    },
    {
      createdAt: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
      failureReason: null,
      id: "feed-group-2",
      prompt: "Dreamy synthwave for a neon city drive",
      status: "completed",
      trackCount: 2,
      tracks: [
        {
          audioUrl: null,
          coverUrl: null,
          description: "Retro synthwave cruiser.",
          durationSeconds: 204,
          failureReason: null,
          id: "feed-track-3",
          retryTarget: null,
          scheduledAt: new Date(now + 20 * 60 * 60 * 1000).toISOString(),
          status: "scheduled",
          tags: ["synthwave", "instrumental"],
          title: "Neon Drift",
          uploadId: "feed-upload-1",
          youtubeVideoId: null,
        },
        {
          audioUrl: null,
          coverUrl: null,
          description: "Uptempo synthwave closer.",
          durationSeconds: 198,
          failureReason: null,
          id: "feed-track-4",
          retryTarget: null,
          scheduledAt: null,
          status: "published",
          tags: ["synthwave", "instrumental"],
          title: "Chrome Sunset",
          uploadId: "feed-upload-2",
          youtubeVideoId: "dQw4w9WgXcQ",
        },
      ],
    },
  ],
  hasActiveWork: true,
  usage: {
    limit: 10,
    plan: "trial",
    used: 4,
  },
  user: {
    displayName: mockUser.name,
    email: mockUser.email,
    initials: "AM",
  },
};
const proLimits = {
  monthlyGenerationRequests: 500,
  monthlyUploads: 500,
  scheduledUploads: 500,
  youtubeChannels: 5,
} as const;
const mockWorkspaceSettings = {
  autoNormalizeAudio: true,
  defaultBpm: 120,
  defaultFormat: "MP3 320kbps",
  defaultGenre: "Synthwave",
  defaultImageAssetId: null,
  defaultKey: "auto",
  defaultLicense: "Standard License",
  defaultMood: "Night Drive",
  defaultPrivacyStatus: "private" as const,
  defaultStorageLocation: "library",
  defaultYoutubeChannelId: null,
  extractStemsOnUpload: false,
  notifyBillingPayments: true,
  notifyGenerationCompletions: true,
  notifyMarketingEmails: false,
  notifyProductUpdates: true,
  timezone: "America/Los_Angeles",
};
const paidPlans = [
  {
    displayName: "Creator",
    features: ["2 YouTube channels", "100 monthly uploads", "100 generations"],
    monthlyPriceUsd: 19,
    plan: "creator" as const,
  },
  {
    displayName: "Pro",
    features: ["5 YouTube channels", "500 monthly uploads", "500 generations"],
    monthlyPriceUsd: 49,
    plan: "pro" as const,
  },
  {
    displayName: "Studio",
    features: [
      "15 YouTube channels",
      "2,000 monthly uploads",
      "2,000 generations",
    ],
    monthlyPriceUsd: 99,
    plan: "studio" as const,
  },
];
const channelA = {
  handle: "@midnightmood",
  id: "mock-channel-midnight",
  thumbnailUrl: null,
  title: "Midnight Mood",
};
const channelB = {
  handle: "@focusfuel",
  id: "mock-channel-focus",
  thumbnailUrl: null,
  title: "Focus Fuel",
};
const imageA = {
  fileName: "neon-skyline.png",
  id: "mock-image-neon",
  publicUrl: null,
  source: "uploaded" as const,
  storagePath: `${mockWorkspaceId}/mock-image-neon.png`,
};
const imageB = {
  fileName: "rain-lobby.png",
  id: "mock-image-rain",
  publicUrl: null,
  source: "generated_later" as const,
  storagePath: `${mockWorkspaceId}/mock-image-rain.png`,
};

export const mockChannelsScreenData: ChannelsScreenData = {
  channels: [
    {
      ...channelA,
      connectedAccount: mockUser.email,
      isDefault: true,
      lastSyncLabel: "12m ago",
      status: "connected",
      statusLabel: "Connected",
      statusTone: "emerald",
      subscribersLabel: "128K subscribers",
      youtubeChannelId: "UC_MOCK_MIDNIGHT",
      youtubeConnectionId: "mock-youtube-connection",
    },
    {
      ...channelB,
      connectedAccount: mockUser.email,
      isDefault: false,
      lastSyncLabel: "1h ago",
      status: "error",
      statusLabel: "Sync issue",
      statusTone: "red",
      subscribersLabel: "42K subscribers",
      youtubeChannelId: "UC_MOCK_FOCUS",
      youtubeConnectionId: "mock-youtube-connection",
    },
  ],
  counts: { connected: 1, healthy: 1, issues: 1 },
  defaultChannel: null,
  hasPlanLimitReached: false,
  plan: { limit: 5, name: "pro", usage: 2 },
  suno: {
    checkedLabel: "Checked 8m ago",
    creditsLabel: "184 / 500",
    emailLabel: "Member since today",
    id: "mock-suno-connection",
    label: "Mock Suno Account",
    status: "connected",
    statusLabel: "Connected",
    statusTone: "emerald",
  },
  workspaceId: mockWorkspaceId,
};
mockChannelsScreenData.defaultChannel =
  mockChannelsScreenData.channels[0] ?? null;

export const mockBillingPageData: BillingPageData = {
  cancelAtPeriodEnd: false,
  channels: [
    { ...channelA, isDefault: true },
    { ...channelB, isDefault: false },
  ],
  currentPeriodEnd: new Date(now + 12 * 24 * 60 * 60_000).toISOString(),
  currentPeriodStart: new Date(now - 18 * 24 * 60 * 60_000).toISOString(),
  imageAssets: [imageA, imageB],
  limits: proLimits,
  monthlyPriceUsd: 49,
  plan: "pro",
  planDisplayName: "Pro",
  settings: mockWorkspaceSettings,
  status: "active",
  upgradeOptions: paidPlans,
  usage: {
    connectedChannels: 2,
    generatedTracks: 184,
    scheduledUploads: 9,
    uploadedVideos: 64,
  },
  usageMetrics: [
    { key: "generatedTracks", label: "Generations", limit: 500, used: 184 },
    { key: "uploadedVideos", label: "Uploads", limit: 500, used: 64 },
    { key: "connectedChannels", label: "Channels", limit: 5, used: 2 },
    { key: "scheduledUploads", label: "Scheduled", limit: 500, used: 9 },
  ],
  workspaceId: mockWorkspaceId,
};

export const mockOnboardingData: OnboardingData = {
  sunoConnections: [
    {
      id: "mock-suno-connection",
      label: "Mock Suno Account",
      maskedApiUrl: "https://api.example.test",
      maskedCookie: "Stored securely",
      status: "connected",
      workspace_id: mockWorkspaceId,
    },
  ],
  workspace: {
    id: mockWorkspaceId,
    name: `${APP_NAME} Demo Workspace`,
    onboarding_completed: true,
  },
  workspaceDefaults: {
    defaultChannelId: channelA.id,
    imageBehavior: "auto",
    privacyStatus: "public",
    timezone: "America/Los_Angeles",
  },
  youtubeChannels: [
    {
      ...channelA,
      id: channelA.id,
      is_default: true,
      status: "connected",
      workspace_id: mockWorkspaceId,
      youtube_channel_id: "UC_MOCK_MIDNIGHT",
    },
  ],
  youtubeConnections: [
    {
      id: "mock-youtube-connection",
      status: "connected",
      workspace_id: mockWorkspaceId,
    },
  ],
};
