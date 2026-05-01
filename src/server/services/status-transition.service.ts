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
