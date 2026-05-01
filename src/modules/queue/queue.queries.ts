import { createClient } from "@/lib/supabase/server";
import { isMockMode } from "@/lib/app-config";
import { getMockGenerationQueueData } from "@/modules/dev/mock-data";
import type { Database } from "@/lib/database.types";
import type {
  QueueGroup,
  QueueGroupKey,
  QueueScreenData,
  QueueFilter,
  QueueStatus,
  QueueTrackItem,
} from "@/modules/queue/queue.types";

type GenerationRow = Pick<
  Database["public"]["Tables"]["generation_requests"]["Row"],
  | "created_at"
  | "duration_seconds"
  | "failure_reason"
  | "id"
  | "mood"
  | "status"
  | "style"
  | "track_count"
  | "updated_at"
  | "workspace_id"
>;

type TrackRow = Pick<
  Database["public"]["Tables"]["tracks"]["Row"],
  | "created_at"
  | "duration_seconds"
  | "failure_reason"
  | "generation_request_id"
  | "id"
  | "mood"
  | "status"
  | "style"
  | "title"
  | "updated_at"
>;

type RenderRow = Pick<
  Database["public"]["Tables"]["video_renders"]["Row"],
  | "created_at"
  | "failure_reason"
  | "finished_at"
  | "id"
  | "started_at"
  | "status"
  | "track_id"
  | "updated_at"
>;

type UploadRow = Pick<
  Database["public"]["Tables"]["youtube_uploads"]["Row"],
  | "created_at"
  | "failure_reason"
  | "id"
  | "status"
  | "title"
  | "track_id"
  | "updated_at"
  | "uploaded_at"
>;

type QueueFilters = {
  query?: string;
  status?: QueueFilter | string;
};

export async function getGenerationQueueData(
  userId: string,
  filters: QueueFilters = {},
): Promise<QueueScreenData | null> {
  if (isMockMode) {
    return getMockGenerationQueueData(filters);
  }

  const supabase = await createClient();
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
  const [generationResult, tracksResult, rendersResult, uploadsResult] =
    await Promise.all([
      supabase
        .from("generation_requests")
        .select(
          "id, workspace_id, style, mood, duration_seconds, track_count, status, failure_reason, created_at, updated_at",
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("tracks")
        .select(
          "id, generation_request_id, title, style, mood, duration_seconds, status, failure_reason, created_at, updated_at",
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(120),
      supabase
        .from("video_renders")
        .select(
          "id, track_id, status, failure_reason, started_at, finished_at, created_at, updated_at",
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(120),
      supabase
        .from("youtube_uploads")
        .select(
          "id, track_id, title, status, failure_reason, uploaded_at, created_at, updated_at",
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(120),
    ]);

  for (const result of [
    generationResult,
    tracksResult,
    rendersResult,
    uploadsResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const generations = (generationResult.data ?? []) as GenerationRow[];
  const tracks = (tracksResult.data ?? []) as TrackRow[];
  const renders = (rendersResult.data ?? []) as RenderRow[];
  const uploads = (uploadsResult.data ?? []) as UploadRow[];
  const rawItems = buildItems({
    generations,
    renders,
    tracks,
    uploads,
  });
  const items = rawItems.filter((item) => matchesFilters(item, filters));
  const groups = buildGroups(items);
  const rawGroups = buildGroups(rawItems);
  const uploadsWaiting = uploads.some((upload) =>
    ["draft", "scheduled", "uploading"].includes(upload.status),
  );

  return {
    counts: {
      all: rawItems.length,
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
    hasUploadsWaiting: uploadsWaiting,
    isEmpty:
      generations.length === 0 &&
      tracks.length === 0 &&
      renders.length === 0 &&
      uploads.length === 0,
    total: items.length,
    updatedLabel: "Auto-refreshing every 15s",
    workspaceId,
  };
}

function buildItems(input: {
  generations: GenerationRow[];
  renders: RenderRow[];
  tracks: TrackRow[];
  uploads: UploadRow[];
}): QueueTrackItem[] {
  const rendersByTrack = latestByKey(input.renders, "track_id");
  const uploadsByTrack = latestByKey(input.uploads, "track_id");
  const tracksByRequest = new Map<string, TrackRow[]>();

  for (const track of input.tracks) {
    if (!track.generation_request_id) {
      continue;
    }

    const list = tracksByRequest.get(track.generation_request_id) ?? [];
    list.push(track);
    tracksByRequest.set(track.generation_request_id, list);
  }

  return input.generations.flatMap((request, requestIndex) => {
    const requestTracks = tracksByRequest.get(request.id) ?? [];

    if (requestTracks.length === 0) {
      return [placeholderRequestItem(request, requestIndex)];
    }

    return requestTracks.map((track, trackIndex) => {
      const render = rendersByTrack.get(track.id) ?? null;
      const upload = uploadsByTrack.get(track.id) ?? null;
      const derived = deriveStatus({ render, request, track, upload });

      return {
        actionTargetId: derived.actionTargetId,
        actionTargetType: derived.actionTargetType,
        artTone: (requestIndex + trackIndex) % 6,
        createdLabel: relativeTime(track.created_at),
        failureReason: derived.failureReason,
        id: track.id,
        meta: [
          track.style ?? request.style,
          formatDuration(track.duration_seconds ?? request.duration_seconds),
          track.mood ?? request.mood,
        ].join(" · "),
        progress: derived.progress,
        requestId: request.id,
        status: derived.status,
        statusLabel: derived.statusLabel,
        title: track.title || `Track ${trackIndex + 1}`,
      };
    });
  });
}

function placeholderRequestItem(
  request: GenerationRow,
  requestIndex: number,
): QueueTrackItem {
  const status = normalizeRequestStatus(request.status);

  return {
    actionTargetId: request.id,
    actionTargetType: "generation_request",
    artTone: requestIndex % 6,
    createdLabel: relativeTime(request.created_at),
    failureReason: request.failure_reason,
    id: request.id,
    meta: [
      request.style,
      formatDuration(request.duration_seconds),
      request.mood,
    ].join(" · "),
    progress: status === "failed" ? 85 : status === "queued" ? 8 : 48,
    requestId: request.id,
    status,
    statusLabel: toStatusLabel(status),
    title:
      request.track_count > 1
        ? `Generation request · ${request.track_count} tracks`
        : "Generation request",
  };
}

function deriveStatus(input: {
  render: RenderRow | null;
  request: GenerationRow;
  track: TrackRow;
  upload: UploadRow | null;
}): Pick<
  QueueTrackItem,
  | "actionTargetId"
  | "actionTargetType"
  | "failureReason"
  | "progress"
  | "status"
  | "statusLabel"
> {
  if (input.upload?.status === "uploaded") {
    return {
      actionTargetId: input.upload.id,
      actionTargetType: "youtube_upload",
      failureReason: null,
      progress: 100,
      status: "uploaded",
      statusLabel: "Uploaded",
    };
  }

  if (input.upload?.status === "uploading") {
    return {
      actionTargetId: input.upload.id,
      actionTargetType: "youtube_upload",
      failureReason: null,
      progress: 92,
      status: "uploading",
      statusLabel: "Uploading",
    };
  }

  if (input.upload?.status === "failed") {
    return failedState(
      input.upload.id,
      "youtube_upload",
      input.upload.failure_reason,
    );
  }

  if (input.render?.status === "failed") {
    return failedState(
      input.render.id,
      "video_render",
      input.render.failure_reason,
    );
  }

  if (["running", "queued"].includes(input.render?.status ?? "")) {
    return {
      actionTargetId: input.render?.id ?? input.track.id,
      actionTargetType: input.render ? "video_render" : "track",
      failureReason: null,
      progress: input.render?.status === "queued" ? 76 : 86,
      status: "rendering",
      statusLabel:
        input.render?.status === "queued" ? "Render queued" : "Rendering",
    };
  }

  if (input.track.status === "failed") {
    return failedState(input.track.id, "track", input.track.failure_reason);
  }

  if (["preview_ready", "ready", "approved"].includes(input.track.status)) {
    return {
      actionTargetId: input.track.id,
      actionTargetType: "track",
      failureReason: null,
      progress: null,
      status: "preview_ready",
      statusLabel: "Preview ready",
    };
  }

  if (input.track.status === "polling") {
    return {
      actionTargetId: input.track.id,
      actionTargetType: "track",
      failureReason: null,
      progress: 44,
      status: "polling",
      statusLabel: "Polling",
    };
  }

  if (input.track.status === "generating") {
    return {
      actionTargetId: input.track.id,
      actionTargetType: "track",
      failureReason: null,
      progress: 72,
      status: "generating",
      statusLabel: "Generating",
    };
  }

  const requestStatus = normalizeRequestStatus(input.request.status);

  return {
    actionTargetId: input.request.id,
    actionTargetType: "generation_request",
    failureReason: input.request.failure_reason,
    progress: requestStatus === "queued" ? 8 : 100,
    status: requestStatus,
    statusLabel: toStatusLabel(requestStatus),
  };
}

function failedState(
  actionTargetId: string,
  actionTargetType: QueueTrackItem["actionTargetType"],
  failureReason: string | null,
) {
  return {
    actionTargetId,
    actionTargetType,
    failureReason: failureReason ?? "The worker stopped before finishing.",
    progress: 85,
    status: "failed" as const,
    statusLabel:
      actionTargetType === "video_render" ? "Render failed" : "Failed",
  };
}

function buildGroups(items: QueueTrackItem[]): QueueGroup[] {
  const groupMeta: Record<
    QueueGroupKey,
    Pick<QueueGroup, "description" | "iconTone" | "title">
  > = {
    complete: {
      description: "Finished generations and uploads",
      iconTone: "emerald",
      title: "Complete",
    },
    in_progress: {
      description: "Generations currently being processed",
      iconTone: "blue",
      title: "In progress",
    },
    needs_review: {
      description: "Preview and take action on your tracks",
      iconTone: "amber",
      title: "Needs review",
    },
  };

  return (["in_progress", "needs_review", "complete"] as QueueGroupKey[]).map(
    (id) => ({
      id,
      items: items.filter((item) => groupForStatus(item.status) === id),
      ...groupMeta[id],
    }),
  );
}

function groupForStatus(status: QueueStatus): QueueGroupKey {
  if (status === "preview_ready") {
    return "needs_review";
  }

  if (["uploaded", "failed"].includes(status)) {
    return "complete";
  }

  return "in_progress";
}

function matchesFilters(item: QueueTrackItem, filters: QueueFilters) {
  const query = filters.query?.trim().toLowerCase();
  const status = filters.status?.trim();

  if (query && !`${item.title} ${item.meta}`.toLowerCase().includes(query)) {
    return false;
  }

  if (!status || status === "all") {
    return true;
  }

  if (["in_progress", "needs_review", "complete"].includes(status)) {
    return groupForStatus(item.status) === status;
  }

  return item.status === status;
}

function latestByKey<T extends { created_at: string }>(
  rows: T[],
  key: keyof T,
) {
  const map = new Map<string, T>();

  for (const row of rows) {
    const value = row[key];

    if (typeof value !== "string") {
      continue;
    }

    const current = map.get(value);

    if (!current || current.created_at < row.created_at) {
      map.set(value, row);
    }
  }

  return map;
}

function normalizeRequestStatus(status: string): QueueStatus {
  if (status === "failed") {
    return "failed";
  }

  if (status === "completed") {
    return "uploaded";
  }

  if (status === "running") {
    return "generating";
  }

  return "queued";
}

function toStatusLabel(status: QueueStatus) {
  const labels: Record<QueueStatus, string> = {
    failed: "Failed",
    generating: "Generating",
    polling: "Polling",
    preview_ready: "Preview ready",
    queued: "Queued",
    rendering: "Rendering",
    uploaded: "Uploaded",
    uploading: "Uploading",
  };

  return labels[status];
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60_000));

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);

  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}
