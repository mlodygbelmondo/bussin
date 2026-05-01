export type TrackPreviewStatus =
  | "audio_loading"
  | "preview_ready"
  | "approved"
  | "rejected"
  | "rendering"
  | "rendered"
  | "uploading"
  | "uploaded"
  | "failed";

export type TrackPreviewChannel = {
  handle: string | null;
  id: string;
  thumbnailUrl: string | null;
  title: string;
};

export type TrackPreviewGeneration = {
  finalPrompt: string | null;
  id: string | null;
  mood: string | null;
  publishMode: string | null;
  scheduledAt: string | null;
  style: string | null;
};

export type TrackPreviewRender = {
  failureReason: string | null;
  id: string;
  status: string;
  videoStoragePath: string | null;
};

export type TrackPreviewUpload = {
  failureReason: string | null;
  id: string;
  scheduledAt: string | null;
  status: string;
  uploadedAt: string | null;
};

export type TrackPreviewData = {
  audioUrl: string | null;
  channel: TrackPreviewChannel | null;
  coverUrl: string | null;
  createdAt: string;
  description: string;
  durationSeconds: number;
  failureReason: string | null;
  generation: TrackPreviewGeneration | null;
  imageAssetId: string | null;
  imageMeta: {
    fileName: string | null;
    height: number | null;
    source: string | null;
    width: number | null;
  } | null;
  render: TrackPreviewRender | null;
  status: TrackPreviewStatus;
  style: string | null;
  mood: string | null;
  tags: string[];
  title: string;
  trackId: string;
  trackStatus: string;
  upload: TrackPreviewUpload | null;
  workspaceId: string;
};

export type TrackActionResult = {
  message: string;
  ok: boolean;
};
