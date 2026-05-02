import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  EllipsisVertical,
  Music2,
  Rocket,
  SquarePlay,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardTopBar } from "@/components/common/dashboard-top-bar";
import { Button } from "@/components/ui/button";
import { isMockMode, mockUser } from "@/lib/app-config";
import { createClient } from "@/lib/supabase/server";
import { getDashboardHomeData } from "@/modules/dashboard/dashboard.queries";
import type {
  DashboardAction,
  DashboardActivity,
  DashboardQueueItem,
  DashboardTopTrack,
} from "@/modules/dashboard/dashboard.types";
import { DashboardKpiCard } from "@/modules/dashboard/kpi-card";
import { UploadPerformanceCard } from "@/modules/dashboard/upload-performance-card";

const throughputPoints = [
  36, 44, 38, 56, 112, 72, 84, 146, 82, 68, 64, 96, 134,
];

export default async function DashboardPage() {
  const user = isMockMode
    ? { id: mockUser.id }
    : (await (await createClient()).auth.getUser()).data.user;

  if (!user) {
    redirect("/login");
  }

  const dashboard = await getDashboardHomeData(user.id);

  if (!dashboard) {
    redirect("/onboarding");
  }

  return (
    <main
      className="min-h-[100dvh] bg-[#07101f] text-foreground"
      data-testid="screen-dashboard"
    >
      <DashboardTopBar />
      <div className="dashboard-grid mx-auto grid max-w-[1536px] gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_365px] lg:px-9">
        <section className="min-w-0 space-y-4">
          <Header name={dashboard.userDisplayName} />
          {dashboard.isEmpty ? <EmptyDashboardState /> : null}
          {dashboard.hasFailures ? <FailureState /> : null}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {dashboard.kpis.map((kpi) => (
              <DashboardKpiCard key={kpi.label} kpi={kpi} />
            ))}
          </section>
          <UploadPerformanceCard data={dashboard} />
          <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.28fr)]">
            <GenerationThroughput total={dashboard.generatedTotal} />
            <TopTracks tracks={dashboard.topTracks} />
          </section>
          <QueueOverview queue={dashboard.queue} />
        </section>
        <aside className="space-y-3 lg:pt-[178px]">
          <QuickActions actions={dashboard.quickActions} />
          <RecentActivity activity={dashboard.activity} />
          <QueueEmptyCard isEmpty={dashboard.queue.length === 0} />
        </aside>
      </div>
    </main>
  );
}

function Header({ name }: { name: string }) {
  return (
    <header className="pt-2">
      <h1 className="border-l border-white/20 pl-3 text-2xl font-semibold tracking-tight text-white">
        Good evening, {name}
      </h1>
      <p className="mt-1 pl-3 text-sm text-slate-400">
        Here&apos;s what&apos;s happening with your music today.
      </p>
    </header>
  );
}

function EmptyDashboardState() {
  return (
    <section
      className="bussin-panel rounded-lg px-5 py-4"
      data-testid="empty-state"
    >
      <p className="font-semibold text-white">No tracks in queue</p>
      <p className="mt-1 text-sm text-slate-400">
        Start a new generation or schedule your first upload to populate the
        cockpit.
      </p>
    </section>
  );
}

function FailureState() {
  return (
    <section
      className="rounded-lg border border-red-400/20 bg-red-500/10 px-5 py-3 text-sm text-red-100"
      data-testid="error-state"
    >
      Some jobs need attention. Open the queue to review failed renders and
      uploads.
    </section>
  );
}

function GenerationThroughput({ total }: { total: number }) {
  return (
    <section className="bussin-panel rounded-lg p-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">
          Generation throughput
        </h2>
        <button className="flex h-8 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-xs text-slate-300">
          This month
          <ChevronDown className="size-3.5" />
        </button>
      </div>
      <div className="mt-3 flex items-end gap-3">
        <p className="text-4xl font-semibold tracking-tight text-white">
          {total}
        </p>
        <p className="pb-2 text-sm text-slate-400">Total generated</p>
      </div>
      <p className="mt-2 text-sm">
        <span className="text-emerald-300">↑ 24.5%</span>{" "}
        <span className="text-slate-500">vs last month</span>
      </p>
      <div className="relative mt-4 h-36 overflow-hidden rounded-lg">
        <div className="absolute inset-0 grid grid-rows-3 text-xs text-slate-500">
          {[150, 100, 50].map((value) => (
            <div className="border-b border-white/[0.05]" key={value}>
              {value}
            </div>
          ))}
        </div>
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 520 150">
          <defs>
            <linearGradient id="throughputGlow" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={toAreaPath(throughputPoints)}
            fill="url(#throughputGlow)"
            opacity="0.75"
          />
          <path
            d={toLinePath(throughputPoints)}
            fill="none"
            stroke="#a855f7"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          {throughputPoints.map((value, index) => (
            <circle
              cx={(index / (throughputPoints.length - 1)) * 500 + 10}
              cy={145 - value * 0.86}
              fill="#fff"
              key={`${value}-${index}`}
              r={index === 4 || index === 7 ? 5 : 2}
            />
          ))}
        </svg>
        <div className="absolute inset-x-8 bottom-0 flex justify-between text-xs text-slate-400">
          {["Apr 13", "Apr 20", "Apr 27", "May 4", "May 11"].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function TopTracks({ tracks }: { tracks: DashboardTopTrack[] }) {
  return (
    <section className="bussin-panel rounded-lg p-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">
          Top performing tracks
        </h2>
        <button className="flex h-8 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-xs text-slate-300">
          This week
          <ChevronDown className="size-3.5" />
        </button>
      </div>
      <div className="mt-5 space-y-4">
        {tracks.map((track, index) => (
          <div
            className="grid grid-cols-[32px_minmax(120px,1fr)_42px_minmax(120px,1fr)_54px] items-center gap-3 text-sm"
            key={track.title}
          >
            <span className={`album-art album-art-${index}`} />
            <span className="font-medium text-white">{track.title}</span>
            <span className="font-mono text-xs text-slate-400">
              {track.duration}
            </span>
            <span className="h-2 overflow-hidden rounded-full bg-slate-800/80">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-500"
                style={{ width: `${track.progress}%` }}
              />
            </span>
            <span className="text-right font-mono text-xs text-slate-300">
              {track.plays}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function QueueOverview({ queue }: { queue: DashboardQueueItem[] }) {
  const tabs = [
    { label: "All", value: queue.length },
    {
      label: "Generating",
      value: queue.filter((item) => item.status === "Generating").length,
    },
    {
      label: "Processing",
      value: queue.filter((item) => item.status === "Processing").length,
    },
    {
      label: "Scheduled",
      value: queue.filter((item) => item.status === "Scheduled").length,
    },
    {
      label: "Failed",
      value: queue.filter((item) => item.status === "Failed").length,
    },
  ];

  return (
    <section className="bussin-panel rounded-lg p-4">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Queue overview</h2>
          <p className="text-sm text-slate-400">
            See what&apos;s in progress or waiting to be published.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {tabs.map((tab, index) => (
            <button
              className={
                index === 0
                  ? "border-b border-violet-400 px-2 pb-2 text-violet-300"
                  : "px-2 pb-2 text-slate-400"
              }
              key={tab.label}
            >
              {tab.label} ({tab.value})
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="mt-3 w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs text-slate-400">
            <tr>
              <th className="py-2 font-medium">Track</th>
              <th className="py-2 font-medium">Status</th>
              <th className="py-2 font-medium">Progress</th>
              <th className="py-2 font-medium">Scheduled</th>
              <th className="py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {queue.map((item, index) => (
              <tr key={`${item.title}-${index}`}>
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <span className={`album-art album-art-${index + 1}`} />
                    <div>
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="font-mono text-xs text-slate-400">
                        {index === 0 ? "4:11" : index === 1 ? "3:47" : "4:05"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3">
                  <span className={`status-pill status-pill-${item.tone}`}>
                    {item.status}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 font-mono text-xs text-slate-300">
                      {item.progress ? `${item.progress}%` : "-"}
                    </span>
                    {item.progress ? (
                      <span className="h-1.5 w-36 overflow-hidden rounded-full bg-slate-800">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-500"
                          style={{ width: `${item.progress}%` }}
                        />
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="py-3 text-xs text-slate-400">
                  {item.scheduledLabel}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <button className="h-8 rounded-md border border-white/10 bg-white/[0.04] px-4 text-xs text-slate-300">
                      {item.actionLabel}
                    </button>
                    {item.status === "Scheduled" ? (
                      <button
                        aria-label="More actions"
                        className="text-slate-400"
                      >
                        <EllipsisVertical className="size-4" />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function QuickActions({ actions }: { actions: DashboardAction[] }) {
  return (
    <section className="bussin-panel rounded-lg p-4">
      <h2 className="text-lg font-semibold text-white">Quick actions</h2>
      <p className="mt-1 text-sm text-slate-400">
        Everything you need to create and share.
      </p>
      <div className="mt-5 space-y-3">
        {actions.map((action) => (
          <Link
            className="group grid min-h-[76px] grid-cols-[56px_1fr_20px] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-2.5 transition hover:border-violet-300/40"
            data-testid={
              action.icon === "rocket" ? "primary-action" : undefined
            }
            href={action.href}
            key={action.label}
          >
            <ActionIcon icon={action.icon} />
            <span>
              <span className="block font-semibold text-white">
                {action.label}
              </span>
              <span className="mt-1 block text-sm leading-snug text-slate-400">
                {action.description}
              </span>
            </span>
            <ChevronRight className="size-5 text-slate-300 transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function ActionIcon({ icon }: { icon: DashboardAction["icon"] }) {
  const className =
    icon === "youtube"
      ? "from-red-500 to-rose-700"
      : icon === "upload"
        ? "from-blue-500 to-cyan-700"
        : "from-violet-500 to-purple-800";
  const Icon =
    icon === "youtube" ? SquarePlay : icon === "upload" ? Upload : Rocket;

  return (
    <span
      className={`grid size-14 place-items-center rounded-lg bg-gradient-to-br ${className} text-white shadow-[0_15px_35px_rgba(99,102,241,0.22)]`}
    >
      <Icon className="size-6" />
    </span>
  );
}

function RecentActivity({ activity }: { activity: DashboardActivity[] }) {
  return (
    <section className="bussin-panel rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Recent activity</h2>
        <Link
          className="text-sm font-medium text-violet-300"
          href="/dashboard/queue"
        >
          View all
        </Link>
      </div>
      <div className="mt-4 space-y-4">
        {activity.map((item) => (
          <div
            className="grid grid-cols-[22px_1fr_auto] items-start gap-3 text-sm"
            key={`${item.label}-${item.time}`}
          >
            <ActivityIcon icon={item.icon} />
            <p className="leading-snug text-slate-200">{item.label}</p>
            <span className="whitespace-nowrap text-xs text-slate-400">
              {item.time}
            </span>
          </div>
        ))}
      </div>
      <Link
        className="mt-5 flex h-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-sm font-medium text-violet-300"
        href="/dashboard/queue"
      >
        View all activity
      </Link>
    </section>
  );
}

function ActivityIcon({ icon }: { icon: DashboardActivity["icon"] }) {
  const Icon =
    icon === "youtube"
      ? SquarePlay
      : icon === "calendar"
        ? CalendarDays
        : icon === "warning"
          ? Clock3
          : Music2;
  const className =
    icon === "youtube"
      ? "bg-red-500"
      : icon === "calendar"
        ? "bg-violet-500"
        : icon === "warning"
          ? "bg-amber-400"
          : "bg-purple-500";

  return (
    <span
      className={`grid size-5 place-items-center rounded-full ${className} text-white`}
    >
      <Icon className="size-3" />
    </span>
  );
}

function QueueEmptyCard({ isEmpty }: { isEmpty: boolean }) {
  return (
    <section className="bussin-panel grid min-h-[248px] place-items-center rounded-lg p-5 text-center">
      <div>
        <div className="dashboard-eq mx-auto mb-5 h-24 w-36" />
        <p className="text-lg font-semibold text-white">
          {isEmpty ? "No tracks in queue" : "Queue status synced"}
        </p>
        <p className="mx-auto mt-2 max-w-64 text-sm leading-relaxed text-slate-400">
          {isEmpty
            ? "You're all caught up! Start a new generation or schedule a track to see it here."
            : "Active generation, processing, and scheduled work is visible below."}
        </p>
        <Button
          asChild
          className="mt-5 w-full max-w-52"
          data-testid="loading-state"
        >
          <Link href="/dashboard/generate">
            <Rocket className="size-4" />
            New generation
          </Link>
        </Button>
      </div>
    </section>
  );
}

function toLinePath(points: number[]) {
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 500 + 10;
      const y = 145 - point * 0.86;

      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function toAreaPath(points: number[]) {
  return `${toLinePath(points)} L 510 150 L 10 150 Z`;
}
