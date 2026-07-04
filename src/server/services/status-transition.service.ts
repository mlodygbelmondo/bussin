/**
 * Single source of truth for every job/track status in the product.
 *
 * The TRANSITIONS map defines both the legal status values per entity and
 * the allowed moves between them. The exported *_STATUSES arrays and
 * *Status types are derived from it, so they cannot drift. The DB columns
 * are plain text — this module is the only thing standing between a typo
 * like "canceled" and production. App code and worker/src both import it;
 * never write a status string literal outside this vocabulary.
 */
const TRANSITIONS = {
  generation_requests: {
    draft: ["queued", "cancelled"],
    queued: ["running", "cancelled"],
    running: ["completed", "failed", "cancelled"],
    completed: [],
    failed: [],
    cancelled: [],
  },
  tracks: {
    draft: ["generating", "rejected"],
    generating: ["polling", "preview_ready", "ready", "failed"],
    polling: ["preview_ready", "ready", "failed"],
    preview_ready: ["approved", "rejected", "failed"],
    ready: ["approved", "rejected", "failed"],
    approved: ["rendering", "rejected"],
    rendering: ["rendered", "failed"],
    rendered: ["uploaded", "failed"],
    uploaded: [],
    rejected: [],
    failed: [],
  },
  video_renders: {
    queued: ["running", "cancelled"],
    running: ["rendered", "completed", "failed", "cancelled"],
    rendered: [],
    completed: [],
    failed: [],
    cancelled: [],
  },
  youtube_uploads: {
    draft: ["scheduled", "uploading", "cancelled"],
    scheduled: ["uploading", "cancelled"],
    uploading: ["uploaded", "failed"],
    uploaded: [],
    failed: [],
    cancelled: [],
  },
} as const;

export type StatusEntity = keyof typeof TRANSITIONS;

export type GenerationRequestStatus =
  keyof (typeof TRANSITIONS)["generation_requests"];
export type TrackStatus = keyof (typeof TRANSITIONS)["tracks"];
export type VideoRenderStatus = keyof (typeof TRANSITIONS)["video_renders"];
export type YoutubeUploadStatus = keyof (typeof TRANSITIONS)["youtube_uploads"];

export const GENERATION_REQUEST_STATUSES = Object.keys(
  TRANSITIONS.generation_requests,
) as GenerationRequestStatus[];
export const TRACK_STATUSES = Object.keys(TRANSITIONS.tracks) as TrackStatus[];
export const VIDEO_RENDER_STATUSES = Object.keys(
  TRANSITIONS.video_renders,
) as VideoRenderStatus[];
export const YOUTUBE_UPLOAD_STATUSES = Object.keys(
  TRANSITIONS.youtube_uploads,
) as YoutubeUploadStatus[];

export function isTrackStatus(value: string): value is TrackStatus {
  return value in TRANSITIONS.tracks;
}

export function isVideoRenderStatus(value: string): value is VideoRenderStatus {
  return value in TRANSITIONS.video_renders;
}

export function isYoutubeUploadStatus(
  value: string,
): value is YoutubeUploadStatus {
  return value in TRANSITIONS.youtube_uploads;
}

export function isGenerationRequestStatus(
  value: string,
): value is GenerationRequestStatus {
  return value in TRANSITIONS.generation_requests;
}

export class InvalidStatusTransitionError extends Error {
  constructor(
    public readonly entity: StatusEntity,
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Invalid ${entity} status transition: ${from} -> ${to}`);
    this.name = "InvalidStatusTransitionError";
  }
}

export function assertStatusTransition(
  entity: StatusEntity,
  from: string,
  to: string,
) {
  if (from === to) {
    return;
  }

  const allowed =
    TRANSITIONS[entity][from as keyof (typeof TRANSITIONS)[typeof entity]];

  if (!allowed?.includes(to as never)) {
    throw new InvalidStatusTransitionError(entity, from, to);
  }
}

export function canTransition(entity: StatusEntity, from: string, to: string) {
  try {
    assertStatusTransition(entity, from, to);
    return true;
  } catch {
    return false;
  }
}
