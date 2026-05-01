import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Megaphone,
  MoreVertical,
  PlaySquare,
  Plus,
  Search,
  Send,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScheduledUploadActions } from "@/modules/scheduled/scheduled-action-buttons";
import type {
  ScheduledFilters,
  ScheduledScreenData,
  ScheduledStatusTone,
  ScheduledUpload,
} from "@/modules/scheduled/scheduled.types";

const timeRows = [
  "All day",
  "9 AM",
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM",
  "6 PM",
  "7 PM",
  "8 PM",
  "9 PM",
];

export function ScheduledTopBar() {
  return (
    <header className="flex h-[73px] items-center justify-end gap-4 border-b border-white/10 bg-[#0b1022]/80 px-4 backdrop-blur lg:px-9">
      <Link
        className="hidden h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:flex"
        href="/dashboard/channels"
      >
        <Megaphone className="size-4 text-slate-300" />
        What&apos;s new
        <span className="size-1.5 rounded-full bg-violet-400" />
      </Link>
      <label className="hidden h-9 w-full max-w-[335px] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:flex">
        <Search className="size-4 text-slate-500" />
        <span className="flex-1">Search anything...</span>
        <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-slate-400">
          ⌘ /
        </kbd>
      </label>
      <Button
        aria-label="Notifications"
        className="text-slate-300"
        size="icon"
        type="button"
        variant="ghost"
      >
        <Bell className="size-5" />
      </Button>
      <button className="flex items-center gap-2 text-sm text-slate-300">
        <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-violet-700 font-semibold text-white">
          AM
        </span>
        <ChevronDown className="size-4" />
      </button>
    </header>
  );
}

export function ScheduledHeader() {
  return (
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Scheduled Uploads
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Plan, manage, and publish your content on the perfect schedule.
        </p>
      </div>
      <Button asChild className="h-10 px-5" data-testid="primary-action">
        <Link href="/dashboard/library">
          <Plus className="size-4" />
          Schedule upload
        </Link>
      </Button>
    </header>
  );
}

export function ScheduledToolbar({
  data,
  filters,
}: {
  data: ScheduledScreenData;
  filters: ScheduledFilters;
}) {
  const previousWeek = weekHref(filters, data.weekStart, -7);
  const nextWeek = weekHref(filters, data.weekStart, 7);

  return (
    <form className="grid gap-3 xl:grid-cols-[165px_165px_minmax(260px,1fr)_230px_auto_auto_auto_auto]">
      <ScheduledSelect
        name="channel"
        options={data.filters.channels}
        value={filters.channel}
      />
      <ScheduledSelect
        name="status"
        options={data.filters.statuses}
        value={filters.status}
      />
      <label className="flex h-10 items-center gap-3 rounded-lg border border-white/10 bg-[#0c1527] px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <Search className="size-4 text-slate-500" />
        <input
          className="min-w-0 flex-1 bg-transparent text-slate-200 outline-none placeholder:text-slate-500"
          defaultValue={filters.query}
          name="q"
          placeholder="Search uploads..."
        />
      </label>
      <ScheduledSelect
        name="timezone"
        options={[
          { label: data.timezoneLabel, value: data.timezone },
          { label: "(UTC) Coordinated Time", value: "UTC" },
          { label: "(UTC-5) Eastern Time", value: "America/New_York" },
          { label: "(UTC-8) Pacific Time", value: "America/Los_Angeles" },
        ]}
        value={filters.timezone}
      />
      <Button
        asChild
        className="h-10 px-4 text-slate-200"
        type="button"
        variant="outline"
      >
        <Link href={todayHref(filters)}>Today</Link>
      </Button>
      <div className="flex h-10 overflow-hidden rounded-lg border border-white/10 bg-[#0c1527]">
        <Link
          aria-label="Previous week"
          className="grid w-11 place-items-center text-slate-300 hover:bg-white/[0.04]"
          href={previousWeek}
        >
          <ChevronLeft className="size-4" />
        </Link>
        <Link
          aria-label="Next week"
          className="grid w-11 place-items-center border-l border-white/10 text-slate-300 hover:bg-white/[0.04]"
          href={nextWeek}
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>
      <Button
        className="h-10 px-4 text-slate-200"
        type="submit"
        variant="outline"
      >
        Week
        <ChevronDown className="size-4 text-slate-400" />
      </Button>
      <Button
        aria-label="Calendar options"
        className="h-10"
        size="icon"
        type="button"
        variant="outline"
      >
        <CalendarDays className="size-4" />
      </Button>
    </form>
  );
}

export function ScheduledCalendar({
  data,
  filters,
}: {
  data: ScheduledScreenData;
  filters: ScheduledFilters;
}) {
  const uploadsByDay = new Map<number, ScheduledUpload[]>();

  for (const upload of data.uploads) {
    uploadsByDay.set(upload.dayIndex, [
      ...(uploadsByDay.get(upload.dayIndex) ?? []),
      upload,
    ]);
  }

  return (
    <section className="bussin-panel overflow-hidden rounded-lg">
      <div className="border-b border-white/10 px-5 py-4 text-center">
        <h2 className="text-lg font-semibold text-white">{data.weekLabel}</h2>
      </div>
      <div className="grid grid-cols-[72px_repeat(7,minmax(110px,1fr))] overflow-x-auto">
        <div className="border-r border-white/10 border-b border-white/10 bg-[#0b1427]" />
        {data.days.map((day) => (
          <div
            className="border-r border-white/10 border-b border-white/10 px-3 py-3 text-center last:border-r-0"
            key={day.date}
          >
            <p className="text-sm font-medium text-slate-300">{day.dayLabel}</p>
            <p className="mt-1 text-xs text-slate-500">{day.monthLabel}</p>
            {day.isToday ? (
              <span className="mx-auto mt-2 grid size-6 place-items-center rounded-full bg-violet-600 text-xs font-bold text-white">
                {day.dayNumber}
              </span>
            ) : null}
          </div>
        ))}
        <div className="relative col-span-8 grid grid-cols-[72px_repeat(7,minmax(110px,1fr))]">
          {timeRows.map((time) => (
            <div className="contents" key={time}>
              <div className="h-[72px] border-r border-white/10 border-b border-white/8 bg-[#0b1427]/80 px-4 py-4 text-sm text-slate-400">
                {time}
              </div>
              {data.days.map((day) => (
                <div
                  className="h-[72px] border-r border-white/10 border-b border-white/8 bg-[#081225]/60 last:border-r-0"
                  key={`${day.date}-${time}`}
                />
              ))}
            </div>
          ))}
          <div className="pointer-events-none absolute inset-y-0 left-[72px] right-0 grid grid-cols-7">
            {data.days.map((day, index) => (
              <div
                className="relative border-r border-white/5 last:border-r-0"
                key={day.date}
              >
                {(uploadsByDay.get(index) ?? []).map((upload) => (
                  <CalendarUploadCard key={upload.uploadId} upload={upload} />
                ))}
                {index === 0 ? <AddUploadSlot /> : null}
                {index === 3 ? <EmptyUploadSlot /> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 px-5 py-4 text-sm text-slate-400">
        <Clock3 className="size-4" />
        All times shown in {data.timezoneLabel}
        {filters.query ||
        filters.channel !== "all" ||
        filters.status !== "all" ? (
          <Link
            className="ml-auto text-violet-200 hover:text-white"
            href="/dashboard/scheduled"
          >
            Clear filters
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export function ScheduledSidebar({ data }: { data: ScheduledScreenData }) {
  const upcoming = data.upcomingUploads
    .filter((upload) => upload.status !== "cancelled")
    .slice(0, 6);

  return (
    <aside className="space-y-3">
      <section className="bussin-panel rounded-lg p-4">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Upcoming uploads</h2>
          <span className="rounded-md bg-slate-950/60 px-2 py-0.5 font-mono text-xs text-slate-300">
            {data.counts.upcoming}
          </span>
        </div>
        <div className="space-y-3">
          {upcoming.map((upload, index) => (
            <UpcomingUploadRow
              index={index}
              key={upload.uploadId}
              upload={upload}
            />
          ))}
        </div>
        <Button
          asChild
          className="mt-4 h-9 w-full text-slate-200"
          variant="outline"
        >
          <Link href="/dashboard/scheduled">
            View all uploads
            <ChevronRight className="ml-auto size-4" />
          </Link>
        </Button>
      </section>
      <section className="bussin-panel rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white">Schedule summary</h2>
        <div className="mt-4 space-y-3">
          <SummaryRow
            icon={<CalendarDays className="size-5" />}
            label="Total this week"
            tone="blue"
            value={String(data.summary.totalThisWeek)}
          />
          <SummaryRow
            icon={<Clock3 className="size-5" />}
            label="Next upload"
            tone="emerald"
            value={data.summary.nextUploadLabel}
          />
          <SummaryRow
            icon={<Settings className="size-5" />}
            label="Current timezone"
            tone="violet"
            value={data.summary.timezoneLabel}
          />
        </div>
        <Button
          asChild
          className="mt-4 h-9 w-full text-slate-200"
          variant="outline"
        >
          <Link href="/dashboard/settings">
            Go to Calendar settings
            <ExternalLink className="ml-auto size-4" />
          </Link>
        </Button>
      </section>
    </aside>
  );
}

export function EmptyScheduledState() {
  return (
    <section
      className="grid min-h-[520px] place-items-center rounded-lg border border-white/10 bg-[#0d1729]/88 px-6 text-center"
      data-testid="empty-state"
    >
      <div className="max-w-sm">
        <span className="mx-auto grid size-16 place-items-center rounded-lg border border-violet-400/35 bg-violet-500/10 text-violet-200">
          <CalendarDays className="size-8" />
        </span>
        <h2 className="mt-6 text-lg font-semibold text-white">
          No scheduled uploads
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Publish-ready tracks can be scheduled from the library or track
          preview.
        </p>
        <Button asChild className="mt-6" data-testid="primary-action">
          <Link href="/dashboard/library">Open library</Link>
        </Button>
      </div>
    </section>
  );
}

export function NoScheduledResultsState() {
  return (
    <section
      className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-8 text-center"
      data-testid="empty-state"
    >
      <h2 className="text-lg font-semibold text-white">No matching uploads</h2>
      <p className="mt-2 text-sm text-slate-400">
        Adjust your filters or search terms to see more scheduled uploads.
      </p>
    </section>
  );
}

export function ScheduledUploadRow({
  index = 0,
  upload,
}: {
  index?: number;
  upload: ScheduledUpload;
}) {
  return (
    <article
      className="grid gap-4 rounded-lg border border-white/10 bg-[#0d1729]/88 p-3 md:grid-cols-[72px_minmax(0,1fr)_180px_180px_150px] md:items-center"
      data-testid="scheduled-upload-row"
    >
      <Cover index={index} upload={upload} />
      <div className="min-w-0">
        <h3 className="truncate font-semibold text-white">{upload.title}</h3>
        <p className="mt-1 truncate text-sm text-slate-400">
          {upload.channel?.title ?? "No channel linked"}
        </p>
      </div>
      <div>
        <StatusChip label={upload.statusLabel} tone={upload.statusTone} />
        {upload.failureReason ? (
          <p className="mt-2 line-clamp-2 text-xs text-red-300">
            {upload.failureReason}
          </p>
        ) : null}
      </div>
      <time
        className="text-sm text-slate-300"
        dateTime={upload.scheduledAt ?? ""}
      >
        {upload.timeLabel}
      </time>
      <ScheduledUploadActions upload={upload} />
    </article>
  );
}

function CalendarUploadCard({ upload }: { upload: ScheduledUpload }) {
  const top =
    upload.timeSlot === null ? 54 : 72 + Math.min(upload.timeSlot, 720) * 1.2;

  return (
    <article
      className={cn(
        "pointer-events-auto absolute right-2 left-2 min-h-[210px] rounded-lg border bg-[#171433]/95 p-2 shadow-[0_18px_34px_rgba(0,0,0,0.28)]",
        upload.statusTone === "cyan"
          ? "border-cyan-400/55"
          : upload.statusTone === "red"
            ? "border-red-400/55"
            : upload.statusTone === "emerald"
              ? "border-emerald-400/55"
              : upload.statusTone === "blue"
                ? "border-blue-400/55"
                : "border-violet-400/55",
      )}
      data-testid="scheduled-upload-card"
      style={{ top }}
    >
      <div className="flex gap-2">
        <Cover className="size-10 rounded-md" upload={upload} />
        <div className="min-w-0">
          <h3 className="truncate text-xs font-semibold text-white">
            {upload.title}
          </h3>
          <p className="mt-1 text-xs text-slate-300">{upload.timeLabel}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        {upload.platform === "youtube" ? (
          <PlaySquare className="size-3.5 text-red-400" />
        ) : (
          <Send className="size-3.5 text-slate-200" />
        )}
        <StatusChip
          label={upload.statusLabel}
          tone={upload.statusTone}
          compact
        />
      </div>
      <div className="mt-3 border-t border-white/10 pt-3">
        <ScheduledUploadActions upload={upload} />
      </div>
    </article>
  );
}

function UpcomingUploadRow({
  index,
  upload,
}: {
  index: number;
  upload: ScheduledUpload;
}) {
  return (
    <article
      className="rounded-lg border border-white/10 bg-[#0c1527] p-2.5"
      data-testid="scheduled-upload-row"
    >
      <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3">
        <Cover index={index} upload={upload} />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">
            {upload.title}
          </h3>
          <p className="mt-1 truncate text-xs text-slate-400">
            {upload.timeLabel}
            {upload.platform === "youtube" ? "  ·  YouTube" : "  ·  TikTok"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip
            label={upload.statusLabel}
            tone={upload.statusTone}
            compact
          />
          <MoreVertical className="size-4 text-slate-500" />
        </div>
      </div>
      <div className="mt-3 border-t border-white/10 pt-3">
        <ScheduledUploadActions upload={upload} />
      </div>
    </article>
  );
}

function SummaryRow({
  icon,
  label,
  tone,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "blue" | "emerald" | "violet";
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0c1527] p-3">
      <span
        className={cn(
          "grid size-9 place-items-center rounded-lg",
          tone === "blue"
            ? "bg-blue-500/14 text-blue-300"
            : tone === "emerald"
              ? "bg-emerald-500/14 text-emerald-300"
              : "bg-violet-500/14 text-violet-200",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{value}</p>
        <p className="mt-0.5 text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function AddUploadSlot() {
  return (
    <div className="absolute right-2 left-2 grid h-24 place-items-center rounded-lg border border-dashed border-white/25 text-center text-sm text-slate-400 top-[900px]">
      <div>
        <Plus className="mx-auto mb-2 size-5" />
        Add upload
      </div>
    </div>
  );
}

function EmptyUploadSlot() {
  return (
    <div className="absolute right-2 left-2 grid h-32 place-items-center rounded-lg border border-dashed border-violet-400/35 bg-violet-500/[0.03] text-center text-sm text-slate-400 top-[620px]">
      <div>
        <CalendarDays className="mx-auto mb-3 size-5" />
        No uploads
        <br />
        scheduled
      </div>
    </div>
  );
}

function ScheduledSelect({
  name,
  options,
  value,
}: {
  name: string;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <label className="relative">
      <select
        className="h-10 w-full appearance-none rounded-lg border border-white/10 bg-[#0c1527] px-4 pr-9 text-sm font-medium text-white outline-none"
        defaultValue={value}
        name={name}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {options.map((option) => (
          <option key={`${name}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-3 right-3 size-4 text-slate-400" />
    </label>
  );
}

function Cover({
  className,
  index = 0,
  upload,
}: {
  className?: string;
  index?: number;
  upload: ScheduledUpload;
}) {
  const baseClass = cn(
    "size-14 shrink-0 overflow-hidden rounded-md bg-slate-950",
    className,
  );

  if (upload.coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={`${upload.title} cover`}
        className={cn(baseClass, "object-cover")}
        src={upload.coverUrl}
      />
    );
  }

  return (
    <div
      aria-label={`${upload.title} generated cover`}
      className={cn(
        baseClass,
        `library-cover-art library-cover-art-${index % 7}`,
      )}
      role="img"
    />
  );
}

function StatusChip({
  compact = false,
  label,
  tone,
}: {
  compact?: boolean;
  label: string;
  tone: ScheduledStatusTone;
}) {
  const classNameByTone: Record<ScheduledStatusTone, string> = {
    blue: "border-blue-300/20 bg-blue-400/10 text-blue-200",
    cyan: "border-cyan-300/20 bg-cyan-400/10 text-cyan-200",
    emerald: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
    red: "border-red-300/20 bg-red-500/10 text-red-200",
    slate: "border-white/10 bg-white/[0.05] text-slate-300",
    violet: "border-violet-300/25 bg-violet-500/16 text-violet-200",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-md border font-medium",
        compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1 text-xs",
        classNameByTone[tone],
      )}
    >
      {label}
    </span>
  );
}

function todayHref(filters: ScheduledFilters) {
  return buildHref(filters, { week: new Date().toISOString() });
}

function weekHref(
  filters: ScheduledFilters,
  currentWeek: string,
  deltaDays: number,
) {
  const date = new Date(currentWeek);

  date.setDate(date.getDate() + deltaDays);

  return buildHref(filters, { week: date.toISOString() });
}

function buildHref(
  filters: ScheduledFilters,
  overrides: Partial<ScheduledFilters>,
) {
  const params = new URLSearchParams();
  const next = { ...filters, ...overrides };

  if (next.channel !== "all") {
    params.set("channel", next.channel);
  }

  if (next.status !== "all") {
    params.set("status", next.status);
  }

  if (next.query) {
    params.set("q", next.query);
  }

  if (next.timezone) {
    params.set("timezone", next.timezone);
  }

  if (next.week) {
    params.set("week", next.week);
  }

  const query = params.toString();

  return query ? `/dashboard/scheduled?${query}` : "/dashboard/scheduled";
}
