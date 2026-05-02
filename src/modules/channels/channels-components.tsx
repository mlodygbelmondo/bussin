import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CirclePlus,
  ExternalLink,
  Info,
  Music2,
  ShieldCheck,
  Star,
  Unplug,
  CirclePlay,
  Zap,
} from "lucide-react";
import { DashboardTopBar } from "@/components/common/dashboard-top-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChannelsActionButton } from "@/modules/channels/channels-action-button";
import { startChannelsYoutubeOAuthAction } from "@/modules/channels/channels.actions";
import type {
  ChannelCardItem,
  ChannelsScreenData,
  ChannelsStatusTone,
  SunoConnectionStatus,
} from "@/modules/channels/channels.types";

export function ChannelsTopBar() {
  return <DashboardTopBar />;
}

export function ChannelsHero({ data }: { data: ChannelsScreenData }) {
  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <div className="bussin-panel relative min-h-[292px] overflow-hidden rounded-lg p-8">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 overflow-hidden lg:block">
          <div className="absolute top-10 right-12 size-40 rotate-[-9deg] rounded-[2rem] border border-violet-200/20 bg-gradient-to-br from-violet-500/40 via-slate-900 to-blue-500/30 shadow-[0_28px_90px_rgba(88,28,255,0.45)]" />
          <div className="absolute top-24 right-28 grid size-20 rotate-[-9deg] place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-600 shadow-[0_18px_46px_rgba(244,63,94,0.35)]">
            <CirclePlay className="size-10 fill-white text-white" />
          </div>
          <div className="absolute right-5 bottom-8 h-24 w-72 rounded-[50%] border border-violet-300/30 bg-violet-500/10 blur-sm" />
          <div className="absolute top-20 right-0 h-1 w-64 -rotate-12 bg-gradient-to-r from-transparent via-violet-400 to-transparent blur-[1px]" />
          <div className="absolute top-32 right-20 h-1 w-72 -rotate-12 bg-gradient-to-r from-transparent via-blue-400 to-transparent blur-[1px]" />
        </div>
        <div className="relative max-w-[680px]">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            All your channels. One place.
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">
            Connect and manage your platforms to publish, schedule, and grow
            your audience.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<CirclePlay className="size-4 fill-white text-white" />}
              label="Connected channels"
              sublabel={`of ${data.plan.limit} allowed`}
              tone="red"
              value={data.counts.connected}
            />
            <MetricCard
              icon={<CheckCircle2 className="size-4" />}
              label="Healthy connections"
              sublabel="100% healthy"
              tone="emerald"
              value={data.counts.healthy}
            />
            <MetricCard
              icon={<AlertTriangle className="size-4" />}
              label="Sync issues"
              sublabel={data.counts.issues ? "Needs review" : "All systems go"}
              tone="amber"
              value={data.counts.issues}
            />
            <MetricCard
              icon={<Star className="size-4 fill-violet-300" />}
              label="Default destination"
              sublabel="YouTube"
              tone="violet"
              value={data.defaultChannel?.title ?? "None"}
            />
          </div>
        </div>
      </div>
      <SunoStatusCard suno={data.suno} />
    </section>
  );
}

export function ChannelsGrid({
  channels,
  planLimitReached,
}: {
  channels: ChannelCardItem[];
  planLimitReached: boolean;
}) {
  if (channels.length === 0) {
    return <EmptyChannelsState planLimitReached={planLimitReached} />;
  }

  return (
    <div className="mt-5 grid min-w-0 gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))]">
      {channels.map((channel, index) => (
        <ChannelCard channel={channel} index={index} key={channel.id} />
      ))}
      {planLimitReached ? null : <InlineConnectCard />}
    </div>
  );
}

export function ChannelLimitFooter({ data }: { data: ChannelsScreenData }) {
  return (
    <footer className="flex flex-wrap items-center justify-center gap-2 py-7 text-sm text-slate-500">
      <Info className="size-4" />
      Channel limits depend on your plan. Upgrade to connect more channels.
      <Link className="font-medium text-violet-300" href="/dashboard/billing">
        View plan details
      </Link>
      {data.hasPlanLimitReached ? (
        <Badge className="ml-1" variant="secondary">
          Limit reached
        </Badge>
      ) : null}
    </footer>
  );
}

export function ChannelCard({
  channel,
  index = 0,
}: {
  channel: ChannelCardItem;
  index?: number;
}) {
  const isHealthy = channel.status === "connected";

  return (
    <article
      className="bussin-panel min-w-0 overflow-hidden rounded-lg"
      data-testid="channel-card"
    >
      <div className={cn("relative h-[106px]", coverClass(index))}>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1324] via-transparent to-black/10" />
        <span className="absolute top-4 left-4 grid size-7 place-items-center rounded-md bg-red-600 text-white shadow-lg">
          <CirclePlay className="size-4 fill-white text-white" />
        </span>
        <StatusPill
          className="absolute top-4 right-4"
          label={channel.statusLabel}
          tone={channel.statusTone}
        />
      </div>
      <div className="relative px-5 pt-6 pb-4">
        <ChannelAvatar channel={channel} index={index} />
        <div className="ml-[92px] min-h-16 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 text-base font-semibold break-words text-white">
              {channel.title}
            </h3>
            {channel.isDefault ? <Badge>Default</Badge> : null}
          </div>
          <p className="mt-2 break-words text-xs text-slate-500">
            {channel.handle ?? channel.youtubeChannelId} ·{" "}
            {channel.subscribersLabel}
          </p>
        </div>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-400">Last sync</dt>
            <dd className="flex items-center gap-2 text-slate-300">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  isHealthy ? "bg-emerald-400" : "bg-amber-400",
                )}
              />
              {channel.lastSyncLabel}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-400">Connected account</dt>
            <dd className="max-w-[220px] truncate text-slate-300">
              {channel.connectedAccount}
            </dd>
          </div>
        </dl>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {channel.isDefault ? (
            <Button
              className="h-9 w-full justify-center px-3 text-violet-200"
              disabled
              type="button"
              variant="outline"
            >
              <Star className="size-4 fill-violet-300" />
              Default destination
            </Button>
          ) : channel.status === "connected" ? (
            <ChannelsActionButton
              channelId={channel.id}
              kind="set-default"
              label="Set as default"
            />
          ) : (
            <form action={startChannelsYoutubeOAuthAction} className="w-full">
              <Button
                className="h-9 w-full px-3"
                type="submit"
                variant="outline"
              >
                <Unplug className="size-4" />
                Reconnect
              </Button>
            </form>
          )}
          <ChannelsActionButton
            connectionId={channel.youtubeConnectionId}
            disabled={!channel.youtubeConnectionId}
            kind="disconnect"
            label={channel.status === "connected" ? "Disconnect" : "Remove"}
          />
          <ChannelsActionButton
            connectionId={channel.youtubeConnectionId}
            disabled={!channel.youtubeConnectionId}
            kind="sync"
            label="Sync"
          />
        </div>
      </div>
    </article>
  );
}

export function SunoStatusCard({ suno }: { suno: SunoConnectionStatus }) {
  return (
    <aside className="bussin-panel rounded-lg p-5" data-testid="suno-card">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold text-white">Suno connection</h2>
        <StatusPill label={suno.statusLabel} tone={suno.statusTone} />
      </div>
      <div className="mt-5 flex gap-4">
        <div className="grid size-16 place-items-center rounded-lg border border-violet-300/25 bg-violet-600/18 text-violet-200">
          <Music2 className="size-8" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-white">{suno.label}</p>
          <p className="mt-1 truncate text-sm text-slate-400">
            {suno.emailLabel}
          </p>
          <p className="mt-1 text-sm text-slate-500">{suno.checkedLabel}</p>
        </div>
      </div>
      <div className="mt-5 border-t border-white/10 pt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Plan</span>
          <Button asChild size="sm">
            <Link href="/dashboard/billing">Upgrade</Link>
          </Button>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-slate-400">Monthly generations</span>
          <span className="font-mono text-white">{suno.creditsLabel}</span>
        </div>
        <ChannelsActionButton kind="test-suno" label="Test Suno connection" />
        <Button asChild className="mt-3 w-full" type="button" variant="outline">
          <Link href="/onboarding">
            Manage in Connections
            <ExternalLink className="size-4" />
          </Link>
        </Button>
      </div>
    </aside>
  );
}

function MetricCard({
  icon,
  label,
  sublabel,
  tone,
  value,
}: {
  icon: ReactNode;
  label: string;
  sublabel: string;
  tone: "amber" | "emerald" | "red" | "violet";
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#10182a]/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-7 place-items-center rounded-md",
            tone === "red" && "bg-red-500/20 text-red-200",
            tone === "emerald" && "bg-emerald-500/15 text-emerald-300",
            tone === "amber" && "bg-amber-500/15 text-amber-300",
            tone === "violet" && "bg-violet-500/20 text-violet-200",
          )}
        >
          {icon}
        </span>
        <span className="text-xs font-medium text-slate-300">{label}</span>
      </div>
      <p className="mt-3 truncate text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{sublabel}</p>
    </div>
  );
}

function StatusPill({
  className,
  label,
  tone,
}: {
  className?: string;
  label: string;
  tone: ChannelsStatusTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-2 rounded-md border px-3 text-xs font-semibold",
        tone === "emerald" &&
          "border-emerald-300/20 bg-emerald-500/10 text-emerald-300",
        tone === "amber" &&
          "border-amber-300/20 bg-amber-500/10 text-amber-300",
        tone === "red" && "border-red-300/20 bg-red-500/10 text-red-300",
        tone === "slate" &&
          "border-slate-300/15 bg-slate-500/10 text-slate-300",
        className,
      )}
    >
      <ShieldCheck className="size-3.5" />
      {label}
    </span>
  );
}

function ChannelAvatar({
  channel,
  index,
}: {
  channel: ChannelCardItem;
  index: number;
}) {
  return (
    <div className="absolute -top-9 left-5 grid size-20 place-items-center overflow-hidden rounded-full border-2 border-white/80 bg-slate-950 shadow-[0_14px_36px_rgba(0,0,0,0.35)]">
      {channel.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={`${channel.title} avatar`}
          className="size-full object-cover"
          src={channel.thumbnailUrl}
        />
      ) : (
        <span
          className={cn(
            "grid size-full place-items-center text-lg font-semibold text-white",
            avatarClass(index),
          )}
        >
          {channel.title
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase()}
        </span>
      )}
    </div>
  );
}

function EmptyChannelsState({
  planLimitReached,
}: {
  planLimitReached: boolean;
}) {
  return (
    <section
      className="bussin-panel mt-5 flex min-h-[300px] flex-col items-center justify-center rounded-lg border-dashed p-8 text-center"
      data-testid="empty-state"
    >
      <div className="relative mb-5 h-20 w-32">
        <div className="absolute left-4 top-3 grid size-16 -rotate-12 place-items-center rounded-2xl border border-violet-300/25 bg-violet-600/25 shadow-[0_18px_50px_rgba(124,58,237,0.3)]">
          <CirclePlay className="size-8 fill-rose-300 text-rose-300" />
        </div>
        <div className="absolute right-5 bottom-1 grid size-14 rotate-12 place-items-center rounded-2xl border border-blue-300/20 bg-blue-500/10">
          <CirclePlus className="size-7 text-blue-300" />
        </div>
      </div>
      <h2 className="text-lg font-semibold text-white">
        No channels connected yet
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
        Connect your YouTube channels to start publishing and growing your
        audience.
      </p>
      <form action={startChannelsYoutubeOAuthAction} className="mt-6">
        <Button data-testid="primary-action" disabled={planLimitReached}>
          <CirclePlus className="size-4" />
          Connect your first channel
        </Button>
      </form>
    </section>
  );
}

function InlineConnectCard() {
  return (
    <section className="bussin-panel flex min-h-[276px] flex-col items-center justify-center rounded-lg border-dashed p-8 text-center">
      <Zap className="size-10 text-violet-300" />
      <h3 className="mt-4 font-semibold text-white">Add another channel</h3>
      <p className="mt-2 max-w-xs text-sm text-slate-400">
        Connect another YouTube destination for publishing.
      </p>
      <form action={startChannelsYoutubeOAuthAction} className="mt-5">
        <Button>
          <CirclePlus className="size-4" />
          Connect channel
        </Button>
      </form>
    </section>
  );
}

function coverClass(index: number) {
  const classes = [
    "bg-[radial-gradient(circle_at_50%_15%,rgba(236,72,153,0.88),transparent_24%),linear-gradient(135deg,#26115d,#09203f_45%,#ff2fa0)]",
    "bg-[radial-gradient(circle_at_52%_54%,rgba(253,186,116,0.9),transparent_16%),linear-gradient(135deg,#3f1232,#fb7185_38%,#1e293b_78%)]",
    "bg-[radial-gradient(circle_at_54%_72%,rgba(216,180,254,0.9),transparent_21%),linear-gradient(135deg,#160f42,#4c1d95_42%,#0f766e)]",
    "bg-[radial-gradient(circle_at_54%_35%,rgba(148,163,184,0.55),transparent_21%),linear-gradient(135deg,#020617,#334155_42%,#0f172a)]",
  ];

  return classes[index % classes.length];
}

function avatarClass(index: number) {
  const classes = [
    "bg-gradient-to-br from-fuchsia-500 via-slate-800 to-blue-700",
    "bg-gradient-to-br from-orange-400 via-rose-700 to-slate-900",
    "bg-gradient-to-br from-violet-400 via-purple-900 to-cyan-800",
    "bg-gradient-to-br from-slate-300 via-slate-800 to-black",
  ];

  return classes[index % classes.length];
}
