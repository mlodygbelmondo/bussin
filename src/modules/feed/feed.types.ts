export type FeedTrackStatus =
  | "generating"
  | "preview_ready"
  | "rendering"
  | "uploading"
  | "scheduled"
  | "published"
  | "failed"
  | "discarded";

export type FeedRetryTargetType =
  | "generation_request"
  | "track"
  | "video_render"
  | "youtube_upload";

export type FeedRetryTarget = {
  id: string;
  type: FeedRetryTargetType;
};

export type FeedTrack = {
  audioUrl: string | null;
  coverUrl: string | null;
  description: string | null;
  durationSeconds: number | null;
  failureReason: string | null;
  id: string;
  retryTarget: FeedRetryTarget | null;
  scheduledAt: string | null;
  status: FeedTrackStatus;
  tags: string[];
  title: string;
  uploadId: string | null;
  youtubeVideoId: string | null;
};

export type FeedJobGroupStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type FeedJobGroup = {
  createdAt: string;
  failureReason: string | null;
  id: string;
  prompt: string;
  status: FeedJobGroupStatus;
  trackCount: number;
  tracks: FeedTrack[];
};

export type FeedConnections = {
  channelTitle: string | null;
  sunoConnected: boolean;
  youtubeConnected: boolean;
};

export type FeedUsage = {
  limit: number;
  plan: string;
  used: number;
};

export type FeedUser = {
  displayName: string;
  email: string;
  initials: string;
};

export type FeedData = {
  connections: FeedConnections;
  groups: FeedJobGroup[];
  hasActiveWork: boolean;
  usage: FeedUsage;
  user: FeedUser;
};

export type FeedActionResult = {
  message: string;
  ok: boolean;
};
