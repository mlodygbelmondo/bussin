export type ScheduledUploadStatus =
  | "cancelled"
  | "draft"
  | "failed"
  | "scheduled"
  | "uploaded"
  | "uploading";

export type ScheduledStatusTone =
  | "blue"
  | "cyan"
  | "emerald"
  | "red"
  | "slate"
  | "violet";

export type ScheduledFilters = {
  channel: string;
  query: string;
  status: string;
  timezone: string;
  week: string | null;
};

export type ScheduledChannel = {
  handle: string | null;
  id: string;
  thumbnailUrl: string | null;
  title: string;
};

export type ScheduledUpload = {
  channel: ScheduledChannel | null;
  coverUrl: string | null;
  dayIndex: number;
  failureReason: string | null;
  imageAssetId: string | null;
  platform: "tiktok" | "youtube";
  renderStatus: string | null;
  scheduledAt: string | null;
  status: ScheduledUploadStatus;
  statusLabel: string;
  statusTone: ScheduledStatusTone;
  timeLabel: string;
  timeSlot: number | null;
  title: string;
  trackId: string | null;
  uploadId: string;
  videoRenderId: string | null;
};

export type ScheduledFilterOption = {
  label: string;
  value: string;
};

export type ScheduledDay = {
  date: string;
  dayLabel: string;
  dayNumber: string;
  isToday: boolean;
  monthLabel: string;
};

export type ScheduledSummary = {
  nextUploadLabel: string;
  timezoneLabel: string;
  totalThisWeek: number;
};

export type ScheduledScreenData = {
  channels: ScheduledChannel[];
  counts: {
    all: number;
    filtered: number;
    upcoming: number;
  };
  days: ScheduledDay[];
  filters: {
    channels: ScheduledFilterOption[];
    statuses: ScheduledFilterOption[];
  };
  isEmpty: boolean;
  summary: ScheduledSummary;
  timezone: string;
  timezoneLabel: string;
  upcomingUploads: ScheduledUpload[];
  uploads: ScheduledUpload[];
  weekLabel: string;
  weekStart: string;
  workspaceId: string;
};

export type ScheduledActionResult = {
  message: string;
  ok: boolean;
};
