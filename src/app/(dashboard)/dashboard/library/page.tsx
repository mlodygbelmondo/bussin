import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, ChevronDown, Megaphone, PlusCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isMockMode, mockUser } from "@/lib/app-config";
import { createClient } from "@/lib/supabase/server";
import {
  EmptyLibraryState,
  LibraryPagination,
  LibraryToolbar,
  LibraryTrackGrid,
  NoFilterResultsState,
} from "@/modules/library/library-components";
import { getLibraryScreenData } from "@/modules/library/library.queries";
import type { LibraryFilters } from "@/modules/library/library.types";

type LibraryPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const user = isMockMode
    ? { id: mockUser.id }
    : (await (await createClient()).auth.getUser()).data.user;

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const filters = toFilters(params);
  const page = toPositiveInteger(singleParam(params?.page));
  const data = await getLibraryScreenData(user.id, filters, page);

  if (!data) {
    redirect("/onboarding");
  }

  return (
    <main
      className="min-h-[100dvh] bg-[#07101f] text-foreground"
      data-testid="screen-dashboard-library"
    >
      <TopBar />
      <div className="mx-auto max-w-[1536px] px-4 py-6 lg:px-9">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Library
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Manage and organize all your generated tracks.
            </p>
          </div>
          <Button asChild data-testid="primary-action">
            <Link href="/dashboard/generate">
              <PlusCircle className="size-4" />
              New generation
            </Link>
          </Button>
        </header>

        <section className="bussin-panel rounded-lg p-3">
          <LibraryToolbar data={data} filters={filters} />

          <div className="mt-4">
            {data.isEmpty ? (
              <EmptyLibraryState />
            ) : data.tracks.length === 0 ? (
              <NoFilterResultsState filters={filters} />
            ) : (
              <LibraryTrackGrid tracks={data.tracks} view={filters.view} />
            )}
          </div>

          {!data.isEmpty && data.tracks.length > 0 ? (
            <LibraryPagination data={data} filters={filters} />
          ) : null}
        </section>
      </div>
    </main>
  );
}

function TopBar() {
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

function toFilters(
  params?: Record<string, string | string[] | undefined>,
): LibraryFilters {
  const view = singleParam(params?.view);

  return {
    channel: singleParam(params?.channel) ?? "all",
    date: singleParam(params?.date) ?? "all",
    mood: singleParam(params?.mood) ?? "all",
    query: singleParam(params?.q) ?? "",
    status: singleParam(params?.status) ?? "all",
    view: view === "list" ? "list" : "card",
  };
}

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toPositiveInteger(value?: string) {
  const parsed = Number(value ?? "1");

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}
