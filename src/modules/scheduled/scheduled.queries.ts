import { createStorageSignedUrl } from "@/server/services/storage";
import { isMockMode } from "@/lib/app-config";
import { createWorkspaceClient } from "@/lib/supabase";
import { getMockScheduledUploadsData } from "@/modules/dev/mock-data";
import type { Database } from "@/lib/database.types";
import type {
  ScheduledChannel,
  ScheduledFilters,
  ScheduledScreenData,
  ScheduledStatusTone,
  ScheduledUpload,
  ScheduledUploadStatus,
} from "@/modules/scheduled/scheduled.types";

const MAX_ROWS = 120;
const HOUR_START = 9;
const HOUR_END = 21;

type UploadRow = Pick<
  Database["public"]["Tables"]["youtube_uploads"]["Row"],
  | "failure_reason"
  | "id"
  | "scheduled_at"
  | "status"
  | "title"
  | "track_id"
  | "video_render_id"
  | "youtube_channel_id"
>;

type TrackRow = Pick<
  Database["public"]["Tables"]["tracks"]["Row"],
  "id" | "image_asset_id" | "title"
>;

type RenderRow = Pick<
  Database["public"]["Tables"]["video_renders"]["Row"],
  "id" | "status" | "track_id"
>;

type ChannelRow = Pick<
  Database["public"]["Tables"]["youtube_channels"]["Row"],
  "handle" | "id" | "thumbnail_url" | "title"
>;

type ImageRow = Pick<
  Database["public"]["Tables"]["image_assets"]["Row"],
  "id" | "public_url" | "storage_path"
>;

export async function getScheduledUploadsData(
  userId: string,
  filters: ScheduledFilters,
): Promise<ScheduledScreenData | null> {
  if (isMockMode) {
    return getMockScheduledUploadsData(filters);
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
  const timezone = normalizeTimezone(filters.timezone);
  const weekStart = startOfWeekInTimezone(
    filters.week ? new Date(filters.week) : new Date(),
    timezone,
  );
  const weekEnd = addCalendarDaysInTimezone(weekStart, 7, timezone);
  const [
    weekUploadsResult,
    upcomingUploadsResult,
    totalResult,
    channelsResult,
  ] = await Promise.all([
    supabase
      .from("youtube_uploads")
      .select(
        "id, track_id, video_render_id, youtube_channel_id, title, scheduled_at, status, failure_reason",
      )
      .eq("workspace_id", workspaceId)
      .gte("scheduled_at", weekStart.toISOString())
      .lt("scheduled_at", weekEnd.toISOString())
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .limit(MAX_ROWS),
    supabase
      .from("youtube_uploads")
      .select(
        "id, track_id, video_render_id, youtube_channel_id, title, scheduled_at, status, failure_reason",
        { count: "exact" },
      )
      .eq("workspace_id", workspaceId)
      .neq("status", "cancelled")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .limit(6),
    supabase
      .from("youtube_uploads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase
      .from("youtube_channels")
      .select("id, title, handle, thumbnail_url")
      .eq("workspace_id", workspaceId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  for (const result of [
    weekUploadsResult,
    upcomingUploadsResult,
    totalResult,
    channelsResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const rawUploads = uniqueUploads([
    ...((weekUploadsResult.data ?? []) as UploadRow[]),
    ...((upcomingUploadsResult.data ?? []) as UploadRow[]),
  ]);
  const trackIds = uniqueValues(rawUploads.map((upload) => upload.track_id));
  const renderIds = uniqueValues(
    rawUploads.map((upload) => upload.video_render_id),
  );
  const [tracksResult, rendersResult] = await Promise.all([
    trackIds.length > 0
      ? supabase
          .from("tracks")
          .select("id, title, image_asset_id")
          .eq("workspace_id", workspaceId)
          .in("id", trackIds)
      : emptyQueryResult<TrackRow>(),
    renderIds.length > 0
      ? supabase
          .from("video_renders")
          .select("id, track_id, status")
          .eq("workspace_id", workspaceId)
          .in("id", renderIds)
      : emptyQueryResult<RenderRow>(),
  ]);

  for (const result of [tracksResult, rendersResult]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const imageIds = uniqueValues(
    ((tracksResult.data ?? []) as TrackRow[]).map(
      (track) => track.image_asset_id,
    ),
  );
  const imagesResult =
    imageIds.length > 0
      ? await supabase
          .from("image_assets")
          .select("id, public_url, storage_path")
          .eq("workspace_id", workspaceId)
          .in("id", imageIds)
      : emptyQueryResult<ImageRow>();

  if (imagesResult.error) {
    throw new Error(imagesResult.error.message);
  }

  const channels = ((channelsResult.data ?? []) as ChannelRow[]).map(toChannel);
  const channelById = new Map(channels.map((channel) => [channel.id, channel]));
  const trackById = new Map(
    ((tracksResult.data ?? []) as TrackRow[]).map((track) => [track.id, track]),
  );
  const renderById = new Map(
    ((rendersResult.data ?? []) as RenderRow[]).map((render) => [
      render.id,
      render,
    ]),
  );
  const imageById = new Map(
    ((imagesResult.data ?? []) as ImageRow[]).map((image) => [image.id, image]),
  );
  const mappedUploads = await Promise.all(
    rawUploads.map((upload, index) =>
      toScheduledUpload({
        channelById,
        imageById,
        index,
        renderById,
        timezone,
        trackById,
        upload,
        userId,
        weekStart,
        workspaceId,
      }),
    ),
  );
  const weekUploads = mappedUploads.filter((upload) =>
    isInWeek(upload.scheduledAt, weekStart, weekEnd),
  );
  const filteredUploads = weekUploads.filter((upload) =>
    matchesFilters(upload, filters),
  );
  const upcomingUploads = mappedUploads
    .filter((upload) => upload.scheduledAt && upload.status !== "cancelled")
    .sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)));
  const nextUpload = upcomingUploads.find(
    (upload) => new Date(upload.scheduledAt as string).getTime() >= Date.now(),
  );

  return {
    channels,
    counts: {
      all: totalResult.count ?? rawUploads.length,
      filtered: filteredUploads.length,
      upcoming: upcomingUploadsResult.count ?? upcomingUploads.length,
    },
    days: buildDays(weekStart, timezone),
    filters: {
      channels: [
        { label: "All channels", value: "all" },
        ...channels.map((channel) => ({
          label: channel.title,
          value: channel.id,
        })),
      ],
      statuses: [
        { label: "All statuses", value: "all" },
        { label: "Scheduled", value: "scheduled" },
        { label: "Queued", value: "draft" },
        { label: "Uploading", value: "uploading" },
        { label: "Uploaded", value: "uploaded" },
        { label: "Failed", value: "failed" },
        { label: "Canceled", value: "cancelled" },
      ],
    },
    isEmpty: (totalResult.count ?? rawUploads.length) === 0,
    summary: {
      nextUploadLabel: nextUpload
        ? `${formatShortDate(nextUpload.scheduledAt, timezone)} · ${
            nextUpload.timeLabel
          }`
        : "No upcoming upload",
      timezoneLabel: formatTimezoneLabel(timezone),
      totalThisWeek: weekUploads.filter(
        (upload) => upload.status !== "cancelled",
      ).length,
    },
    timezone,
    timezoneLabel: formatTimezoneLabel(timezone),
    upcomingUploads,
    uploads: filteredUploads,
    weekLabel: formatWeekLabel(weekStart, timezone),
    weekStart: weekStart.toISOString(),
    workspaceId,
  };
}

function toScheduledUpload(input: {
  channelById: Map<string, ScheduledChannel>;
  imageById: Map<string, ImageRow>;
  index: number;
  renderById: Map<string, RenderRow>;
  trackById: Map<string, TrackRow>;
  upload: UploadRow;
  timezone: string;
  userId: string;
  weekStart: Date;
  workspaceId: string;
}): Promise<ScheduledUpload> {
  const track = input.upload.track_id
    ? input.trackById.get(input.upload.track_id)
    : null;
  const image = track?.image_asset_id
    ? input.imageById.get(track.image_asset_id)
    : null;
  const render = input.upload.video_render_id
    ? input.renderById.get(input.upload.video_render_id)
    : null;
  const scheduledDate = input.upload.scheduled_at
    ? new Date(input.upload.scheduled_at)
    : null;
  const status = normalizeStatus(input.upload.status);

  return resolveCoverUrl({
    image,
    userId: input.userId,
    workspaceId: input.workspaceId,
  }).then((coverUrl) => ({
    channel: input.upload.youtube_channel_id
      ? (input.channelById.get(input.upload.youtube_channel_id) ?? null)
      : null,
    coverUrl,
    dayIndex: scheduledDate
      ? dayDiff(input.weekStart, scheduledDate, input.timezone)
      : 0,
    failureReason: input.upload.failure_reason,
    imageAssetId: track?.image_asset_id ?? null,
    platform: input.index % 3 === 2 ? "tiktok" : "youtube",
    renderStatus: render?.status ?? null,
    scheduledAt: input.upload.scheduled_at,
    status,
    statusLabel: toStatusLabel(status),
    statusTone: toStatusTone(status),
    timeLabel: formatTime(input.upload.scheduled_at, input.timezone),
    timeSlot: scheduledDate ? toTimeSlot(scheduledDate, input.timezone) : null,
    title: input.upload.title || track?.title || "Untitled upload",
    trackId: input.upload.track_id,
    uploadId: input.upload.id,
    videoRenderId: input.upload.video_render_id,
  }));
}

async function resolveCoverUrl(input: {
  image: ImageRow | null | undefined;
  userId: string;
  workspaceId: string;
}) {
  if (!input.image) {
    return null;
  }

  if (input.image.public_url) {
    return input.image.public_url;
  }

  try {
    return await createStorageSignedUrl({
      bucket: "image-assets",
      path: input.image.storage_path,
      requesterUserId: input.userId,
      workspaceId: input.workspaceId,
    });
  } catch {
    return null;
  }
}

function uniqueUploads(uploads: UploadRow[]) {
  return Array.from(
    uploads
      .reduce(
        (items, upload) => items.set(upload.id, upload),
        new Map<string, UploadRow>(),
      )
      .values(),
  );
}

function uniqueValues(values: Array<string | null>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function emptyQueryResult<T>() {
  return {
    count: null,
    data: [] as T[],
    error: null,
  };
}

function matchesFilters(upload: ScheduledUpload, filters: ScheduledFilters) {
  if (filters.channel !== "all" && upload.channel?.id !== filters.channel) {
    return false;
  }

  if (filters.status !== "all" && upload.status !== filters.status) {
    return false;
  }

  if (filters.query) {
    const query = filters.query.toLowerCase();
    const haystack = [
      upload.title,
      upload.channel?.title,
      upload.channel?.handle,
      upload.statusLabel,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  }

  return true;
}

function buildDays(weekStart: Date, timezone: string) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addCalendarDaysInTimezone(weekStart, index, timezone);
    const parts = new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      timeZone: timezone,
      weekday: "short",
    }).formatToParts(date);
    const today = new Date();

    return {
      date: date.toISOString(),
      dayLabel: parts.find((part) => part.type === "weekday")?.value ?? "",
      dayNumber: parts.find((part) => part.type === "day")?.value ?? "",
      isToday: formatDateKey(date, timezone) === formatDateKey(today, timezone),
      monthLabel: `${parts.find((part) => part.type === "month")?.value ?? ""} ${
        parts.find((part) => part.type === "day")?.value ?? ""
      }`,
    };
  });
}

export function formatScheduledDateTime(
  value: string | null,
  timezone: string,
) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: normalizeTimezone(timezone),
    weekday: "short",
  }).format(new Date(value));
}

export function formatTimezoneLabel(timezone: string) {
  const now = new Date();
  const short = new Intl.DateTimeFormat("en", {
    timeZone: normalizeTimezone(timezone),
    timeZoneName: "shortOffset",
  })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")?.value;

  return `(${short ?? "UTC"}) ${timezone.replaceAll("_", " ")}`;
}

function formatWeekLabel(weekStart: Date, timezone: string) {
  const weekEnd = addCalendarDaysInTimezone(weekStart, 6, timezone);
  const month = new Intl.DateTimeFormat("en", {
    month: "short",
    timeZone: timezone,
  }).format(weekStart);
  const endMonth = new Intl.DateTimeFormat("en", {
    month: "short",
    timeZone: timezone,
  }).format(weekEnd);
  const startDay = new Intl.DateTimeFormat("en", {
    day: "numeric",
    timeZone: timezone,
  }).format(weekStart);
  const endDay = new Intl.DateTimeFormat("en", {
    day: "numeric",
    timeZone: timezone,
  }).format(weekEnd);
  const year = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
  }).format(weekEnd);

  return `${month} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

function formatShortDate(value: string | null, timezone: string) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
    weekday: "short",
  }).format(new Date(value));
}

function formatTime(value: string | null, timezone: string) {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function toTimeSlot(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    hour12: false,
    minute: "numeric",
    timeZone: timezone,
  }).formatToParts(value);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );
  const clampedHour = Math.min(Math.max(hour, HOUR_START), HOUR_END);

  return (clampedHour - HOUR_START) * 60 + minute;
}

function isInWeek(value: string | null, weekStart: Date, weekEnd: Date) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return date >= weekStart && date < weekEnd;
}

function startOfWeekInTimezone(date: Date, timezone: string) {
  const clean = Number.isFinite(date.getTime()) ? date : new Date();
  const parts = getZonedDateParts(clean, timezone);
  const sunday = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day - parts.weekday),
  );

  return zonedTimeToUtc(
    {
      day: sunday.getUTCDate(),
      hour: 0,
      minute: 0,
      month: sunday.getUTCMonth() + 1,
      second: 0,
      year: sunday.getUTCFullYear(),
    },
    timezone,
  );
}

function addCalendarDaysInTimezone(date: Date, days: number, timezone: string) {
  const parts = getZonedDateParts(date, timezone);
  const next = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days),
  );

  return zonedTimeToUtc(
    {
      day: next.getUTCDate(),
      hour: 0,
      minute: 0,
      month: next.getUTCMonth() + 1,
      second: 0,
      year: next.getUTCFullYear(),
    },
    timezone,
  );
}

function dayDiff(start: Date, date: Date, timezone: string) {
  const startParts = getZonedDateParts(start, timezone);
  const targetParts = getZonedDateParts(date, timezone);
  const startDay = Date.UTC(
    startParts.year,
    startParts.month - 1,
    startParts.day,
  );
  const targetDay = Date.UTC(
    targetParts.year,
    targetParts.month - 1,
    targetParts.day,
  );

  return Math.min(
    Math.max(Math.round((targetDay - startDay) / 86400000), 0),
    6,
  );
}

function getZonedDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const weekdayIndex = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ].indexOf(weekday);

  return {
    day: Number(parts.find((part) => part.type === "day")?.value ?? 1),
    month: Number(parts.find((part) => part.type === "month")?.value ?? 1),
    weekday: weekdayIndex >= 0 ? weekdayIndex : 0,
    year: Number(parts.find((part) => part.type === "year")?.value ?? 1970),
  };
}

function getZonedDateTimeParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(date);

  return {
    day: Number(parts.find((part) => part.type === "day")?.value ?? 1),
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? 0),
    minute: Number(parts.find((part) => part.type === "minute")?.value ?? 0),
    month: Number(parts.find((part) => part.type === "month")?.value ?? 1),
    second: Number(parts.find((part) => part.type === "second")?.value ?? 0),
    year: Number(parts.find((part) => part.type === "year")?.value ?? 1970),
  };
}

function zonedTimeToUtc(
  parts: {
    day: number;
    hour: number;
    minute: number;
    month: number;
    second: number;
    year: number;
  },
  timezone: string,
) {
  const target = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  let utc = target;

  for (let index = 0; index < 3; index += 1) {
    const zoned = getZonedDateTimeParts(new Date(utc), timezone);
    const zonedAsUtc = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
      zoned.second,
    );
    const offset = zonedAsUtc - target;

    utc -= offset;
  }

  return new Date(utc);
}

function formatDateKey(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).format(date);
}

function normalizeTimezone(value: string | undefined) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value || "UTC" });
    return value || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function normalizeStatus(value: string): ScheduledUploadStatus {
  return [
    "cancelled",
    "draft",
    "failed",
    "scheduled",
    "uploaded",
    "uploading",
  ].includes(value)
    ? (value as ScheduledUploadStatus)
    : "draft";
}

function toStatusLabel(status: ScheduledUploadStatus) {
  const labels: Record<ScheduledUploadStatus, string> = {
    cancelled: "Canceled",
    draft: "Queued",
    failed: "Failed",
    scheduled: "Scheduled",
    uploaded: "Uploaded",
    uploading: "Uploading",
  };

  return labels[status];
}

function toStatusTone(status: ScheduledUploadStatus): ScheduledStatusTone {
  const tones: Record<ScheduledUploadStatus, ScheduledStatusTone> = {
    cancelled: "slate",
    draft: "blue",
    failed: "red",
    scheduled: "violet",
    uploaded: "emerald",
    uploading: "cyan",
  };

  return tones[status];
}

function toChannel(channel: ChannelRow): ScheduledChannel {
  return {
    handle: channel.handle,
    id: channel.id,
    thumbnailUrl: channel.thumbnail_url,
    title: channel.title,
  };
}
