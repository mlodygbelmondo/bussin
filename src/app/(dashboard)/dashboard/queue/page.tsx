import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  ExternalLink,
  Grid2X2,
  Loader2,
  MoreVertical,
  Search,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardTopBar } from "@/components/common/dashboard-top-bar";
import { isMockMode, mockUser } from "@/lib/app-config";
import { createClient } from "@/lib/supabase/server";
import { QueueActionButton } from "@/modules/queue/queue-action-button";
import {
  QueueProgress,
  QueueStatusChip,
} from "@/modules/queue/queue-components";
import { getGenerationQueueData } from "@/modules/queue/queue.queries";
import type {
  QueueGroup,
  QueueScreenData,
  QueueTrackItem,
} from "@/modules/queue/queue.types";

type QueuePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Queued", value: "queued" },
  { label: "Generating", value: "generating" },
  { label: "Preview ready", value: "preview_ready" },
  { label: "Rendering", value: "rendering" },
  { label: "Uploading", value: "uploading" },
  { label: "Uploaded", value: "uploaded" },
  { label: "Failed", value: "failed" },
];

export default async function QueuePage({ searchParams }: QueuePageProps) {
  const user = isMockMode
    ? { id: mockUser.id }
    : (await (await createClient()).auth.getUser()).data.user;

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const query = singleParam(params?.q);
  const status = singleParam(params?.status) ?? "all";
  const data = await getGenerationQueueData(user.id, { query, status });

  if (!data) {
    redirect("/onboarding");
  }

  return (
    <main
      className="min-h-[100dvh] bg-[#07101f] text-foreground"
      data-testid="screen-dashboard-queue"
    >
      <DashboardTopBar />
      <div className="mx-auto max-w-[1536px] px-4 py-5 lg:px-9">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Generation Queue
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Track the status of your music generations.
          </p>
        </header>

        <QueueToolbar data={data} query={query ?? ""} status={status} />

        {data.isEmpty ? <EmptyQueueState /> : null}

        <div className="mt-6 space-y-5">
          {data.groups.map((group) =>
            group.items.length > 0 ? (
              <QueueGroupPanel data={data} group={group} key={group.id} />
            ) : null,
          )}
        </div>

        {!data.isEmpty && data.total === 0 ? <FilteredEmptyState /> : null}

        <footer className="flex items-center justify-center gap-2 py-7 text-sm text-slate-500">
          Showing {data.total} of {data.counts.all}
          <span>·</span>
          {data.updatedLabel}
          <span className="size-1.5 rounded-full bg-emerald-400" />
        </footer>
      </div>
    </main>
  );
}

function QueueToolbar({
  data,
  query,
  status,
}: {
  data: QueueScreenData;
  query: string;
  status: string;
}) {
  const tabs = [
    { count: data.counts.all, href: "/dashboard/queue", label: "All" },
    {
      count: data.counts.inProgress,
      href: "/dashboard/queue?status=in_progress",
      label: "In progress",
    },
    {
      count: data.counts.needsReview,
      href: "/dashboard/queue?status=preview_ready",
      label: "Needs review",
    },
    {
      count: data.counts.complete,
      href: "/dashboard/queue?status=complete",
      label: "Complete",
    },
  ];

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap gap-1 rounded-lg bg-white/[0.03] p-1">
        {tabs.map((tab, index) => (
          <Link
            className={
              index === 0 && status === "all"
                ? "flex h-10 items-center gap-3 rounded-md border border-violet-300/25 bg-violet-500/20 px-4 text-sm font-semibold text-violet-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "flex h-10 items-center gap-3 rounded-md px-4 text-sm font-medium text-slate-300 hover:bg-white/[0.04] hover:text-white"
            }
            href={tab.href}
            key={tab.label}
          >
            {tab.label}
            <span className="rounded-md bg-slate-950/60 px-2 py-0.5 font-mono text-xs text-slate-300">
              {tab.count}
            </span>
          </Link>
        ))}
      </div>

      <form className="grid gap-2 md:grid-cols-[minmax(240px,1fr)_170px_150px_48px] xl:min-w-[620px]">
        <label className="flex h-10 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <Search className="size-4 text-slate-500" />
          <input
            className="min-w-0 flex-1 bg-transparent text-slate-200 outline-none placeholder:text-slate-500"
            defaultValue={query}
            name="q"
            placeholder="Search generations..."
          />
        </label>
        <label className="relative">
          <select
            className="h-10 w-full appearance-none rounded-lg border border-white/10 bg-[#101729] px-4 pr-9 text-sm font-medium text-white outline-none"
            defaultValue={status}
            name="status"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-3 right-3 size-4 text-slate-400" />
        </label>
        <button
          className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-white"
          type="button"
        >
          <CalendarDays className="size-4 text-slate-400" />
          Last 7 days
          <ChevronDown className="size-4 text-slate-400" />
        </button>
        <Button
          aria-label="Change queue view"
          className="h-10"
          size="icon"
          type="submit"
          variant="outline"
        >
          <Grid2X2 className="size-4" />
        </Button>
      </form>
    </div>
  );
}

function QueueGroupPanel({
  data,
  group,
}: {
  data: QueueScreenData;
  group: QueueGroup;
}) {
  return (
    <section className="bussin-panel rounded-lg p-5">
      <div className="mb-4 flex items-start gap-3">
        <span
          className={
            group.iconTone === "amber"
              ? "grid size-8 place-items-center rounded-full bg-amber-500/14 text-amber-300"
              : group.iconTone === "emerald"
                ? "grid size-8 place-items-center rounded-full bg-emerald-500/14 text-emerald-300"
                : "grid size-8 place-items-center rounded-full bg-blue-500/14 text-blue-300"
          }
        >
          <Loader2
            className={
              group.id === "in_progress" ? "size-4 animate-spin" : "size-4"
            }
          />
        </span>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-white">
              {group.title}
            </h2>
            <span className="rounded-md bg-slate-900/80 px-2 py-1 font-mono text-xs text-slate-400">
              {group.items.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">{group.description}</p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          {group.items.map((item) => (
            <TrackQueueRow item={item} key={item.id} />
          ))}
        </div>
        {group.id === "in_progress" ? (
          <WaitingUploadsCard waiting={!data.hasUploadsWaiting} />
        ) : null}
        {group.id === "complete" ? (
          <RenderFailedCard
            item={group.items.find((item) => item.status === "failed")}
            visible={data.hasFailedRender}
          />
        ) : null}
      </div>
    </section>
  );
}

function TrackQueueRow({ item }: { item: QueueTrackItem }) {
  return (
    <article className="grid gap-4 rounded-lg border border-white/10 bg-[#0d1426]/78 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:grid-cols-[92px_minmax(180px,1fr)_260px_150px_32px] md:items-center">
      <div className={`queue-art queue-art-${item.artTone}`} />
      <div className="min-w-0">
        <h3 className="truncate font-semibold text-white">{item.title}</h3>
        <p className="mt-1 text-sm text-slate-400">{item.meta}</p>
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <Clock3 className="size-4" />
          {item.createdLabel}
        </p>
      </div>
      <div>
        <QueueStatusChip label={item.statusLabel} status={item.status} />
        <div className="mt-3">
          <QueueProgress progress={item.progress} status={item.status} />
        </div>
        {item.failureReason ? (
          <p className="mt-2 max-w-xs text-xs leading-5 text-red-300/80">
            {item.failureReason}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Button
          asChild
          className="h-9 justify-start px-3 text-slate-200"
          variant="outline"
        >
          <Link href={`/dashboard/queue?request=${item.requestId}`}>
            Open details
            <ExternalLink className="ml-auto size-4 text-slate-400" />
          </Link>
        </Button>
        {item.status === "failed" ? (
          <QueueActionButton item={item} kind="retry" />
        ) : item.status === "preview_ready" ? (
          <Button
            asChild
            className="h-9 justify-start px-3 text-amber-300"
            variant="ghost"
          >
            <Link href={`/dashboard/tracks/${item.id}`}>
              Review
              <span className="ml-auto size-1.5 rounded-full bg-amber-400" />
            </Link>
          </Button>
        ) : ["queued", "generating", "polling"].includes(item.status) ? (
          <QueueActionButton id={item.requestId} kind="cancel" />
        ) : null}
      </div>
      <Button
        aria-label={`More actions for ${item.title}`}
        className="text-slate-400"
        size="icon"
        type="button"
        variant="ghost"
      >
        <MoreVertical className="size-5" />
      </Button>
    </article>
  );
}

function WaitingUploadsCard({ waiting }: { waiting: boolean }) {
  return (
    <aside className="grid min-h-52 place-items-center rounded-lg border border-dashed border-blue-400/30 bg-blue-500/[0.03] p-6 text-center">
      <div>
        <Upload className="mx-auto size-16 text-blue-400" />
        <p className="mt-5 font-semibold text-white">
          {waiting ? "No uploads waiting" : "Uploads waiting"}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          {waiting
            ? "You're all caught up."
            : "Publishing jobs are standing by."}
        </p>
      </div>
    </aside>
  );
}

function RenderFailedCard({
  item,
  visible,
}: {
  item: QueueTrackItem | undefined;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <aside className="grid min-h-52 place-items-center rounded-lg border border-dashed border-red-400/30 bg-red-500/[0.04] p-6 text-center">
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-2xl border border-red-300/30 bg-red-500/15 text-red-300 shadow-[0_0_44px_rgba(248,113,113,0.24)]">
          <XCircle className="size-9" />
        </span>
        <p className="mt-5 font-semibold text-white">Render failed</p>
        <p className="mt-2 text-sm text-slate-400">
          Something went wrong while rendering your track.
        </p>
        <div className="mt-5 flex justify-center">
          {item ? (
            <QueueActionButton item={item} kind="retry" />
          ) : (
            <Button type="button">Retry</Button>
          )}
        </div>
      </div>
    </aside>
  );
}

function EmptyQueueState() {
  return (
    <section
      className="bussin-panel mt-6 rounded-lg p-10 text-center"
      data-testid="empty-state"
    >
      <div className="dashboard-eq mx-auto h-24 w-40" />
      <h2 className="mt-5 text-xl font-semibold text-white">
        No generations in queue
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
        Create your first generation and Bussin will show queued, processing,
        review, upload, and failure states here.
      </p>
      <Button asChild className="mt-6" data-testid="primary-action">
        <Link href="/dashboard/generate">Create generation</Link>
      </Button>
    </section>
  );
}

function FilteredEmptyState() {
  return (
    <section
      className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] p-8 text-center"
      data-testid="empty-state"
    >
      <h2 className="text-lg font-semibold text-white">No matching jobs</h2>
      <p className="mt-2 text-sm text-slate-400">
        Adjust your search or status filter to see more generations.
      </p>
    </section>
  );
}

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
