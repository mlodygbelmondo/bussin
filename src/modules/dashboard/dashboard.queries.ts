import { createClient } from "@/lib/supabase/server";
import { isMockMode } from "@/lib/app-config";
import { mockDashboardHomeData } from "@/modules/dev/mock-data";
import type { Database } from "@/lib/database.types";
import type {
  DashboardActivity,
  DashboardHomeData,
  DashboardKpi,
  DashboardQueueItem,
  DashboardTopTrack,
} from "@/modules/dashboard/dashboard.types";

type TrackRow = Pick<
  Database["public"]["Tables"]["tracks"]["Row"],
  "created_at" | "duration_seconds" | "status" | "title" | "updated_at"
>;
type GenerationRow = Pick<
  Database["public"]["Tables"]["generation_requests"]["Row"],
  "created_at" | "status" | "track_count"
>;
type UploadRow = Pick<
  Database["public"]["Tables"]["youtube_uploads"]["Row"],
  "created_at" | "scheduled_at" | "status" | "title" | "uploaded_at"
>;
type ActivityRow = Pick<
  Database["public"]["Tables"]["audit_logs"]["Row"],
  "action" | "created_at" | "entity_type"
>;

const FALLBACK_LIMIT = 10000;

export async function getDashboardHomeData(
  userId: string,
): Promise<DashboardHomeData | null> {
  if (isMockMode) {
    return mockDashboardHomeData;
  }

  const supabase = await createClient();
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
    profileResult,
    usageResult,
    subscriptionResult,
    sunoResult,
    tracksResult,
    generationsResult,
    uploadsResult,
    activityResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("usage_counters")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("plan, status, current_period_end")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    supabase
      .from("suno_connections")
      .select("credits_left, monthly_limit, monthly_usage, status")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("tracks")
      .select("created_at, duration_seconds, status, title, updated_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("generation_requests")
      .select("created_at, status, track_count")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("youtube_uploads")
      .select("created_at, scheduled_at, status, title, uploaded_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("audit_logs")
      .select("action, created_at, entity_type")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const usage = usageResult.data;
  const suno = sunoResult.data;
  const tracks = tracksResult.data ?? [];
  const generations = generationsResult.data ?? [];
  const uploads = uploadsResult.data ?? [];
  const activity = activityResult.data ?? [];
  const sunoLimit = suno?.monthly_limit ?? FALLBACK_LIMIT;
  const sunoCredits =
    suno?.monthly_usage ?? usage?.generated_tracks_count ?? tracks.length;
  const generatedTotal =
    usage?.generated_tracks_count ??
    generations.reduce((total, item) => total + item.track_count, 0);
  const pendingApprovals = tracks.filter((track) =>
    ["preview_ready", "ready"].includes(track.status),
  ).length;
  const scheduledUploads =
    usage?.scheduled_uploads_count ??
    uploads.filter((upload) => upload.status === "scheduled").length;
  const uploadedThisWeek =
    usage?.uploaded_videos_count ??
    uploads.filter((upload) => upload.status === "uploaded").length;
  const queueActive = generations.filter((request) =>
    ["queued", "running"].includes(request.status),
  ).length;
  const failedJobs =
    generations.filter((request) => request.status === "failed").length +
    tracks.filter((track) => track.status === "failed").length +
    uploads.filter((upload) => upload.status === "failed").length;
  const isEmpty =
    generatedTotal === 0 &&
    tracks.length === 0 &&
    generations.length === 0 &&
    uploads.length === 0;

  return {
    activity: toActivity(activity),
    generatedTotal,
    hasFailures: failedJobs > 0,
    isEmpty,
    kpis: toKpis({
      generatedTotal,
      pendingApprovals,
      queueActive,
      scheduledUploads,
      sunoCredits,
      sunoLimit,
      uploadedThisWeek,
    }),
    planName: toPlanName(subscriptionResult.data?.plan),
    queue: toQueue(generations, uploads, tracks),
    queueActive,
    queueCapacity: Math.max(5, queueActive),
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
    sunoCredits,
    sunoLimit,
    sunoResetLabel: "Current billing period",
    topTracks: toTopTracks(tracks),
    uploadPerformance: {
      comments: "0",
      likes: "0",
      listeners: "0",
      totalPlays: "0",
    },
    userDisplayName:
      profileResult.data?.full_name?.split(" ")[0] ??
      profileResult.data?.email?.split("@")[0] ??
      "User",
    workspaceId,
  };
}

function toKpis(values: {
  generatedTotal: number;
  pendingApprovals: number;
  queueActive: number;
  scheduledUploads: number;
  sunoCredits: number;
  sunoLimit: number;
  uploadedThisWeek: number;
}): DashboardKpi[] {
  return [
    {
      icon: "tracks",
      label: "Generated tracks",
      tone: "violet",
      trendLabel: "Total",
      trendTone: "neutral",
      value: String(values.generatedTotal),
    },
    {
      icon: "approval",
      label: "Pending approvals",
      tone: "amber",
      trendLabel: values.pendingApprovals > 0 ? "Needs review" : "Clear",
      trendTone: values.pendingApprovals > 0 ? "warning" : "neutral",
      value: String(values.pendingApprovals),
    },
    {
      icon: "calendar",
      label: "Scheduled uploads",
      tone: "cyan",
      trendLabel: "Queued",
      trendTone: "neutral",
      value: String(values.scheduledUploads),
    },
    {
      icon: "upload",
      label: "Uploaded this week",
      tone: "emerald",
      trendLabel: "This period",
      trendTone: "neutral",
      value: String(values.uploadedThisWeek),
    },
    {
      icon: "limit",
      label: "Suno limits",
      tone: "violet",
      trendLabel: "Resets in 12 days",
      trendTone: "neutral",
      value: `${formatNumber(values.sunoCredits)} / ${formatLimit(values.sunoLimit)}`,
    },
    {
      icon: "queue",
      label: "Queue status",
      tone: "violet",
      trendLabel: "In progress",
      trendTone: "neutral",
      value: `${values.queueActive} / ${Math.max(5, values.queueActive)}`,
    },
  ];
}

function toQueue(
  generations: GenerationRow[],
  uploads: UploadRow[],
  tracks: TrackRow[],
): DashboardQueueItem[] {
  const generationItems: DashboardQueueItem[] = generations
    .filter((item) => ["queued", "running", "failed"].includes(item.status))
    .slice(0, 2)
    .map((item, index) => ({
      actionLabel: item.status === "failed" ? "Retry" : "Cancel",
      progress:
        item.status === "queued" ? 45 : item.status === "failed" ? 18 : 72,
      scheduledLabel: "-",
      status:
        item.status === "failed"
          ? "Failed"
          : index === 0
            ? "Generating"
            : "Processing",
      title: `Generation request ${index + 1}`,
      tone: item.status === "failed" ? "red" : index === 0 ? "violet" : "blue",
    }));
  const scheduledItems: DashboardQueueItem[] = uploads
    .filter((item) => item.status === "scheduled")
    .slice(0, 1)
    .map((item) => ({
      actionLabel: "Reschedule",
      progress: null,
      scheduledLabel: item.scheduled_at
        ? formatScheduled(item.scheduled_at)
        : "Not scheduled",
      status: "Scheduled",
      title: item.title || "Sunset Boulevard",
      tone: "cyan",
    }));
  const trackItems: DashboardQueueItem[] = tracks
    .filter((track) =>
      ["generating", "polling", "rendering"].includes(track.status),
    )
    .slice(0, 3)
    .map((track, index) => ({
      actionLabel: "Cancel",
      progress: index === 0 ? 72 : 45,
      scheduledLabel: "-",
      status: index === 0 ? "Generating" : "Processing",
      title: track.title || "Untitled Track",
      tone: index === 0 ? "violet" : "blue",
    }));

  return [...trackItems, ...generationItems, ...scheduledItems].slice(0, 3);
}

function toTopTracks(tracks: TrackRow[]): DashboardTopTrack[] {
  return tracks.slice(0, 5).map((track, index) => ({
    duration: formatDuration(track.duration_seconds ?? 240),
    plays: "0",
    progress: Math.max(16, 100 - index * 16),
    title: track.title ?? "Untitled Track",
  }));
}

function toActivity(activity: ActivityRow[]): DashboardActivity[] {
  const mapped = activity.map((item) => ({
    icon: item.entity_type === "youtube_upload" ? "youtube" : "wave",
    label: sentenceCase(item.action),
    time: relativeTime(item.created_at),
  })) satisfies DashboardActivity[];

  return mapped;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = String(seconds % 60).padStart(2, "0");

  return `${minutes}:${remaining}`;
}

function formatLimit(value: number): string {
  return value >= 1000 ? `${Math.round(value / 1000)}k` : String(value);
}

function formatNumber(value: number): string {
  return Intl.NumberFormat("en").format(value);
}

function formatScheduled(value: string): string {
  return Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function relativeTime(value: string): string {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const hours = Math.max(1, Math.round(diff / 3_600_000));

  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

function sentenceCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function toPlanName(plan: string | null | undefined): string {
  return plan ? `${sentenceCase(plan)} Plan` : "Trial Plan";
}
