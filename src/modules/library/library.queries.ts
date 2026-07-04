import { createStorageSignedUrl } from "@/server/services/storage";
import { isMockMode } from "@/lib/app-config";
import { createWorkspaceClient } from "@/lib/supabase";
import { getMockLibraryScreenData } from "@/modules/dev/mock-data";
import type { Database } from "@/lib/database.types";
import type {
  LibraryChannel,
  LibraryFilters,
  LibraryScreenData,
  LibraryStatusTone,
  LibraryTrack,
} from "@/modules/library/library.types";

const PAGE_SIZE = 8;

type TrackRow = Pick<
  Database["public"]["Tables"]["tracks"]["Row"],
  | "created_at"
  | "duration_seconds"
  | "failure_reason"
  | "generation_request_id"
  | "id"
  | "image_asset_id"
  | "mood"
  | "status"
  | "style"
  | "tags"
  | "title"
  | "workspace_id"
>;
type LibrarySearchTrackRow = TrackRow & {
  total_count: number;
};

type GenerationRow = Pick<
  Database["public"]["Tables"]["generation_requests"]["Row"],
  | "final_prompt"
  | "id"
  | "image_asset_id"
  | "mood"
  | "style"
  | "target_youtube_channel_id"
>;

type ImageRow = Pick<
  Database["public"]["Tables"]["image_assets"]["Row"],
  "id" | "public_url" | "storage_path"
>;

type UploadRow = Pick<
  Database["public"]["Tables"]["youtube_uploads"]["Row"],
  "status" | "track_id" | "youtube_channel_id"
>;

type ChannelRow = Pick<
  Database["public"]["Tables"]["youtube_channels"]["Row"],
  "handle" | "id" | "thumbnail_url" | "title"
>;

type PromptRow = Pick<
  Database["public"]["Tables"]["prompt_history"]["Row"],
  "duration_seconds" | "final_prompt" | "mood" | "style"
>;

type Supabase = Awaited<ReturnType<typeof createWorkspaceClient>>;
type LibrarySearchRpcClient = Supabase & {
  rpc(
    fn: "search_library_tracks",
    args: {
      p_channel_id: string | null;
      p_created_after: string | null;
      p_limit: number;
      p_mood: string | null;
      p_offset: number;
      p_query: string | null;
      p_status: string | null;
      p_workspace_id: string;
    },
  ): Promise<{ data: LibrarySearchTrackRow[] | null; error: Error | null }>;
};

export async function getLibraryScreenData(
  userId: string,
  filters: LibraryFilters,
  pageNumber: number,
): Promise<LibraryScreenData | null> {
  if (isMockMode) {
    return getMockLibraryScreenData(filters, pageNumber);
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
  const requestedPage = Math.max(1, pageNumber);
  const [tracksResult, totalResult, channelsResult, promptsResult] =
    await Promise.all([
      searchLibraryTracks({
        filters,
        limit: PAGE_SIZE,
        offset: 0,
        supabase,
        workspaceId,
      }),
      supabase
        .from("tracks")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      supabase
        .from("youtube_channels")
        .select("id, title, handle, thumbnail_url")
        .eq("workspace_id", workspaceId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("prompt_history")
        .select("style, mood, duration_seconds, final_prompt")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  for (const result of [totalResult, channelsResult, promptsResult]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  if (tracksResult.error) {
    throw new Error(tracksResult.error.message);
  }

  let pageTracks = tracksResult.data ?? [];
  let filteredCount = Number(pageTracks[0]?.total_count ?? 0);
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;

  if (currentPage !== 1) {
    const correctedTracksResult = await searchLibraryTracks({
      filters,
      limit: PAGE_SIZE,
      offset: from,
      supabase,
      workspaceId,
    });

    if (correctedTracksResult.error) {
      throw new Error(correctedTracksResult.error.message);
    }

    pageTracks = correctedTracksResult.data ?? [];
    filteredCount = Number(pageTracks[0]?.total_count ?? filteredCount);
  }

  const generationIds = pageTracks
    .map((track) => track.generation_request_id)
    .filter((id): id is string => Boolean(id));
  const trackImageIds = pageTracks
    .map((track) => track.image_asset_id)
    .filter((id): id is string => Boolean(id));
  const trackIds = pageTracks.map((track) => track.id);
  const [generations, uploads] = await Promise.all([
    loadGenerations({ generationIds, supabase, workspaceId }),
    loadUploads({ supabase, trackIds, workspaceId }),
  ]);
  const generationImageIds = generations
    .map((generation) => generation.image_asset_id)
    .filter((id): id is string => Boolean(id));
  const images = await loadImages({
    imageIds: Array.from(new Set([...trackImageIds, ...generationImageIds])),
    supabase,
    workspaceId,
  });
  const channels = (channelsResult.data ?? []).map(toChannel);
  const generationById = new Map(generations.map((item) => [item.id, item]));
  const imageById = new Map(images.map((item) => [item.id, item]));
  const channelById = new Map(channels.map((item) => [item.id, item]));
  const uploadByTrackId = new Map<string, UploadRow>();

  for (const upload of uploads) {
    if (upload.track_id && !uploadByTrackId.has(upload.track_id)) {
      uploadByTrackId.set(upload.track_id, upload);
    }
  }
  const prompts = (promptsResult.data ?? []) as PromptRow[];
  const mappedTracks = await Promise.all(
    pageTracks.map((track) =>
      toLibraryTrack({
        channelById,
        generationById,
        imageById,
        prompts,
        track,
        uploadByTrackId,
        userId,
        workspaceId,
      }),
    ),
  );

  return {
    channels,
    counts: {
      all: totalResult.count ?? 0,
      filtered: filteredCount,
    },
    filters: {
      channels: [
        { label: "All", value: "all" },
        ...channels.map((channel) => ({
          label: channel.title,
          value: channel.id,
        })),
      ],
      moods: buildMoodOptions(mappedTracks, prompts),
      statuses: [
        { label: "All", value: "all" },
        { label: "Approved", value: "approved" },
        { label: "Published", value: "uploaded" },
        { label: "Draft", value: "draft" },
        { label: "Preview ready", value: "preview_ready" },
        { label: "Failed", value: "failed" },
      ],
    },
    isEmpty: (totalResult.count ?? 0) === 0,
    page: {
      current: currentPage,
      end: filteredCount === 0 ? 0 : from + mappedTracks.length,
      hasNext: currentPage < totalPages,
      hasPrevious: currentPage > 1,
      pageSize: PAGE_SIZE,
      start: filteredCount === 0 ? 0 : from + 1,
      totalPages,
    },
    tracks: mappedTracks,
    workspaceId,
  };
}

async function searchLibraryTracks(input: {
  filters: LibraryFilters;
  limit: number;
  offset: number;
  supabase: Supabase;
  workspaceId: string;
}) {
  return (input.supabase as LibrarySearchRpcClient).rpc(
    "search_library_tracks",
    {
      p_channel_id:
        input.filters.channel === "all" ? null : input.filters.channel,
      p_created_after:
        input.filters.date === "all" ? null : dateThreshold(input.filters.date),
      p_limit: input.limit,
      p_mood: input.filters.mood === "all" ? null : input.filters.mood,
      p_offset: input.offset,
      p_query: input.filters.query ? escapeSearch(input.filters.query) : null,
      p_status: input.filters.status === "all" ? null : input.filters.status,
      p_workspace_id: input.workspaceId,
    },
  );
}

async function loadGenerations(input: {
  generationIds: string[];
  supabase: Supabase;
  workspaceId: string;
}): Promise<GenerationRow[]> {
  if (input.generationIds.length === 0) {
    return [];
  }

  const { data, error } = await input.supabase
    .from("generation_requests")
    .select(
      "id, style, mood, target_youtube_channel_id, image_asset_id, final_prompt",
    )
    .eq("workspace_id", input.workspaceId)
    .in("id", input.generationIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as GenerationRow[];
}

async function loadImages(input: {
  imageIds: string[];
  supabase: Supabase;
  workspaceId: string;
}): Promise<ImageRow[]> {
  if (input.imageIds.length === 0) {
    return [];
  }

  const { data, error } = await input.supabase
    .from("image_assets")
    .select("id, public_url, storage_path")
    .eq("workspace_id", input.workspaceId)
    .in("id", input.imageIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ImageRow[];
}

async function loadUploads(input: {
  supabase: Supabase;
  trackIds: string[];
  workspaceId: string;
}): Promise<UploadRow[]> {
  if (input.trackIds.length === 0) {
    return [];
  }

  const { data, error } = await input.supabase
    .from("youtube_uploads")
    .select("track_id, youtube_channel_id, status")
    .eq("workspace_id", input.workspaceId)
    .in("track_id", input.trackIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as UploadRow[];
}

async function toLibraryTrack(input: {
  channelById: Map<string, LibraryChannel>;
  generationById: Map<string, GenerationRow>;
  imageById: Map<string, ImageRow>;
  prompts: PromptRow[];
  track: TrackRow;
  uploadByTrackId: Map<string, UploadRow>;
  userId: string;
  workspaceId: string;
}): Promise<LibraryTrack> {
  const generation = input.track.generation_request_id
    ? input.generationById.get(input.track.generation_request_id)
    : null;
  const upload = input.uploadByTrackId.get(input.track.id) ?? null;
  const imageId =
    input.track.image_asset_id ?? generation?.image_asset_id ?? null;
  const image = imageId ? input.imageById.get(imageId) : null;
  const channelId =
    upload?.youtube_channel_id ?? generation?.target_youtube_channel_id ?? null;
  const title =
    input.track.title ??
    titleFromPrompt(
      generation?.final_prompt ?? input.prompts[0]?.final_prompt,
    ) ??
    "Untitled Track";
  const style =
    input.track.style ?? generation?.style ?? input.prompts[0]?.style;
  const mood = input.track.mood ?? generation?.mood ?? input.prompts[0]?.mood;
  const uploadStatus = upload?.status ?? null;
  const status = uploadStatus === "uploaded" ? "uploaded" : input.track.status;

  return {
    canPublish: ["approved", "ready", "rendered", "preview_ready"].includes(
      input.track.status,
    ),
    channel: channelId ? (input.channelById.get(channelId) ?? null) : null,
    coverUrl: image ? await resolveCoverUrl(image, input) : null,
    createdAt: input.track.created_at,
    durationLabel: formatDuration(
      input.track.duration_seconds ?? input.prompts[0]?.duration_seconds ?? 165,
    ),
    durationSeconds: input.track.duration_seconds,
    failureReason: input.track.failure_reason,
    generationId: input.track.generation_request_id,
    imageAssetId: imageId,
    mood: mood ?? null,
    prompt: generation?.final_prompt ?? input.prompts[0]?.final_prompt ?? null,
    status,
    statusLabel: toStatusLabel(status),
    statusTone: toStatusTone(status),
    style: style ?? null,
    tags: input.track.tags ?? splitTags(style, mood),
    title,
    trackId: input.track.id,
    uploadStatus,
  };
}

async function resolveCoverUrl(
  image: ImageRow,
  input: { userId: string; workspaceId: string },
) {
  if (image.public_url) {
    return image.public_url;
  }

  try {
    return await createStorageSignedUrl({
      bucket: "image-assets",
      path: image.storage_path,
      requesterUserId: input.userId,
      workspaceId: input.workspaceId,
    });
  } catch {
    return null;
  }
}

function toChannel(row: ChannelRow): LibraryChannel {
  return {
    handle: row.handle,
    id: row.id,
    thumbnailUrl: row.thumbnail_url,
    title: row.title,
  };
}

function buildMoodOptions(tracks: LibraryTrack[], prompts: PromptRow[]) {
  const moods = new Set<string>();

  for (const item of [
    ...tracks.map((track) => track.mood),
    ...prompts.map((p) => p.mood),
  ]) {
    if (item) {
      for (const mood of item.split(",")) {
        const trimmed = mood.trim();

        if (trimmed) {
          moods.add(trimmed);
        }
      }
    }
  }

  return [
    { label: "All", value: "all" },
    ...Array.from(moods)
      .slice(0, 8)
      .map((mood) => ({ label: mood, value: mood })),
  ];
}

function splitTags(style?: string | null, mood?: string | null) {
  return [style, mood]
    .flatMap((value) => value?.split(",") ?? [])
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 3);
}

function titleFromPrompt(prompt?: string | null) {
  if (!prompt) {
    return null;
  }

  return prompt
    .split(/[,.]/)[0]
    ?.replace(/^a\s+/i, "")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .slice(0, 44);
}

function toStatusLabel(status: string) {
  const labels: Record<string, string> = {
    approved: "Approved",
    draft: "Draft",
    failed: "Failed",
    generating: "Generating",
    polling: "Polling",
    preview_ready: "Preview",
    ready: "Ready",
    rejected: "Rejected",
    rendered: "Rendered",
    rendering: "Rendering",
    uploaded: "Published",
  };

  return labels[status] ?? status.replace(/_/g, " ");
}

function toStatusTone(status: string): LibraryStatusTone {
  if (status === "uploaded") {
    return "emerald";
  }

  if (["approved", "ready", "preview_ready", "rendered"].includes(status)) {
    return "violet";
  }

  if (["generating", "polling", "rendering"].includes(status)) {
    return "blue";
  }

  if (status === "failed" || status === "rejected") {
    return "red";
  }

  if (status === "draft") {
    return "slate";
  }

  return "amber";
}

function formatDuration(durationSeconds: number) {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = String(durationSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function dateThreshold(value: string) {
  const days: Record<string, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
  };
  const date = new Date();

  date.setDate(date.getDate() - (days[value] ?? 365));

  return date.toISOString();
}

function escapeSearch(value: string) {
  return value.replace(/[%_,]/g, "").trim();
}
