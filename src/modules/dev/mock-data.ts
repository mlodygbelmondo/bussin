import { APP_NAME, mockUser, mockWorkspaceId } from "@/lib/app-config";
import type { BillingPageData } from "@/modules/billing/billing.types";
import type { ChannelsScreenData } from "@/modules/channels/channels.types";
import type { DashboardHomeData } from "@/modules/dashboard/dashboard.types";
import type { GenerateScreenData } from "@/modules/generation/generation.types";
import type {
  LibraryFilters,
  LibraryScreenData,
  LibraryTrack,
} from "@/modules/library/library.types";
import type { OnboardingData } from "@/modules/onboarding/onboarding.types";
import type {
  QueueGroup,
  QueueScreenData,
  QueueTrackItem,
} from "@/modules/queue/queue.types";
import type {
  ScheduledDay,
  ScheduledFilters,
  ScheduledScreenData,
  ScheduledUpload,
} from "@/modules/scheduled/scheduled.types";
import type { TrackPreviewData } from "@/modules/tracks/track-preview.types";

const now = Date.now();
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

export const mockDashboardShell = {
  creditsLabel: "184 / 500",
  displayName: mockUser.name,
  email: mockUser.email,
  initials: "AM",
  planName: "Pro Plan",
  resetLabel: "Current billing period",
  usagePercent: 37,
};

export const mockDashboardHomeData: DashboardHomeData = {
  activity: [
    { icon: "wave", label: "Neon Skyline finished rendering", time: "4m ago" },
    {
      icon: "calendar",
      label: "Rain Lobby scheduled for tonight",
      time: "18m ago",
    },
    { icon: "youtube", label: "Midnight Mood channel synced", time: "1h ago" },
    { icon: "warning", label: "One upload needs attention", time: "2h ago" },
  ],
  generatedTotal: 42,
  hasFailures: true,
  isEmpty: false,
  kpis: [
    {
      icon: "tracks",
      label: "Generated tracks",
      tone: "violet",
      trendLabel: "Total",
      trendTone: "positive",
      value: "42",
    },
    {
      icon: "approval",
      label: "Pending approvals",
      tone: "amber",
      trendLabel: "Needs review",
      trendTone: "warning",
      value: "3",
    },
    {
      icon: "calendar",
      label: "Scheduled uploads",
      tone: "cyan",
      trendLabel: "Queued",
      trendTone: "neutral",
      value: "9",
    },
    {
      icon: "upload",
      label: "Uploaded this week",
      tone: "emerald",
      trendLabel: "This period",
      trendTone: "positive",
      value: "12",
    },
    {
      icon: "limit",
      label: "Suno limits",
      tone: "violet",
      trendLabel: "Resets in 12 days",
      trendTone: "neutral",
      value: "184 / 500",
    },
    {
      icon: "queue",
      label: "Queue status",
      tone: "violet",
      trendLabel: "In progress",
      trendTone: "neutral",
      value: "4 / 5",
    },
  ],
  planName: "Pro",
  queue: [
    {
      actionLabel: "Review",
      progress: null,
      scheduledLabel: "Ready now",
      status: "Scheduled",
      title: "Neon Skyline",
      tone: "cyan",
    },
    {
      actionLabel: "Inspect",
      progress: 72,
      scheduledLabel: "Rendering",
      status: "Processing",
      title: "Chrome Drift",
      tone: "blue",
    },
    {
      actionLabel: "Retry",
      progress: 85,
      scheduledLabel: "Worker failed",
      status: "Failed",
      title: "Dust Circuit",
      tone: "red",
    },
  ],
  queueActive: 4,
  queueCapacity: 5,
  quickActions: [
    {
      description: "Create a new instrumental with AI.",
      href: "/dashboard/generate",
      icon: "rocket",
      label: "New generation",
    },
    {
      description: "Upload and publish your track to YouTube.",
      href: "/dashboard/library",
      icon: "upload",
      label: "Upload asset",
    },
    {
      description: "Connect or manage your YouTube channel.",
      href: "/dashboard/channels",
      icon: "youtube",
      label: "Connect channel",
    },
  ],
  sunoCredits: 184,
  sunoLimit: 500,
  sunoResetLabel: "Current billing period",
  topTracks: [
    { duration: "2:45", plays: "12.4K", progress: 92, title: "Neon Skyline" },
    { duration: "3:10", plays: "8.1K", progress: 74, title: "Rain Lobby" },
    { duration: "2:30", plays: "5.8K", progress: 58, title: "Soft Engines" },
  ],
  uploadPerformance: {
    comments: "128",
    likes: "2.4K",
    listeners: "18.7K",
    totalPlays: "245.6K",
  },
  userDisplayName: "Alex",
  workspaceId: mockWorkspaceId,
};

export const mockGenerateScreenData: GenerateScreenData = {
  channels: [
    { ...channelA, isDefault: true, status: "connected" },
    { ...channelB, isDefault: false, status: "connected" },
  ],
  defaults: {
    durationSeconds: 150,
    mood: "Nostalgic, Uplifting",
    style: "Synthwave, Retrowave",
    trackCount: 1,
  },
  hasSunoConnection: true,
  images: [imageA, imageB],
  plan: {
    availableCredits: 316,
    currentUsage: 184,
    limit: 500,
    name: "pro",
    planLimitReached: false,
  },
  workspaceId: mockWorkspaceId,
};

const mockTracks: LibraryTrack[] = [
  {
    canPublish: true,
    channel: channelA,
    coverUrl: null,
    createdAt: new Date(now - 18 * 60_000).toISOString(),
    durationLabel: "2:45",
    durationSeconds: 165,
    failureReason: null,
    generationId: "mock-generation-1",
    imageAssetId: imageA.id,
    mood: "Late-night, confident",
    prompt: "Driving synthwave with cinematic pads and a clean hook.",
    status: "preview_ready",
    statusLabel: "Preview ready",
    statusTone: "violet",
    style: "Synthwave",
    tags: ["synthwave", "night-drive", "instrumental"],
    title: "Neon Skyline",
    trackId: "mock-track-neon",
    uploadStatus: null,
  },
  {
    canPublish: false,
    channel: channelB,
    coverUrl: null,
    createdAt: new Date(now - 2 * 60 * 60_000).toISOString(),
    durationLabel: "3:10",
    durationSeconds: 190,
    failureReason: null,
    generationId: "mock-generation-2",
    imageAssetId: imageB.id,
    mood: "Calm, focused",
    prompt: "Warm lo-fi keys with light percussion and rain ambience.",
    status: "uploaded",
    statusLabel: "Uploaded",
    statusTone: "emerald",
    style: "Lo-fi",
    tags: ["lo-fi", "focus", "rain"],
    title: "Rain Lobby",
    trackId: "mock-track-rain",
    uploadStatus: "uploaded",
  },
  {
    canPublish: false,
    channel: null,
    coverUrl: null,
    createdAt: new Date(now - 4 * 60 * 60_000).toISOString(),
    durationLabel: "2:00",
    durationSeconds: 120,
    failureReason: "Mock worker could not render the static video.",
    generationId: "mock-generation-3",
    imageAssetId: null,
    mood: "Tense",
    prompt: "Industrial beat with distorted percussion.",
    status: "failed",
    statusLabel: "Failed",
    statusTone: "red",
    style: "Industrial",
    tags: ["industrial", "test-error"],
    title: "Dust Circuit",
    trackId: "mock-track-dust",
    uploadStatus: "failed",
  },
];

export function getMockLibraryScreenData(
  filters: LibraryFilters,
  pageNumber: number,
): LibraryScreenData {
  const query = filters.query.trim().toLowerCase();
  const filtered = mockTracks.filter((track) => {
    const matchesQuery =
      !query ||
      [track.title, track.style, track.mood, track.prompt]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesStatus =
      filters.status === "all" || track.status === filters.status;
    const matchesChannel =
      filters.channel === "all" || track.channel?.id === filters.channel;
    const matchesMood =
      filters.mood === "all" ||
      track.mood?.toLowerCase().includes(filters.mood.toLowerCase());

    return matchesQuery && matchesStatus && matchesChannel && matchesMood;
  });
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(Math.max(1, pageNumber), totalPages);
  const start = (current - 1) * pageSize;
  const tracks = filtered.slice(start, start + pageSize);

  return {
    channels: [channelA, channelB],
    counts: { all: mockTracks.length, filtered: filtered.length },
    filters: {
      channels: [
        { label: "All", value: "all" },
        { label: channelA.title, value: channelA.id },
        { label: channelB.title, value: channelB.id },
      ],
      moods: [
        { label: "All moods", value: "all" },
        { label: "Late-night", value: "late-night" },
        { label: "Calm", value: "calm" },
      ],
      statuses: [
        { label: "All statuses", value: "all" },
        { label: "Preview ready", value: "preview_ready" },
        { label: "Uploaded", value: "uploaded" },
        { label: "Failed", value: "failed" },
      ],
    },
    isEmpty: false,
    page: {
      current,
      end: start + tracks.length,
      hasNext: current < totalPages,
      hasPrevious: current > 1,
      pageSize,
      start: tracks.length ? start + 1 : 0,
      totalPages,
    },
    tracks,
    workspaceId: mockWorkspaceId,
  };
}

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

const queueItems: QueueTrackItem[] = [
  {
    actionTargetId: "mock-track-neon",
    actionTargetType: "track",
    artTone: 0,
    createdLabel: "18m ago",
    failureReason: null,
    id: "mock-track-neon",
    meta: "Synthwave · 2:45 · Late-night",
    progress: null,
    requestId: "mock-generation-1",
    status: "preview_ready",
    statusLabel: "Preview ready",
    title: "Neon Skyline",
  },
  {
    actionTargetId: "mock-render-chrome",
    actionTargetType: "video_render",
    artTone: 1,
    createdLabel: "28m ago",
    failureReason: null,
    id: "mock-track-chrome",
    meta: "Cyberpunk · 3:00 · Focused",
    progress: 82,
    requestId: "mock-generation-4",
    status: "rendering",
    statusLabel: "Rendering",
    title: "Chrome Drift",
  },
  {
    actionTargetId: "mock-upload-rain",
    actionTargetType: "youtube_upload",
    artTone: 2,
    createdLabel: "2h ago",
    failureReason: null,
    id: "mock-track-rain",
    meta: "Lo-fi · 3:10 · Calm",
    progress: 100,
    requestId: "mock-generation-2",
    status: "uploaded",
    statusLabel: "Uploaded",
    title: "Rain Lobby",
  },
  {
    actionTargetId: "mock-render-dust",
    actionTargetType: "video_render",
    artTone: 3,
    createdLabel: "4h ago",
    failureReason: "Mock worker could not render the static video.",
    id: "mock-track-dust",
    meta: "Industrial · 2:00 · Tense",
    progress: 85,
    requestId: "mock-generation-3",
    status: "failed",
    statusLabel: "Render failed",
    title: "Dust Circuit",
  },
];

export function getMockGenerationQueueData(filters: {
  query?: string;
  status?: string;
}): QueueScreenData {
  const items = queueItems.filter((item) => {
    const query = filters.query?.trim().toLowerCase();
    const status = filters.status?.trim() ?? "all";
    const group = groupForStatus(item.status);

    return (
      (!query || `${item.title} ${item.meta}`.toLowerCase().includes(query)) &&
      (status === "all" || item.status === status || group === status)
    );
  });
  const groups = buildQueueGroups(items);
  const rawGroups = buildQueueGroups(queueItems);

  return {
    counts: {
      all: queueItems.length,
      complete:
        rawGroups.find((group) => group.id === "complete")?.items.length ?? 0,
      inProgress:
        rawGroups.find((group) => group.id === "in_progress")?.items.length ??
        0,
      needsReview:
        rawGroups.find((group) => group.id === "needs_review")?.items.length ??
        0,
    },
    groups,
    hasFailedRender: items.some((item) => item.status === "failed"),
    hasUploadsWaiting: true,
    isEmpty: false,
    total: items.length,
    updatedLabel: "Mock data, no worker required",
    workspaceId: mockWorkspaceId,
  };
}

export function getMockScheduledUploadsData(
  filters: ScheduledFilters,
): ScheduledScreenData {
  const timezone = filters.timezone || "UTC";
  const weekStart = startOfWeek(new Date());
  const days = buildMockDays(weekStart, timezone);
  const uploads = buildMockUploads(weekStart);
  const filtered = uploads.filter((upload) => {
    const query = filters.query.trim().toLowerCase();

    return (
      (filters.channel === "all" || upload.channel?.id === filters.channel) &&
      (filters.status === "all" || upload.status === filters.status) &&
      (!query ||
        [upload.title, upload.channel?.title, upload.statusLabel]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query))
    );
  });

  return {
    channels: [channelA, channelB],
    counts: { all: uploads.length, filtered: filtered.length, upcoming: 3 },
    days,
    filters: {
      channels: [
        { label: "All channels", value: "all" },
        { label: channelA.title, value: channelA.id },
        { label: channelB.title, value: channelB.id },
      ],
      statuses: [
        { label: "All statuses", value: "all" },
        { label: "Scheduled", value: "scheduled" },
        { label: "Queued", value: "draft" },
        { label: "Uploading", value: "uploading" },
        { label: "Uploaded", value: "uploaded" },
        { label: "Failed", value: "failed" },
        { label: "Canceled", value: "cancelled" },
      ],
    },
    isEmpty: false,
    summary: {
      nextUploadLabel: "Today · 7:30 PM",
      timezoneLabel: timezone.replaceAll("_", " "),
      totalThisWeek: uploads.length,
    },
    timezone,
    timezoneLabel: timezone.replaceAll("_", " "),
    upcomingUploads: uploads,
    uploads: filtered,
    weekLabel: "Mock publishing week",
    weekStart: weekStart.toISOString(),
    workspaceId: mockWorkspaceId,
  };
}

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

export function getMockTrackPreviewData(trackId: string): TrackPreviewData {
  const track =
    mockTracks.find((item) => item.trackId === trackId) ?? mockTracks[0];

  return {
    audioUrl: null,
    channel: track.channel,
    coverUrl: track.coverUrl,
    createdAt: track.createdAt,
    description: `Immerse yourself in a polished instrumental track generated by ${APP_NAME}. Review the metadata, choose a channel, and approve when the release package is ready.`,
    durationSeconds: track.durationSeconds ?? 165,
    failureReason: track.failureReason,
    generation: {
      finalPrompt: track.prompt,
      id: track.generationId,
      mood: track.mood,
      publishMode: "schedule_later",
      scheduledAt: new Date(now + 6 * 60 * 60_000).toISOString(),
      style: track.style,
    },
    imageAssetId: track.imageAssetId,
    imageMeta: {
      fileName: "mock-cover.png",
      height: 1024,
      source: "mock",
      width: 1024,
    },
    mood: track.mood,
    render: {
      failureReason: track.failureReason,
      id: "mock-render-1",
      status: track.status === "failed" ? "failed" : "completed",
      videoStoragePath: null,
    },
    status:
      track.status === "failed"
        ? "failed"
        : track.status === "uploaded"
          ? "uploaded"
          : "preview_ready",
    style: track.style,
    tags: track.tags,
    title: track.title,
    trackId: track.trackId,
    trackStatus: track.status,
    upload:
      track.uploadStatus === "uploaded"
        ? {
            failureReason: null,
            id: "mock-upload-1",
            scheduledAt: null,
            status: "uploaded",
            uploadedAt: new Date(now - 60 * 60_000).toISOString(),
          }
        : null,
    workspaceId: mockWorkspaceId,
  };
}

function buildQueueGroups(items: QueueTrackItem[]): QueueGroup[] {
  return [
    {
      description: "Generations currently being processed",
      iconTone: "blue",
      id: "in_progress",
      items: items.filter(
        (item) => groupForStatus(item.status) === "in_progress",
      ),
      title: "In progress",
    },
    {
      description: "Preview and take action on your tracks",
      iconTone: "amber",
      id: "needs_review",
      items: items.filter(
        (item) => groupForStatus(item.status) === "needs_review",
      ),
      title: "Needs review",
    },
    {
      description: "Finished generations and uploads",
      iconTone: "emerald",
      id: "complete",
      items: items.filter((item) => groupForStatus(item.status) === "complete"),
      title: "Complete",
    },
  ];
}

function groupForStatus(status: QueueTrackItem["status"]) {
  if (status === "preview_ready") {
    return "needs_review";
  }

  if (["uploaded", "failed"].includes(status)) {
    return "complete";
  }

  return "in_progress";
}

function buildMockUploads(weekStart: Date): ScheduledUpload[] {
  const times = [19, 11, 15, 20];
  const statuses = ["scheduled", "draft", "uploading", "failed"] as const;

  return times.map((hour, index) => {
    const date = new Date(weekStart);
    date.setUTCDate(date.getUTCDate() + index);
    date.setUTCHours(hour, index === 0 ? 30 : 0, 0, 0);
    const status = statuses[index];

    return {
      channel: index % 2 === 0 ? channelA : channelB,
      coverUrl: null,
      dayIndex: index,
      failureReason: status === "failed" ? "Mock upload token expired." : null,
      imageAssetId: index % 2 === 0 ? imageA.id : imageB.id,
      platform: index === 2 ? "tiktok" : "youtube",
      renderStatus: status === "draft" ? "queued" : "completed",
      scheduledAt: date.toISOString(),
      status,
      statusLabel:
        status === "draft"
          ? "Queued"
          : status[0].toUpperCase() + status.slice(1),
      statusTone:
        status === "scheduled"
          ? "cyan"
          : status === "draft"
            ? "violet"
            : status === "uploading"
              ? "blue"
              : "red",
      timeLabel:
        index === 0
          ? "7:30 PM"
          : `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`,
      timeSlot: (hour - 9) * 60,
      title:
        ["Neon Skyline", "Rain Lobby", "Chrome Drift", "Dust Circuit"][index] ??
        "Mock upload",
      trackId: queueItems[index]?.id ?? null,
      uploadId: `mock-upload-${index + 1}`,
      videoRenderId: `mock-render-${index + 1}`,
    };
  });
}

function buildMockDays(weekStart: Date, timezone: string): ScheduledDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setUTCDate(date.getUTCDate() + index);
    const parts = new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      timeZone: timezone,
      weekday: "short",
    }).formatToParts(date);
    const day = parts.find((part) => part.type === "day")?.value ?? "";
    const month = parts.find((part) => part.type === "month")?.value ?? "";

    return {
      date: date.toISOString(),
      dayLabel: parts.find((part) => part.type === "weekday")?.value ?? "",
      dayNumber: day,
      isToday: index === 0,
      monthLabel: `${month} ${day}`,
    };
  });
}

function startOfWeek(date: Date) {
  const next = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = next.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setUTCDate(next.getUTCDate() + diff);
  return next;
}
