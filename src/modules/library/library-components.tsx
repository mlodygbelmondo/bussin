"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  Library,
  List,
  Music2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  LibraryFilters,
  LibraryScreenData,
  LibraryStatusTone,
  LibraryTrack,
} from "@/modules/library/library.types";
import {
  LibraryMoreMenu,
  LibraryTrackActions,
} from "@/modules/library/library-track-actions";

export function LibraryToolbar({
  data,
  filters,
}: {
  data: LibraryScreenData;
  filters: LibraryFilters;
}) {
  return (
    <form
      className="grid gap-3 xl:grid-cols-[minmax(280px,1.2fr)_130px_130px_150px_150px_auto_auto]"
      method="get"
    >
      {filters.view === "list" ? (
        <input name="view" type="hidden" value="list" />
      ) : null}
      <label className="flex h-10 items-center gap-3 rounded-lg border border-white/10 bg-[#0c1527] px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <Search className="size-4 text-slate-500" />
        <input
          className="min-w-0 flex-1 bg-transparent text-slate-200 outline-none placeholder:text-slate-500"
          defaultValue={filters.query}
          name="q"
          placeholder="Search tracks..."
        />
      </label>
      <LibrarySelect
        label="Status"
        name="status"
        options={data.filters.statuses}
        value={filters.status}
      />
      <LibrarySelect
        label="Mood"
        name="mood"
        options={data.filters.moods}
        value={filters.mood}
      />
      <LibrarySelect
        label="Duration"
        name="date"
        options={[
          { label: "Any", value: "all" },
          { label: "Last 7 days", value: "7d" },
          { label: "Last 30 days", value: "30d" },
          { label: "Last 90 days", value: "90d" },
        ]}
        value={filters.date}
      />
      <LibrarySelect
        label="Channel"
        name="channel"
        options={data.filters.channels}
        value={filters.channel}
      />
      <div className="flex h-10 overflow-hidden rounded-lg border border-violet-400/40 bg-slate-950/30">
        <Link
          className={
            filters.view === "card"
              ? "flex items-center gap-2 bg-violet-600 px-4 text-sm font-semibold text-white"
              : "flex items-center gap-2 px-4 text-sm font-medium text-slate-300 hover:bg-white/[0.04]"
          }
          href={buildFilterHref(filters, { view: "card" })}
        >
          <Grid2X2 className="size-4" />
          Card
        </Link>
        <Link
          className={
            filters.view === "list"
              ? "flex items-center gap-2 bg-violet-600 px-4 text-sm font-semibold text-white"
              : "flex items-center gap-2 px-4 text-sm font-medium text-slate-300 hover:bg-white/[0.04]"
          }
          href={buildFilterHref(filters, { view: "list" })}
        >
          <List className="size-4" />
          List
        </Link>
      </div>
      <div className="hidden h-10 items-center justify-end whitespace-nowrap px-2 text-sm text-slate-500 xl:flex">
        {data.counts.all} tracks
      </div>
      <button className="sr-only" type="submit">
        Apply filters
      </button>
    </form>
  );
}

export function LibraryTrackGrid({
  tracks,
  view,
}: {
  tracks: LibraryTrack[];
  view: LibraryFilters["view"];
}) {
  if (view === "list") {
    return (
      <div className="grid gap-2" data-testid="track-list">
        {tracks.map((track, index) => (
          <LibraryTrackListItem
            index={index}
            key={track.trackId}
            track={track}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      data-testid="track-list"
    >
      {tracks.map((track, index) => (
        <LibraryTrackCard index={index} key={track.trackId} track={track} />
      ))}
    </div>
  );
}

export function LibraryTrackCard({
  index,
  track,
}: {
  index: number;
  track: LibraryTrack;
}) {
  return (
    <article
      className="overflow-hidden rounded-lg border border-white/10 bg-[#0d1729]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_55px_rgba(0,0,0,0.22)]"
      data-testid="track-card"
    >
      <div className="relative aspect-[1.42] overflow-hidden bg-slate-950">
        <input
          aria-label={`Select ${track.title}`}
          className="absolute top-3 left-3 z-10 size-5 rounded border-white/25 bg-slate-950/45 accent-violet-500"
          type="checkbox"
        />
        <LibraryCover index={index} track={track} />
        <LibraryMoreMenu track={track} />
        <span className="absolute right-3 bottom-3 rounded-md bg-slate-950/70 px-2 py-1 text-xs font-medium text-white">
          {track.durationLabel}
        </span>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-white">
              {track.title}
            </h2>
            <p className="mt-1 truncate text-xs text-slate-400">
              {track.tags.slice(0, 3).join("  •  ") ||
                [track.style, track.mood].filter(Boolean).join("  •  ")}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <StatusChip label={track.statusLabel} tone={track.statusTone} />
          <time className="text-xs text-slate-400" dateTime={track.createdAt}>
            {formatDate(track.createdAt)}
          </time>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <ChannelAvatar channel={track.channel} index={index} />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-300">
              {track.channel?.title ?? "No channel linked"}
            </p>
            <p className="truncate text-xs text-slate-500">
              {track.channel?.handle ?? "Draft workspace asset"}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <LibraryTrackActions track={track} />
        </div>
      </div>
    </article>
  );
}

export function LibraryTrackListItem({
  index,
  track,
}: {
  index: number;
  track: LibraryTrack;
}) {
  return (
    <article
      className="grid gap-4 rounded-lg border border-white/10 bg-[#0d1729]/88 p-3 md:grid-cols-[96px_minmax(0,1fr)_150px_220px]"
      data-testid="track-list-item"
    >
      <div className="relative aspect-[1.42] overflow-hidden rounded-md bg-slate-950">
        <LibraryCover index={index} track={track} />
        <span className="absolute right-2 bottom-2 rounded bg-slate-950/70 px-1.5 py-0.5 text-[11px] text-white">
          {track.durationLabel}
        </span>
      </div>
      <div className="min-w-0 self-center">
        <h2 className="truncate text-base font-semibold text-white">
          {track.title}
        </h2>
        <p className="mt-1 truncate text-sm text-slate-400">
          {[track.style, track.mood].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="self-center">
        <StatusChip label={track.statusLabel} tone={track.statusTone} />
        <p className="mt-2 text-xs text-slate-500">
          {formatDate(track.createdAt)}
        </p>
      </div>
      <div className="self-center">
        <LibraryTrackActions track={track} />
      </div>
    </article>
  );
}

export function LibraryPagination({
  data,
  filters,
}: {
  data: LibraryScreenData;
  filters: LibraryFilters;
}) {
  const pages = Array.from(
    { length: Math.min(data.page.totalPages, 3) },
    (_, index) => index + 1,
  );

  return (
    <footer className="flex flex-col gap-4 pt-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
      <p>
        Showing {data.page.start}-{data.page.end} of {data.counts.filtered}{" "}
        tracks
      </p>
      <div className="flex items-center justify-center gap-2">
        <PageButton
          disabled={!data.page.hasPrevious}
          href={buildFilterHref(filters, { page: data.page.current - 1 })}
        >
          <ChevronLeft className="size-4" />
        </PageButton>
        {pages.map((page) => (
          <PageButton
            active={page === data.page.current}
            href={buildFilterHref(filters, { page })}
            key={page}
          >
            {page}
          </PageButton>
        ))}
        <PageButton
          disabled={!data.page.hasNext}
          href={buildFilterHref(filters, { page: data.page.current + 1 })}
        >
          <ChevronRight className="size-4" />
        </PageButton>
      </div>
      <button
        className="h-10 rounded-lg border border-white/10 bg-[#0c1527] px-4 text-slate-300"
        type="button"
      >
        {data.page.pageSize} per page
        <ChevronDown className="ml-2 inline size-4" />
      </button>
    </footer>
  );
}

export function EmptyLibraryState() {
  return (
    <section
      className="grid min-h-[420px] place-items-center rounded-lg border border-white/10 bg-[#0d1729]/88 px-6 text-center"
      data-testid="empty-state"
    >
      <div className="max-w-sm">
        <span className="mx-auto grid size-16 place-items-center rounded-lg border border-violet-400/35 bg-violet-500/10 text-violet-200">
          <Library className="size-8" />
        </span>
        <h2 className="mt-6 text-lg font-semibold text-white">
          No tracks found
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Create a generation and your reusable tracks, covers, prompts, and
          upload-ready assets will appear here.
        </p>
        <Button asChild className="mt-6" data-testid="primary-action">
          <Link href="/dashboard/generate">Create generation</Link>
        </Button>
      </div>
    </section>
  );
}

export function NoFilterResultsState({ filters }: { filters: LibraryFilters }) {
  return (
    <section
      className="grid min-h-[300px] place-items-center rounded-lg border border-white/10 bg-[#0d1729]/88 px-6 text-center"
      data-testid="empty-state"
    >
      <div className="max-w-sm">
        <span className="mx-auto grid size-16 place-items-center rounded-lg border border-violet-400/35 bg-violet-500/10 text-violet-200">
          <Music2 className="size-8" />
        </span>
        <h2 className="mt-6 text-lg font-semibold text-white">
          No tracks found
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Try adjusting your filters or search terms to find what you&apos;re
          looking for.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href={buildFilterHref(filters, { reset: true })}>
            Clear filters
          </Link>
        </Button>
      </div>
    </section>
  );
}

function LibrarySelect({
  label,
  name,
  options,
  value,
}: {
  label: string;
  name: string;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        className="h-10 w-full appearance-none rounded-lg border border-white/10 bg-[#0c1527] px-4 pr-8 text-sm font-medium text-white outline-none"
        defaultValue={value}
        name={name}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {label} {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-3 right-3 size-4 text-slate-400" />
    </label>
  );
}

function LibraryCover({
  index,
  track,
}: {
  index: number;
  track: LibraryTrack;
}) {
  if (track.coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={`${track.title} cover`}
        className="size-full object-cover"
        src={track.coverUrl}
      />
    );
  }

  return (
    <div
      aria-label={`${track.title} generated cover`}
      className={`library-cover-art library-cover-art-${index % 7}`}
      role="img"
    />
  );
}

function ChannelAvatar({
  channel,
  index,
}: {
  channel: LibraryTrack["channel"];
  index: number;
}) {
  if (channel?.thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="size-7 rounded-full object-cover ring-1 ring-white/10"
        src={channel.thumbnailUrl}
      />
    );
  }

  return (
    <span
      className={`album-art album-art-${index % 6} shrink-0 rounded-full`}
    />
  );
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: LibraryStatusTone;
}) {
  const classNameByTone: Record<LibraryStatusTone, string> = {
    amber: "border-amber-300/20 bg-amber-400/10 text-amber-200",
    blue: "border-blue-300/20 bg-blue-400/10 text-blue-200",
    emerald: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
    red: "border-red-300/20 bg-red-500/10 text-red-200",
    slate: "border-white/10 bg-white/[0.05] text-slate-300",
    violet: "border-violet-300/25 bg-violet-500/16 text-violet-200",
  };

  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${classNameByTone[tone]}`}
    >
      {label}
    </span>
  );
}

function PageButton({
  active,
  children,
  disabled,
  href,
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  href: string;
}) {
  if (disabled) {
    return (
      <span className="grid size-9 place-items-center rounded-lg border border-white/10 text-slate-700">
        {children}
      </span>
    );
  }

  return (
    <Link
      className={
        active
          ? "grid size-9 place-items-center rounded-lg bg-violet-600 text-sm font-semibold text-white"
          : "grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-sm text-slate-300 hover:bg-white/[0.06]"
      }
      href={href}
    >
      {children}
    </Link>
  );
}

function buildFilterHref(
  filters: LibraryFilters,
  overrides: Partial<LibraryFilters> & { page?: number; reset?: boolean },
) {
  if (overrides.reset) {
    return "/dashboard/library";
  }

  const params = new URLSearchParams();
  const next = { ...filters, ...overrides };

  for (const [key, value] of Object.entries(next)) {
    if (!value || value === "all" || (key === "view" && value === "card")) {
      continue;
    }

    params.set(key === "query" ? "q" : key, String(value));
  }

  return `/dashboard/library${params.size ? `?${params.toString()}` : ""}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
