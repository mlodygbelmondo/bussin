"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AudioWaveform,
  ChevronDown,
  LogOut,
  Music2,
  Sparkles,
  SquarePlay,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { signOut } from "@/app/auth/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_NAME } from "@/lib/app-config";
import { createFeedGenerationAction } from "@/modules/feed/feed.actions";
import { FeedList } from "@/modules/feed/feed-cards";
import type {
  FeedConnections,
  FeedData,
  FeedUsage,
  FeedUser,
} from "@/modules/feed/feed.types";

const TRACK_COUNT_OPTIONS = [1, 2, 3, 4];
const DURATION_OPTIONS = [
  { label: "1 min", value: 60 },
  { label: "2 min", value: 120 },
  { label: "3 min", value: 180 },
  { label: "4 min", value: 240 },
  { label: "5 min", value: 300 },
];

async function fetchFeed(): Promise<FeedData> {
  const response = await fetch("/api/feed", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Could not refresh the feed.");
  }

  return response.json();
}

export function SingleWindow({
  accountMenuExtras,
  initialFeed,
}: {
  accountMenuExtras?: React.ReactNode;
  initialFeed: FeedData;
}) {
  const { data: feed } = useQuery({
    initialData: initialFeed,
    queryFn: fetchFeed,
    queryKey: ["feed"],
    refetchInterval: (query) =>
      query.state.data?.hasActiveWork ? 4000 : false,
  });
  const connectionsReady =
    feed.connections.sunoConnected && feed.connections.youtubeConnected;
  const hasHistory = feed.groups.length > 0;

  return (
    <div
      className="flex min-h-[100dvh] flex-col"
      data-testid="screen-single-window"
    >
      <TopBar
        accountMenuExtras={accountMenuExtras}
        usage={feed.usage}
        user={feed.user}
      />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-16">
        {connectionsReady ? (
          <>
            <section
              className={
                hasHistory
                  ? "sticky top-0 z-10 -mx-4 bg-background/95 px-4 pt-6 pb-4 backdrop-blur-sm"
                  : "flex flex-1 flex-col justify-center pt-10 pb-6"
              }
            >
              {hasHistory ? null : (
                <h1 className="mb-6 text-center text-3xl font-semibold tracking-tight sm:text-4xl">
                  What do you want to make?
                </h1>
              )}
              <PromptBox />
            </section>
            {hasHistory ? (
              <FeedList
                channelTitle={feed.connections.channelTitle}
                groups={feed.groups}
              />
            ) : null}
          </>
        ) : (
          <ConnectGate connections={feed.connections} />
        )}
      </main>
    </div>
  );
}

function TopBar({
  accountMenuExtras,
  usage,
  user,
}: {
  accountMenuExtras?: React.ReactNode;
  usage: FeedUsage;
  user: FeedUser;
}) {
  const remaining = Math.max(usage.limit - usage.used, 0);

  return (
    <header className="flex h-14 items-center justify-between border-b border-line px-4 sm:px-6">
      <Link
        className="flex items-center gap-2 text-lg font-semibold tracking-tight"
        href="/dashboard"
      >
        <AudioWaveform className="size-6 text-primary" strokeWidth={2.4} />
        {APP_NAME}
      </Link>
      <div className="flex items-center gap-3">
        <Badge
          data-testid="usage-counter"
          variant={remaining === 0 ? "warning" : "secondary"}
        >
          {remaining} of {usage.limit} generations left
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Open account menu"
              className="flex items-center gap-1.5 rounded-md p-1 text-sm text-muted-foreground hover:text-foreground"
              data-testid="account-menu-trigger"
              type="button"
            >
              <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {user.initials}
              </span>
              <ChevronDown className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <span className="block text-sm font-medium text-foreground">
                {user.displayName}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {accountMenuExtras}
            <DropdownMenuItem asChild>
              <form action={signOut} className="w-full">
                <button
                  className="flex w-full items-center gap-2"
                  data-testid="sign-out"
                  type="submit"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function PromptBox() {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [prompt, setPrompt] = useState("");
  const [trackCount, setTrackCount] = useState(2);
  const [duration, setDuration] = useState(180);
  const canSubmit = prompt.trim().length >= 2 && !pending;

  function submit() {
    if (!canSubmit) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();

      formData.append("prompt", prompt);
      formData.append("track_count", String(trackCount));
      formData.append("duration_seconds", String(duration));

      const result = await createFeedGenerationAction(formData);

      if (result.ok) {
        setPrompt("");
        toast.success(result.message);
        await queryClient.invalidateQueries({ queryKey: ["feed"] });
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="rounded-lg border border-line bg-card p-3 focus-within:border-ring">
      <Textarea
        className="min-h-20 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
        data-testid="prompt-input"
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="Describe the track you want — style, mood, instruments…"
        value={prompt}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ChipSelect
          ariaLabel="Number of tracks"
          onChange={(value) => setTrackCount(value)}
          options={TRACK_COUNT_OPTIONS.map((count) => ({
            label: count === 1 ? "1 track" : `${count} tracks`,
            value: count,
          }))}
          testId="track-count-select"
          value={trackCount}
        />
        <ChipSelect
          ariaLabel="Track duration"
          onChange={(value) => setDuration(value)}
          options={DURATION_OPTIONS}
          testId="duration-select"
          value={duration}
        />
        <Button
          className="ml-auto"
          data-testid="prompt-submit"
          disabled={!canSubmit}
          onClick={submit}
          type="button"
        >
          <Sparkles className="size-4" />
          {pending ? "Starting…" : "Create"}
        </Button>
      </div>
    </div>
  );
}

function ChipSelect({
  ariaLabel,
  onChange,
  options,
  testId,
  value,
}: {
  ariaLabel: string;
  onChange: (value: number) => void;
  options: { label: string; value: number }[];
  testId: string;
  value: number;
}) {
  return (
    <select
      aria-label={ariaLabel}
      className="h-8 rounded-md border border-border bg-input/40 px-2 text-xs text-foreground outline-none focus-visible:border-ring"
      data-testid={testId}
      onChange={(event) => onChange(Number(event.target.value))}
      value={value}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ConnectGate({ connections }: { connections: FeedConnections }) {
  return (
    <section
      className="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center"
      data-testid="connect-gate"
    >
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Connect your accounts to start creating
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bussin needs your Suno account to generate music and a YouTube channel
          to publish it.
        </p>
      </div>
      <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
        <ConnectCard
          connected={connections.sunoConnected}
          icon={<Music2 className="size-6" />}
          name="Suno"
          testId="connect-suno"
        />
        <ConnectCard
          connected={connections.youtubeConnected}
          icon={<SquarePlay className="size-6" />}
          name="YouTube"
          testId="connect-youtube"
        />
      </div>
      <Button asChild data-testid="connect-cta" size="lg">
        <Link href="/onboarding">Connect accounts</Link>
      </Button>
    </section>
  );
}

function ConnectCard({
  connected,
  icon,
  name,
  testId,
}: {
  connected: boolean;
  icon: React.ReactNode;
  name: string;
  testId: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-line bg-card p-4 text-left"
      data-testid={testId}
    >
      <span className="grid size-11 place-items-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <p className="font-medium">{name}</p>
        <Badge variant={connected ? "success" : "warning"}>
          {connected ? "Connected" : "Not connected"}
        </Badge>
      </div>
    </div>
  );
}
