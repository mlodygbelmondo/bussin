import type {
  FeedData,
  FeedJobGroup,
  FeedRetryTargetType,
  FeedTrack,
  FeedTrackStatus,
} from "@/modules/feed/feed.types";

/*
 * Optimistic mutators for the ["feed"] query cache. Each feed action pairs
 * with a mutator that predicts what the server will derive, so the card
 * updates the moment the user acts (design-system → Motion 4). The poll or
 * the post-action invalidation replaces the prediction with the truth;
 * `useFeedAction` rolls the cache back if the action fails.
 */
export type FeedMutator = (feed: FeedData) => FeedData;

/** Where a retry sends a track, mirroring the server-side retry handlers. */
const RETRY_STATUS: Record<FeedRetryTargetType, FeedTrackStatus> = {
  generation_request: "generating",
  track: "generating",
  video_render: "rendering",
  youtube_upload: "uploading",
};

const ACTIVE_TRACK_STATUSES: FeedTrackStatus[] = [
  "generating",
  "rendering",
  "uploading",
];

/** Mirrors `isGroupActive` in feed.queries.ts so polling resumes instantly. */
function hasActiveWork(groups: FeedJobGroup[]): boolean {
  return groups.some(
    (group) =>
      group.status === "queued" ||
      group.status === "running" ||
      group.tracks.some((track) =>
        ACTIVE_TRACK_STATUSES.includes(track.status),
      ),
  );
}

function withGroups(feed: FeedData, groups: FeedJobGroup[]): FeedData {
  return { ...feed, groups, hasActiveWork: hasActiveWork(groups) };
}

export function patchFeedTrack(
  trackId: string,
  patch: Partial<FeedTrack>,
): FeedMutator {
  return (feed) =>
    withGroups(
      feed,
      feed.groups.map((group) =>
        group.tracks.some((track) => track.id === trackId)
          ? {
              ...group,
              tracks: group.tracks.map((track) =>
                track.id === trackId ? { ...track, ...patch } : track,
              ),
            }
          : group,
      ),
    );
}

export function patchFeedGroup(
  groupId: string,
  patch: Partial<FeedJobGroup>,
): FeedMutator {
  return (feed) =>
    withGroups(
      feed,
      feed.groups.map((group) =>
        group.id === groupId ? { ...group, ...patch } : group,
      ),
    );
}

/** Publish now approves + queues a render first, so the card flips to rendering. */
export function publishTrackOptimism(trackId: string): FeedMutator {
  return patchFeedTrack(trackId, {
    failureReason: null,
    retryTarget: null,
    status: "rendering",
  });
}

export function discardTrackOptimism(trackId: string): FeedMutator {
  return patchFeedTrack(trackId, { status: "discarded" });
}

export function scheduleTrackOptimism(
  trackId: string,
  scheduledAt: string,
): FeedMutator {
  return patchFeedTrack(trackId, { scheduledAt, status: "scheduled" });
}

export function publishScheduledEarlyOptimism(trackId: string): FeedMutator {
  return patchFeedTrack(trackId, { scheduledAt: null, status: "uploading" });
}

export function cancelScheduleOptimism(trackId: string): FeedMutator {
  return patchFeedTrack(trackId, {
    scheduledAt: null,
    status: "preview_ready",
  });
}

export function retryTrackOptimism(
  trackId: string,
  target: FeedRetryTargetType,
): FeedMutator {
  return patchFeedTrack(trackId, {
    failureReason: null,
    retryTarget: null,
    status: RETRY_STATUS[target],
  });
}

export function editTrackDetailsOptimism(
  trackId: string,
  details: { description: string; tags: string; title: string },
): FeedMutator {
  return patchFeedTrack(trackId, {
    description: details.description,
    // Mirrors the comma-split parsing in updateTrackDetailsAction.
    tags: details.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    title: details.title,
  });
}

export function cancelGroupOptimism(groupId: string): FeedMutator {
  return (feed) =>
    withGroups(
      feed,
      feed.groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              status: "cancelled",
              tracks: group.tracks.map((track) =>
                ACTIVE_TRACK_STATUSES.includes(track.status)
                  ? { ...track, status: "failed" as const }
                  : track,
              ),
            }
          : group,
      ),
    );
}

/** Group retry resets only the failed tracks; siblings keep their progress. */
export function retryGroupOptimism(groupId: string): FeedMutator {
  return (feed) =>
    withGroups(
      feed,
      feed.groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              failureReason: null,
              status: "queued",
              tracks: group.tracks.map((track) =>
                track.status === "failed"
                  ? {
                      ...track,
                      failureReason: null,
                      retryTarget: null,
                      status: "generating" as const,
                    }
                  : track,
              ),
            }
          : group,
      ),
    );
}
