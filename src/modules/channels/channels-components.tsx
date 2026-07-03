import Link from "next/link";
import type { ReactNode } from "react";
import {
  CirclePlus,
  ExternalLink,
  Info,
  Music2,
  ShieldCheck,
  Star,
  Unplug,
  CirclePlay,
} from "lucide-react";
import { DashboardTopBar } from "@/components/common/dashboard-top-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Card className="rounded-xl border-line bg-card/80">
        <CardHeader>
          <CardTitle className="font-display text-2xl tracking-tight">
            All your channels. One place.
          </CardTitle>
          <CardDescription className="max-w-2xl">
            Connect YouTube destinations, keep them healthy, and choose where
            new tracks should publish by default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryItem
              label="Connected"
              value={`${data.counts.connected} / ${data.plan.limit}`}
            />
            <SummaryItem label="Healthy" value={data.counts.healthy} />
            <SummaryItem label="Needs attention" value={data.counts.issues} />
            <SummaryItem
              label="Default"
              value={data.defaultChannel?.title ?? "Not set"}
            />
          </dl>
        </CardContent>
      </Card>
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
    <footer className="flex flex-wrap items-center justify-center gap-2 py-7 text-sm text-muted-foreground">
      <Info className="size-4" />
      Channel limits depend on your plan. Upgrade to connect more channels.
      <Link className="font-medium text-primary" href="/dashboard/billing">
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
    <Card
      className="min-w-0 overflow-hidden rounded-xl border-line bg-card/80 py-0"
      data-testid="channel-card"
    >
      <div className="border-b border-line bg-panel p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <ChannelAvatar channel={channel} index={index} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 text-base font-semibold break-words text-foreground">
                  {channel.title}
                </h3>
                {channel.isDefault ? <Badge>Default</Badge> : null}
              </div>
              <p className="mt-2 break-words text-xs text-muted-foreground">
                {channel.handle ?? channel.youtubeChannelId} ·{" "}
                {channel.subscribersLabel}
              </p>
            </div>
          </div>
          <StatusPill label={channel.statusLabel} tone={channel.statusTone} />
        </div>
      </div>
      <CardContent className="pt-5 pb-5">
        <dl className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Last sync</dt>
            <dd className="flex items-center gap-2 text-foreground">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  isHealthy ? "bg-success" : "bg-warning",
                )}
              />
              {channel.lastSyncLabel}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Connected account</dt>
            <dd className="max-w-[220px] truncate text-foreground">
              {channel.connectedAccount}
            </dd>
          </div>
        </dl>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {channel.isDefault ? (
            <Button
              className="h-9 w-full justify-center px-3"
              disabled
              type="button"
              variant="outline"
            >
              <Star className="size-4" />
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
      </CardContent>
    </Card>
  );
}

export function SunoStatusCard({ suno }: { suno: SunoConnectionStatus }) {
  return (
    <Card
      className="rounded-xl border-line bg-card/80 p-0"
      data-testid="suno-card"
    >
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="font-display">Suno connection</CardTitle>
        <StatusPill label={suno.statusLabel} tone={suno.statusTone} />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="grid size-14 place-items-center rounded-lg border border-line bg-secondary text-primary">
            <Music2 className="size-8" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{suno.label}</p>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {suno.emailLabel}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {suno.checkedLabel}
            </p>
          </div>
        </div>
        <div className="mt-5 border-t border-line pt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Plan</span>
            <Button asChild size="sm">
              <Link href="/dashboard/billing">Upgrade</Link>
            </Button>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Monthly generations</span>
            <span className="font-mono text-foreground">
              {suno.creditsLabel}
            </span>
          </div>
          <ChannelsActionButton kind="test-suno" label="Test Suno connection" />
          <Button
            asChild
            className="mt-3 w-full"
            type="button"
            variant="outline"
          >
            <Link href="/onboarding">
              Manage in Connections
              <ExternalLink className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-2 truncate text-2xl font-semibold text-foreground">
        {value}
      </dd>
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
    <Badge className={className} variant={statusVariant(tone)}>
      <ShieldCheck className="size-3.5" />
      {label}
    </Badge>
  );
}

function statusVariant(tone: ChannelsStatusTone) {
  if (tone === "emerald") {
    return "success";
  }

  if (tone === "amber") {
    return "warning";
  }

  if (tone === "red") {
    return "destructive";
  }

  return "outline";
}

function ChannelAvatar({
  channel,
}: {
  channel: ChannelCardItem;
  index: number;
}) {
  return (
    <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-secondary">
      {channel.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={`${channel.title} avatar`}
          className="size-full object-cover"
          src={channel.thumbnailUrl}
        />
      ) : (
        <span className="grid size-full place-items-center text-lg font-semibold text-foreground">
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
    <Card
      className="mt-5 flex min-h-[300px] flex-col items-center justify-center rounded-xl border-line bg-card/80 text-center"
      data-testid="empty-state"
    >
      <div className="mb-5 grid size-14 place-items-center rounded-lg border border-line bg-secondary text-primary">
        <CirclePlay className="size-7" />
      </div>
      <h2 className="font-display text-lg font-semibold text-foreground">
        No channels connected yet
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Connect your YouTube channels to start publishing and growing your
        audience.
      </p>
      <form action={startChannelsYoutubeOAuthAction} className="mt-6">
        <Button data-testid="primary-action" disabled={planLimitReached}>
          <CirclePlus className="size-4" />
          Connect your first channel
        </Button>
      </form>
    </Card>
  );
}

function InlineConnectCard() {
  return (
    <Card className="flex min-h-[276px] flex-col items-center justify-center rounded-xl border-line bg-card/80 p-8 text-center">
      <CirclePlus className="size-10 text-primary" />
      <h3 className="font-display mt-4 font-semibold text-foreground">
        Add another channel
      </h3>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Connect another YouTube destination for publishing.
      </p>
      <form action={startChannelsYoutubeOAuthAction} className="mt-5">
        <Button>
          <CirclePlus className="size-4" />
          Connect channel
        </Button>
      </form>
    </Card>
  );
}
