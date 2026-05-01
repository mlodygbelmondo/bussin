export type QueueStatus =
  | "queued"
  | "generating"
  | "polling"
  | "preview_ready"
  | "rendering"
  | "uploading"
  | "uploaded"
  | "failed";

export type QueueGroupKey = "in_progress" | "needs_review" | "complete";
export type QueueFilter = QueueStatus | QueueGroupKey | "all";

export type QueueTrackItem = {
  actionTargetId: string;
  actionTargetType:
    | "generation_request"
    | "track"
    | "video_render"
    | "youtube_upload";
  artTone: number;
  createdLabel: string;
  failureReason: string | null;
  id: string;
  meta: string;
  progress: number | null;
  requestId: string;
  status: QueueStatus;
  statusLabel: string;
  title: string;
};

export type QueueGroup = {
  description: string;
  iconTone: "blue" | "amber" | "emerald";
  id: QueueGroupKey;
  items: QueueTrackItem[];
  title: string;
};

export type QueueScreenData = {
  counts: {
    all: number;
    complete: number;
    inProgress: number;
    needsReview: number;
  };
  groups: QueueGroup[];
  hasFailedRender: boolean;
  hasUploadsWaiting: boolean;
  isEmpty: boolean;
  total: number;
  updatedLabel: string;
  workspaceId: string;
};

export type QueueActionResult = {
  message: string;
  ok: boolean;
};
