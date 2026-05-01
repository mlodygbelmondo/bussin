import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import {
  Bell,
  ChevronDown,
  CircleCheck,
  Info,
  Megaphone,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_NAME, isMockMode, mockUser } from "@/lib/app-config";
import { createClient } from "@/lib/supabase/server";
import { TrackPreviewActions } from "@/modules/tracks/track-preview-actions";
import {
  CoverImage,
  MetadataPreview,
  TrackAudioPlayer,
} from "@/modules/tracks/track-preview-components";
import { getTrackPreviewData } from "@/modules/tracks/track-preview.queries";
import type { TrackPreviewData } from "@/modules/tracks/track-preview.types";

type TrackPreviewPageProps = {
  params: Promise<{ trackId: string }>;
};

const statusLabels: Record<TrackPreviewData["status"], string> = {
  approved: "Approved",
  audio_loading: "Audio loading",
  failed: "Failed",
  preview_ready: "Generated",
  rejected: "Rejected",
  rendered: "Rendered",
  rendering: "Rendering",
  uploaded: "Uploaded",
  uploading: "Uploading",
};

export default async function TrackPreviewPage({
  params,
}: TrackPreviewPageProps) {
  const { trackId } = await params;
  const user = isMockMode
    ? { id: mockUser.id }
    : (await (await createClient()).auth.getUser()).data.user;

  if (!user) {
    redirect("/login");
  }

  const data = await getTrackPreviewData(user.id, trackId);

  if (!data) {
    notFound();
  }

  const canApprove = ["preview_ready", "audio_loading"].includes(data.status);
  const canPublish = !["rejected", "failed", "uploaded", "uploading"].includes(
    data.status,
  );

  return (
    <main
      className="min-h-[100dvh] bg-[#07101f] text-foreground"
      data-testid={`screen-dashboard-tracks-${trackId}`}
    >
      <TopBar />
      <div className="mx-auto max-w-[1536px] px-4 py-6 lg:px-8">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Link
              className="mb-8 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
              href="/dashboard/queue"
            >
              <ChevronDown className="size-4 rotate-90" />
              Back to Generation Queue
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Track Preview &amp; Approval
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Review your generated track, adjust details, and approve for
              publishing.
            </p>
          </div>
          <TrackPreviewActions
            canApprove={canApprove}
            canPublish={canPublish}
            trackId={trackId}
          />
        </header>

        <section className="bussin-panel track-hero-panel mt-6 rounded-lg p-3 md:p-5">
          <div className="grid gap-5 xl:grid-cols-[170px_minmax(0,1fr)]">
            <CoverImage
              alt={`${data.title} cover artwork`}
              className="aspect-square w-full rounded-lg object-cover xl:w-[170px]"
              src={data.coverUrl}
            />
            <div className="relative min-w-0 overflow-hidden rounded-lg">
              <div className="absolute inset-0 opacity-90">
                <WaveformBars />
              </div>
              <div className="relative z-10 flex min-h-[170px] flex-col justify-center bg-gradient-to-r from-[#0b1326] via-[#101538]/78 to-[#091123]/70 px-5">
                <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                  <Badge>
                    <CircleCheck className="size-3" />
                    {statusLabels[data.status]}
                  </Badge>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">
                    {data.style ?? "Synthwave"}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">
                    {formatBpmKey(data.mood)}
                  </span>
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-white">
                  {data.title}
                </h2>
                <p className="mt-3 text-sm text-slate-400">
                  Generated {relativeTime(data.createdAt)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <MetaPill>{formatDuration(data.durationSeconds)}</MetaPill>
                  <MetaPill>{data.mood ?? "120 BPM"}</MetaPill>
                  <MetaPill>{data.style ?? "Synthwave"}</MetaPill>
                  <MetaPill>HQ</MetaPill>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <TrackAudioPlayer
              audioUrl={data.audioUrl}
              durationSeconds={data.durationSeconds}
              title={data.title}
            />
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="bussin-panel rounded-lg p-4 md:p-5">
            <div className="mb-5 flex gap-8 border-b border-white/10 text-sm">
              {[
                "Metadata",
                "Video / Cover",
                "Distribution",
                "Review Checklist",
              ].map((tab, index) => (
                <button
                  className={
                    index === 0
                      ? "border-b-2 border-violet-400 pb-3 font-semibold text-violet-100"
                      : "pb-3 text-slate-400"
                  }
                  key={tab}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>
            <MetadataPreview data={data} />
          </section>

          <aside className="space-y-4">
            <DetailsCard data={data} />
            <BriefCard data={data} />
            <NotesCard />
          </aside>
        </div>

        <footer className="flex items-center justify-between py-7 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2 text-emerald-300/80">
            <CircleCheck className="size-4" />
            Last autosaved 10s ago
          </span>
          <span>You can approve, publish now, or schedule for later.</span>
        </footer>
      </div>
    </main>
  );
}

function TopBar() {
  return (
    <header className="flex h-[73px] items-center justify-end gap-4 border-b border-white/10 bg-[#0b1022]/80 px-4 backdrop-blur lg:px-8">
      <Link
        className="hidden h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white md:flex"
        href="/dashboard/channels"
      >
        <Megaphone className="size-4 text-slate-300" />
        What&apos;s new
        <span className="size-1.5 rounded-full bg-violet-400" />
      </Link>
      <label className="hidden h-9 w-full max-w-[335px] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-500 md:flex">
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

function DetailsCard({ data }: { data: TrackPreviewData }) {
  return (
    <section className="bussin-panel rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-white">
          <Sparkles className="size-5 text-violet-300" />
          Generation Details
        </h2>
        <ChevronDown className="size-4 rotate-180 text-slate-400" />
      </div>
      <div className="space-y-4 text-sm">
        <DetailRow label="Model" value={`${APP_NAME} v2.1`} />
        <DetailRow
          label="Prompt"
          value={
            data.generation?.finalPrompt ??
            `${data.style ?? "Instrumental"}, ${data.mood ?? "focused mood"}, cinematic pacing`
          }
        />
        <DetailRow
          label="Duration"
          value={formatDuration(data.durationSeconds)}
        />
        <DetailRow
          label="BPM / Key"
          value={`${data.mood ?? "120 BPM"} · ${data.style ?? "Track"}`}
        />
        <DetailRow label="Quality" value="High" />
        <DetailRow label="Generated" value={formatDateTime(data.createdAt)} />
        <DetailRow label="Generation ID" value={data.generation?.id ?? "n/a"} />
        {data.failureReason ? (
          <p className="rounded-md border border-red-400/20 bg-red-500/10 p-3 text-red-200">
            {data.failureReason}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function BriefCard({ data }: { data: TrackPreviewData }) {
  return (
    <section className="bussin-panel rounded-lg p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-white">
          <ShieldCheck className="size-5 text-cyan-300" />
          Source Brief (Optional)
        </h2>
        <ChevronDown className="size-4 rotate-180 text-slate-400" />
      </div>
      <div className="rounded-lg border border-white/10 bg-[#101729] p-4 text-sm leading-6 text-slate-300">
        {data.generation?.finalPrompt ??
          `A ${data.style ?? "polished instrumental"} track with ${data.mood ?? "late-night"} energy and a clean release package.`}
      </div>
      <Button
        className="mt-3 w-full text-violet-200"
        type="button"
        variant="outline"
      >
        Edit Brief
      </Button>
    </section>
  );
}

function NotesCard() {
  return (
    <section className="bussin-panel rounded-lg p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-white">Notes (Optional)</h2>
        <Info className="size-4 text-slate-400" />
      </div>
      <textarea
        className="min-h-28 w-full resize-none rounded-lg border border-white/10 bg-[#101729] p-4 text-sm text-slate-200 outline-none placeholder:text-slate-500"
        maxLength={250}
        placeholder="Add notes for your team..."
      />
      <p className="mt-2 text-right text-xs text-slate-500">0 / 250</p>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 text-right text-slate-300">{value}</span>
    </div>
  );
}

function MetaPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border border-white/10 bg-slate-950/50 px-3 py-1 text-xs text-slate-300">
      {children}
    </span>
  );
}

function WaveformBars() {
  return (
    <div className="track-waveform h-full w-full">
      {Array.from({ length: 96 }).map((_, index) => (
        <span key={index} style={{ "--bar-index": index } as CSSProperties} />
      ))}
    </div>
  );
}

function formatDuration(value: number) {
  const seconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function relativeTime(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(delta / 60_000));

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);

  return `${hours}h ago`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBpmKey(value: string | null) {
  return value?.includes("BPM") ? value : "120 BPM · Dm";
}
