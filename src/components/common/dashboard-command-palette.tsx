"use client";

import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CirclePlay,
  CreditCard,
  Filter,
  Grid2X2,
  Library,
  Link2,
  Music2,
  Search,
  Settings,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  dashboardCommandSections,
  filterDashboardCommandItems,
} from "@/components/common/dashboard-command-data";
import type {
  DashboardCommandIcon,
  DashboardCommandItem,
} from "@/components/common/dashboard-command-data";

const iconMap = {
  billing: CreditCard,
  calendar: CalendarDays,
  channels: Link2,
  filter: Filter,
  generate: Sparkles,
  library: Library,
  overview: Grid2X2,
  queue: BarChart3,
  settings: Settings,
  suno: Music2,
  template: WandSparkles,
  youtube: CirclePlay,
} satisfies Record<DashboardCommandIcon, LucideIcon>;

type CommandRow = {
  index: number;
  item: DashboardCommandItem;
};

export function DashboardCommandPalette() {
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(() => filterDashboardCommandItems(query), [query]);

  const groupedRows = useMemo(
    () =>
      dashboardCommandSections
        .map((section) => ({
          rows: results.reduce<CommandRow[]>((rows, item, index) => {
            if (item.section === section) {
              rows.push({ index, item });
            }

            return rows;
          }, []),
          section,
        }))
        .filter((group) => group.rows.length > 0),
    [results],
  );

  useEffect(() => {
    function openFromKeyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";
      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        if (open) {
          setQuery("");
          setOpen(false);
        } else {
          setActiveIndex(0);
          setOpen(true);
        }
        return;
      }

      if (!isEditable && event.key === "/") {
        event.preventDefault();
        setActiveIndex(0);
        setOpen(true);
      }
    }

    window.addEventListener("keydown", openFromKeyboard);

    return () => window.removeEventListener("keydown", openFromKeyboard);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  function openCommand(item: DashboardCommandItem) {
    setOpen(false);
    setQuery("");
    router.push(item.href);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setActiveIndex(0);
    } else {
      setQuery("");
    }

    setOpen(nextOpen);
  }

  function handleQueryChange(value: string) {
    setActiveIndex(0);
    setQuery(value);
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        results.length === 0 ? 0 : (current + 1) % results.length,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        results.length === 0
          ? 0
          : (current - 1 + results.length) % results.length,
      );
      return;
    }

    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      openCommand(results[activeIndex]);
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <button
          className="flex h-9 w-9 shrink-0 items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-0 text-sm text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-violet-300/30 hover:bg-violet-500/10 hover:text-slate-200 focus-visible:border-violet-300/45 focus-visible:ring-[3px] focus-visible:ring-violet-500/25 focus-visible:outline-none md:w-full md:max-w-[380px] md:justify-start md:px-4"
          data-testid="dashboard-command-trigger"
          type="button"
        >
          <Search className="size-4 text-slate-500" />
          <span className="hidden flex-1 text-left md:block">
            Search anything...
          </span>
          <kbd className="hidden rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-slate-400 md:inline-flex">
            Ctrl K
          </kbd>
          <span className="sr-only">Open dashboard search</span>
        </button>
      </DialogTrigger>
      <DialogContent
        className="top-[18dvh] max-h-[min(680px,calc(100dvh-3rem))] max-w-[680px] translate-y-0 overflow-hidden rounded-lg border-white/10 bg-[#080e1d]/96 p-0 text-white shadow-[0_28px_100px_rgba(0,0,0,0.55),0_0_80px_rgba(124,58,237,0.16)] backdrop-blur-xl sm:max-w-[680px]"
        data-testid="dashboard-command-palette"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Dashboard search</DialogTitle>
        <DialogDescription className="sr-only">
          Search pages, views, integrations, and generation shortcuts.
        </DialogDescription>
        <div className="border-b border-white/10 bg-white/[0.03]">
          <div className="flex h-14 items-center gap-3 px-4">
            <Search className="size-5 text-violet-200" />
            <input
              aria-label="Search dashboard commands"
              className="h-full min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-500"
              data-testid="dashboard-command-input"
              onChange={(event) => handleQueryChange(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search pages, actions, filters..."
              ref={inputRef}
              value={query}
            />
            <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-slate-400">
              Esc
            </kbd>
          </div>
        </div>

        <div className="max-h-[470px] overflow-y-auto p-2">
          {groupedRows.length > 0 ? (
            groupedRows.map((group) => (
              <section className="py-1" key={group.section}>
                <h3 className="px-2 pb-1.5 pt-2 text-[11px] font-semibold uppercase text-slate-500">
                  {group.section}
                </h3>
                <div className="grid gap-1">
                  {group.rows.map(({ index, item }) => (
                    <CommandResult
                      active={index === activeIndex}
                      current={pathname === item.href}
                      item={item}
                      key={item.id}
                      onOpen={() => openCommand(item)}
                      onPreview={() => router.prefetch(item.href)}
                      onSelect={() => setActiveIndex(index)}
                    />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div
              className="grid min-h-48 place-items-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-8 text-center"
              data-testid="dashboard-command-empty"
            >
              <div>
                <Search className="mx-auto size-8 text-slate-600" />
                <p className="mt-3 font-medium text-white">No results</p>
                <p className="mt-1 text-sm text-slate-500">
                  Try searching for a page, queue status, connection, or
                  generation style.
                </p>
              </div>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/[0.025] px-4 py-3 text-xs text-slate-500">
          <span>Type to filter dashboard options</span>
          <span className="flex items-center gap-2">
            <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono">
              ↑↓
            </kbd>
            <span>navigate</span>
            <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono">
              Enter
            </kbd>
            <span>open</span>
          </span>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function CommandResult({
  active,
  current,
  item,
  onOpen,
  onPreview,
  onSelect,
}: {
  active: boolean;
  current: boolean;
  item: DashboardCommandItem;
  onOpen: () => void;
  onPreview: () => void;
  onSelect: () => void;
}) {
  const Icon = iconMap[item.icon];

  return (
    <button
      className={cn(
        "group grid min-h-16 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-2 text-left outline-none transition",
        active
          ? "bg-violet-500/15 text-white shadow-[inset_0_0_0_1px_rgba(167,139,250,0.24)]"
          : "text-slate-300 hover:bg-white/[0.04]",
      )}
      data-active={active}
      data-testid="dashboard-command-result"
      onClick={onOpen}
      onMouseEnter={() => {
        onSelect();
        onPreview();
      }}
      type="button"
    >
      <span
        className={cn(
          "grid size-10 place-items-center rounded-md border",
          active
            ? "border-violet-300/35 bg-violet-500/18 text-violet-100"
            : "border-white/10 bg-white/[0.04] text-slate-400",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{item.title}</span>
          {current ? (
            <span className="rounded border border-emerald-300/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-200">
              Current
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">
          {item.subtitle}
        </span>
      </span>
      <ArrowRight
        className={cn(
          "size-4 text-slate-600 transition",
          active ? "translate-x-0 text-violet-200" : "-translate-x-1",
        )}
      />
    </button>
  );
}
