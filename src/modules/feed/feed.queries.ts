import type { SupabaseClient } from "@supabase/supabase-js";
import { isMockMode } from "@/lib/app-config";
import type { Database } from "@/lib/database.types";
import { createWorkspaceClient } from "@/lib/supabase";
import { mockFeedData } from "@/modules/dev/mock-data";
import { getPlanLimits } from "@/server/services/plan-limits.service";
import { isGenerationRequestStatus } from "@/server/services/status-transition.service";
import { createStorageSignedUrl } from "@/server/services/storage";
import type {
  FeedData,
  FeedJobGroup,
  FeedJobGroupStatus,
  FeedRetryTarget,
  FeedTrack,
  FeedTrackStatus,
} from "@/modules/feed/feed.types";

const FEED_GROUP_LIMIT = 20;

type Supabase = SupabaseClient<Database>;

type RequestRow = Pick<
  Database["public"]["Tables"]["generation_requests"]["Row"],
  "created_at" | "failure_reason" | "id" | "status" | "style" | "track_count"
>;

type TrackRow = Pick<
  Database["public"]["Tables"]["tracks"]["Row"],
  | "audio_storage_path"
  | "description"
  | "duration_seconds"
  | "failure_reason"
  | "generation_request_id"
  | "id"
  | "image_asset_id"
  | "source_audio_url"
  | "status"
  | "tags"
  | "title"
>;

type RenderRow = Pick<
  Database["public"]["Tables"]["video_renders"]["Row"],
  "created_at" | "failure_reason" | "id" | "status" | "track_id"
>;

type UploadRow = Pick<
  Database["public"]["Tables"]["youtube_uploads"]["Row"],
  | "created_at"
  | "failure_reason"
  | "id"
  | "scheduled_at"
  | "status"
  | "track_id"
  | "youtube_video_id"
>;

type ImageRow = Pick<
  Database["public"]["Tables"]["image_assets"]["Row"],
  "id" | "public_url" | "storage_path"
>;

export async function getFeedData(userId: string): Promise<FeedData | null> {
  if (isMockMode) {
    return mockFeedData;
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
    profileResult,
    subscriptionResult,
    usageResult,
    requestsResult,
    sunoResult,
    youtubeResult,
    channelResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", userId)
      .maybeSingle(),
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
      .from("generation_requests")
      .select("id, style, status, failure_reason, track_count, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(FEED_GROUP_LIMIT),
    supabase
      .from("suno_connections")
      .select("status")
      .eq("workspace_id", workspaceId)
      .eq("status", "connected")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("youtube_connections")
      .select("status")
      .eq("workspace_id", workspaceId)
      .eq("status", "connected")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("youtube_channels")
      .select("title")
      .eq("workspace_id", workspaceId)
      .eq("status", "connected")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  for (const result of [
    profileResult,
    subscriptionResult,
    usageResult,
    requestsResult,
    sunoResult,
    youtubeResult,
    channelResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const requests = (requestsResult.data ?? []) as RequestRow[];
  const { imagesByid, rendersByTrack, tracks, uploadsByTrack } =
    await loadTrackContext(supabase, workspaceId, requests);
  const feedTracksById = new Map<string, FeedTrack[]>();

  await Promise.all(
    tracks.map(async (track) => {
      const feedTrack = await buildFeedTrack({
        image: track.image_asset_id
          ? (imagesByid.get(track.image_asset_id) ?? null)
          : null,
        render: rendersByTrack.get(track.id) ?? null,
        track,
        upload: uploadsByTrack.get(track.id) ?? null,
        userId,
        workspaceId,
      });
      const groupId = track.generation_request_id ?? "";
      const existing = feedTracksById.get(groupId) ?? [];

      existing.push(feedTrack);
      feedTracksById.set(groupId, existing);
    }),
  );

  const groups: FeedJobGroup[] = requests.map((request) => ({
    createdAt: request.created_at,
    failureReason: request.failure_reason,
    id: request.id,
    prompt: request.style,
    status: toGroupStatus(request.status),
    trackCount: request.track_count,
    tracks: feedTracksById.get(request.id) ?? [],
  }));
  const email = profileResult.data?.email ?? "";
  const displayName =
    profileResult.data?.full_name?.trim() || email.split("@")[0] || "User";
  const plan = subscriptionResult.data?.plan ?? "trial";

  return {
    connections: {
      channelTitle: channelResult.data?.title ?? null,
      sunoConnected: Boolean(sunoResult.data),
      youtubeConnected: Boolean(youtubeResult.data),
    },
    groups,
    hasActiveWork: groups.some(isGroupActive),
    usage: {
      limit: getPlanLimits(plan).monthlyGenerationRequests,
      plan,
      used: usageResult.data?.generated_tracks_count ?? 0,
    },
    user: {
      displayName,
      email,
      initials: toInitials(displayName),
    },
  };
}

async function loadTrackContext(
  supabase: Supabase,
  workspaceId: string,
  requests: RequestRow[],
) {
  const requestIds = requests.map((request) => request.id);

  if (requestIds.length === 0) {
    return {
      imagesByid: new Map<string, ImageRow>(),
      rendersByTrack: new Map<string, RenderRow>(),
      tracks: [] as TrackRow[],
      uploadsByTrack: new Map<string, UploadRow>(),
    };
  }

  const { data: trackRows, error: tracksError } = await supabase
    .from("tracks")
    .select(
      "id, generation_request_id, title, description, tags, duration_seconds, audio_storage_path, source_audio_url, image_asset_id, status, failure_reason",
    )
    .eq("workspace_id", workspaceId)
    .in("generation_request_id", requestIds)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (tracksError) {
    throw new Error(tracksError.message);
  }

  const tracks = (trackRows ?? []) as TrackRow[];
  const trackIds = tracks.map((track) => track.id);
  const imageIds = [
    ...new Set(
      tracks
        .map((track) => track.image_asset_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (trackIds.length === 0) {
    return {
      imagesByid: new Map<string, ImageRow>(),
      rendersByTrack: new Map<string, RenderRow>(),
      tracks,
      uploadsByTrack: new Map<string, UploadRow>(),
    };
  }

  const [rendersResult, uploadsResult, imagesResult] = await Promise.all([
    supabase
      .from("video_renders")
      .select("id, track_id, status, failure_reason, created_at")
      .eq("workspace_id", workspaceId)
      .in("track_id", trackIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("youtube_uploads")
      .select(
        "id, track_id, status, scheduled_at, failure_reason, youtube_video_id, created_at",
      )
      .eq("workspace_id", workspaceId)
      .in("track_id", trackIds)
      .order("created_at", { ascending: false }),
    imageIds.length
      ? supabase
          .from("image_assets")
          .select("id, storage_path, public_url")
          .eq("workspace_id", workspaceId)
          .in("id", imageIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const result of [rendersResult, uploadsResult, imagesResult]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const rendersByTrack = new Map<string, RenderRow>();

  for (const render of (rendersResult.data ?? []) as RenderRow[]) {
    if (render.track_id && !rendersByTrack.has(render.track_id)) {
      rendersByTrack.set(render.track_id, render);
    }
  }

  const uploadsByTrack = new Map<string, UploadRow>();

  for (const upload of (uploadsResult.data ?? []) as UploadRow[]) {
    if (upload.track_id && !uploadsByTrack.has(upload.track_id)) {
      uploadsByTrack.set(upload.track_id, upload);
    }
  }

  const imagesByid = new Map<string, ImageRow>(
    ((imagesResult.data ?? []) as ImageRow[]).map((image) => [image.id, image]),
  );

  return { imagesByid, rendersByTrack, tracks, uploadsByTrack };
}

async function buildFeedTrack(input: {
  image: ImageRow | null;
  render: RenderRow | null;
  track: TrackRow;
  upload: UploadRow | null;
  userId: string;
  workspaceId: string;
}): Promise<FeedTrack> {
  const { render, track, upload } = input;
  const status = deriveTrackStatus({ render, track, upload });
  const [audioUrl, coverUrl] = await Promise.all([
    status === "generating" || status === "discarded"
      ? Promise.resolve(null)
      : resolveAudioUrl(input),
    resolveCoverUrl(input),
  ]);

  return {
    audioUrl,
    coverUrl,
    description: track.description,
    durationSeconds: track.duration_seconds,
    failureReason:
      upload?.failure_reason ?? render?.failure_reason ?? track.failure_reason,
    id: track.id,
    retryTarget: deriveRetryTarget({ render, track, upload }),
    scheduledAt: upload?.status === "scheduled" ? upload.scheduled_at : null,
    status,
    tags: track.tags ?? [],
    title: track.title ?? "Untitled track",
    uploadId: upload?.id ?? null,
    youtubeVideoId: upload?.youtube_video_id ?? null,
  };
}

export function deriveTrackStatus(input: {
  render: RenderRow | null;
  track: TrackRow;
  upload: UploadRow | null;
}): FeedTrackStatus {
  const { render, track, upload } = input;

  if (track.status === "rejected") {
    return "discarded";
  }

  if (upload?.status === "uploaded" || track.status === "uploaded") {
    return "published";
  }

  if (upload?.status === "uploading") {
    return "uploading";
  }

  if (
    upload?.status === "failed" ||
    render?.status === "failed" ||
    track.status === "failed"
  ) {
    return "failed";
  }

  if (upload?.status === "scheduled") {
    return "scheduled";
  }

  if (render && ["queued", "running"].includes(render.status)) {
    return "rendering";
  }

  if (
    upload?.status === "draft" &&
    render &&
    ["completed", "rendered"].includes(render.status)
  ) {
    return "uploading";
  }

  if (track.audio_storage_path || track.source_audio_url) {
    return "preview_ready";
  }

  return "generating";
}

export function deriveRetryTarget(input: {
  render: RenderRow | null;
  track: TrackRow;
  upload: UploadRow | null;
}): FeedRetryTarget | null {
  if (input.upload?.status === "failed") {
    return { id: input.upload.id, type: "youtube_upload" };
  }

  if (input.render?.status === "failed") {
    return { id: input.render.id, type: "video_render" };
  }

  if (input.track.status === "failed") {
    return { id: input.track.id, type: "track" };
  }

  return null;
}

function toGroupStatus(status: string): FeedJobGroupStatus {
  if (isGenerationRequestStatus(status) && status !== "draft") {
    return status;
  }

  return "completed";
}

function isGroupActive(group: FeedJobGroup): boolean {
  if (group.status === "queued" || group.status === "running") {
    return true;
  }

  return group.tracks.some((track) =>
    ["generating", "rendering", "uploading"].includes(track.status),
  );
}

async function resolveAudioUrl(input: {
  track: TrackRow;
  userId: string;
  workspaceId: string;
}) {
  if (!input.track.audio_storage_path) {
    return input.track.source_audio_url;
  }

  return createStorageSignedUrl({
    bucket: "audio-assets",
    path: input.track.audio_storage_path,
    requesterUserId: input.userId,
    workspaceId: input.workspaceId,
  });
}

async function resolveCoverUrl(input: {
  image: ImageRow | null;
  userId: string;
  workspaceId: string;
}) {
  if (!input.image) {
    return null;
  }

  if (input.image.public_url) {
    return input.image.public_url;
  }

  return createStorageSignedUrl({
    bucket: "image-assets",
    path: input.image.storage_path,
    requesterUserId: input.userId,
    workspaceId: input.workspaceId,
  });
}

function toInitials(value: string): string {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}
