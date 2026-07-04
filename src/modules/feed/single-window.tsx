"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUp,
  ChevronDown,
  Loader2,
  LogOut,
  Music2,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { signOut } from "@/app/auth/actions";
import { Aurora } from "@/components/common/aurora";
import { PulseMark } from "@/components/common/logo";
import { Reveal } from "@/components/common/motion";
import { Starfield } from "@/components/common/starfield";
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
import { APP_NAME } from "@/lib/app-public-config";
import { createFeedGenerationAction } from "@/modules/feed/feed.actions";
import { SUNO_MODELS } from "@/server/validators/generation.validator";
import { FeedList } from "@/modules/feed/feed-cards";
import type {
  FeedConnections,
  FeedData,
  FeedUsage,
  FeedUser,
} from "@/modules/feed/feed.types";

const TRACK_COUNT_OPTIONS = [1, 2, 3, 4];
const SUNO_MODEL_LABELS: Record<string, string> = {
  V4_5: "v4.5",
  V4_5PLUS: "v4.5+",
  V5: "v5",
  V5_5: "v5.5 (newest)",
};
const DURATION_OPTIONS = [
  { label: "1 min", value: 60 },
  { label: "2 min", value: 120 },
  { label: "3 min", value: 180 },
  { label: "4 min", value: 240 },
  { label: "5 min", value: 300 },
];

const PROMPT_SUGGESTIONS = [
  "Lo-fi study beat",
  "Dark cinematic trap",
  "Upbeat vlog background",
  "Calm piano for sleep",
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
  const {
    data: feed,
    error,
    isError,
    refetch,
  } = useQuery({
    initialData: initialFeed,
    queryFn: fetchFeed,
    queryKey: ["feed"],
    refetchInterval: (query) =>
      query.state.data?.hasActiveWork ? 4000 : false,
  });
  const connectionsReady =
    feed.connections.sunoConnected && feed.connections.youtubeConnected;
  const sunoReady = feed.connections.sunoConnected;
  const hasHistory = feed.groups.length > 0;
  const remaining = Math.max(feed.usage.limit - feed.usage.used, 0);

  return (
    <div
      className="relative isolate flex min-h-[100dvh] flex-col"
      data-testid="screen-single-window"
    >
      <div
        aria-hidden="true"
        className="grain pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <Aurora />
        <Starfield />
      </div>
      <TopBar
        accountMenuExtras={accountMenuExtras}
        usage={feed.usage}
        user={feed.user}
      />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-16">
        <section
          className={
            hasHistory
              ? "sticky top-14 z-10 -mx-4 px-4 pt-5 pb-3"
              : "relative flex flex-1 flex-col justify-center pt-20 pb-12"
          }
        >
          <div className="mx-auto w-full max-w-3xl">
            {hasHistory ? null : (
              <Reveal className="mb-8 text-center">
                <h1 className="text-center font-display text-4xl font-bold tracking-tight sm:text-5xl">
                  What should we make today?
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
                  Describe it. We&apos;ll create the track, render the video,
                  and get it ready for YouTube.
                </p>
              </Reveal>
            )}
            <Reveal delay={hasHistory ? 0 : 0.1}>
              {remaining === 0 ? <UsageLimitBanner /> : null}
              {!connectionsReady ? (
                <ConnectGate connections={feed.connections} />
              ) : null}
              <PromptBox
                disabled={!sunoReady || remaining === 0}
                hasHistory={hasHistory}
              />
            </Reveal>
          </div>
        </section>
        {isError ? (
          <FeedRefreshError error={error} onRetry={() => void refetch()} />
        ) : null}
        {hasHistory ? (
          <FeedList
            channelTitle={feed.connections.channelTitle}
            publishDefaults={feed.publishDefaults}
            groups={feed.groups}
          />
        ) : null}
      </main>
    </div>
  );
}

function FeedRefreshError({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry: () => void;
}) {
  return (
    <div
      aria-live="polite"
      className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-muted-foreground"
      data-testid="feed-refresh-error"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" />
        <div>
          <p className="font-medium text-foreground">
            We couldn&apos;t refresh your studio. Retrying…
          </p>
          {error?.message ? <p className="mt-1">{error.message}</p> : null}
        </div>
      </div>
      <Button onClick={onRetry} size="sm" type="button" variant="outline">
        Retry
      </Button>
    </div>
  );
}

function UsageLimitBanner() {
  return (
    <div className="mb-3 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
      <div>
        <p className="font-medium">You&apos;ve used all your generations.</p>
        <p className="mt-1 text-muted-foreground">
          <Link
            className="text-primary underline-offset-4 hover:underline"
            href="/dashboard/billing"
          >
            Upgrade
          </Link>{" "}
          to keep creating.
        </p>
      </div>
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
    <header className="sticky top-0 z-40 border-b border-line/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          className="flex items-center gap-2.5 text-lg tracking-tight"
          href="/dashboard"
        >
          <PulseMark className="size-5.5" />
          <span className="font-display font-semibold tracking-tight">
            {APP_NAME}
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Open account menu"
                className="flex items-center gap-1.5 rounded-full text-sm text-muted-foreground transition-colors hover:text-foreground"
                data-testid="account-menu-trigger"
                type="button"
              >
                <span className="flex size-8 items-center justify-center rounded-full border border-line bg-panel text-sm font-semibold text-foreground transition-colors hover:border-primary/50">
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
              <DropdownMenuLabel className="font-normal">
                <span
                  className="block text-sm font-medium text-foreground"
                  data-testid="usage-counter"
                >
                  {remaining} of {usage.limit} generations left
                </span>
                <span className="block text-xs text-muted-foreground">
                  {usage.plan} plan
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {accountMenuExtras}
              <SignOutMenuItem />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function SignOutMenuItem() {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenuItem
      data-testid="sign-out"
      disabled={pending}
      onSelect={(event) => {
        event.preventDefault();
        startTransition(() => {
          void signOut();
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut />}
      {pending ? "Signing out..." : "Sign out"}
    </DropdownMenuItem>
  );
}

function PromptBox({
  disabled,
  hasHistory,
}: {
  disabled: boolean;
  hasHistory: boolean;
}) {
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pending, startTransition] = useTransition();
  const [prompt, setPrompt] = useState("");
  const [trackCount, setTrackCount] = useState(2);
  const [duration, setDuration] = useState(180);
  const [model, setModel] = useState<string>(SUNO_MODELS[0]);
  const [styleWeight, setStyleWeight] = useState(0.5);
  const [weirdness, setWeirdness] = useState(0.5);
  const [lyrics, setLyrics] = useState("");
  const canSubmit = prompt.trim().length >= 2 && !pending && !disabled;
  const durationLabel =
    DURATION_OPTIONS.find((option) => option.value === duration)?.label ??
    `${Math.round(duration / 60)} min`;

  useEffect(() => {
    try {
      const pendingPrompt = localStorage
        .getItem("bussin.pending-prompt")
        ?.trim();

      if (pendingPrompt && prompt.length === 0) {
        window.setTimeout(() => {
          try {
            setPrompt(pendingPrompt);
            textareaRef.current?.focus();
            localStorage.removeItem("bussin.pending-prompt");
          } catch {
            // Ignore storage access failures.
          }
        }, 0);
      }
    } catch {
      // Ignore storage access failures.
    }
    // Run once on mount only for the landing-to-studio handoff.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(form?: HTMLFormElement) {
    if (!canSubmit) {
      return;
    }

    startTransition(async () => {
      const formData = form ? new FormData(form) : new FormData();

      if (!form) {
        formData.append("prompt", prompt);
        formData.append("track_count", String(trackCount));
        formData.append("duration_seconds", String(duration));
        formData.append("model", model);
        formData.append("style_weight", String(styleWeight));
        formData.append("weirdness", String(weirdness));
        formData.append("lyrics", lyrics);
      }

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
    <form
      className="prompt-card rounded-xl border border-line bg-popover/90 p-3 text-left shadow-[var(--shadow-elevated)] backdrop-blur-sm transition-shadow focus-within:border-primary/60"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      <input name="track_count" type="hidden" value={trackCount} />
      <input name="duration_seconds" type="hidden" value={duration} />
      <input name="model" type="hidden" value={model} />
      <input name="style_weight" type="hidden" value={styleWeight} />
      <input name="weirdness" type="hidden" value={weirdness} />
      <input name="lyrics" type="hidden" value={lyrics} />
      <Textarea
        className={
          hasHistory
            ? "min-h-20 resize-none border-0 bg-transparent p-1 text-base shadow-none focus-visible:border-transparent focus-visible:ring-0"
            : "min-h-32 resize-none border-0 bg-transparent p-2 text-base shadow-none focus-visible:border-transparent focus-visible:ring-0 sm:text-lg"
        }
        data-testid="prompt-input"
        disabled={disabled}
        name="prompt"
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="A warm lo-fi beat for a rainy night drive…"
        ref={textareaRef}
        value={prompt}
      />
      {!hasHistory ? (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {PROMPT_SUGGESTIONS.map((suggestion) => (
            <button
              className="rounded-full border border-line bg-panel/50 px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
              disabled={disabled}
              key={suggestion}
              onClick={() => {
                setPrompt(suggestion);
                textareaRef.current?.focus();
              }}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <OptionsMenu
            disabled={disabled || pending}
            duration={duration}
            lyrics={lyrics}
            model={model}
            setDuration={setDuration}
            setLyrics={setLyrics}
            setModel={setModel}
            setStyleWeight={setStyleWeight}
            setTrackCount={setTrackCount}
            setWeirdness={setWeirdness}
            styleWeight={styleWeight}
            trackCount={trackCount}
            weirdness={weirdness}
          />
          <p className="text-xs text-muted-foreground">
            {trackCount} {trackCount === 1 ? "track" : "tracks"} •{" "}
            {durationLabel}
          </p>
        </div>
        <Button
          aria-label={pending ? "Starting…" : "Create"}
          className="rounded-full transition-transform hover:scale-105 active:scale-95"
          data-testid="prompt-submit"
          disabled={!canSubmit}
          size="icon"
          type="submit"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowUp className="size-4" strokeWidth={2.6} />
          )}
        </Button>
      </div>
    </form>
  );
}

function OptionsMenu({
  disabled,
  duration,
  lyrics,
  model,
  setDuration,
  setLyrics,
  setModel,
  setStyleWeight,
  setTrackCount,
  setWeirdness,
  styleWeight,
  trackCount,
  weirdness,
}: {
  disabled: boolean;
  duration: number;
  lyrics: string;
  model: string;
  setDuration: (value: number) => void;
  setLyrics: (value: string) => void;
  setModel: (value: string) => void;
  setStyleWeight: (value: number) => void;
  setTrackCount: (value: number) => void;
  setWeirdness: (value: number) => void;
  styleWeight: number;
  trackCount: number;
  weirdness: number;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={disabled} type="button" variant="ghost">
          <Settings2 className="size-4" />
          Options
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 space-y-3 p-3">
        <label className="block space-y-1.5 text-sm font-medium">
          Tracks
          <select
            aria-label="Number of tracks"
            className="h-9 w-full rounded-md border border-border bg-input px-2 text-sm text-foreground outline-none focus-visible:border-ring"
            data-testid="track-count-select"
            onChange={(event) => setTrackCount(Number(event.target.value))}
            value={trackCount}
          >
            {TRACK_COUNT_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count === 1 ? "1 track" : `${count} tracks`}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          Duration
          <select
            aria-label="Track duration"
            className="h-9 w-full rounded-md border border-border bg-input px-2 text-sm text-foreground outline-none focus-visible:border-ring"
            data-testid="duration-select"
            onChange={(event) => setDuration(Number(event.target.value))}
            value={duration}
          >
            {DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          Model
          <select
            aria-label="Suno model"
            className="h-9 w-full rounded-md border border-border bg-input px-2 text-sm text-foreground outline-none focus-visible:border-ring"
            data-testid="suno-model-select"
            onChange={(event) => setModel(event.target.value)}
            value={model}
          >
            {SUNO_MODELS.map((value) => (
              <option key={value} value={value}>
                {SUNO_MODEL_LABELS[value] ?? value}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          <span className="flex items-center justify-between">
            Style influence
            <span className="font-mono text-xs text-muted-foreground">
              {Math.round(styleWeight * 100)}%
            </span>
          </span>
          <input
            aria-label="Style influence"
            className="w-full accent-primary"
            data-testid="style-weight-slider"
            max={100}
            min={0}
            onChange={(event) =>
              setStyleWeight(Number(event.target.value) / 100)
            }
            type="range"
            value={Math.round(styleWeight * 100)}
          />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          <span className="flex items-center justify-between">
            Weirdness
            <span className="font-mono text-xs text-muted-foreground">
              {Math.round(weirdness * 100)}%
            </span>
          </span>
          <input
            aria-label="Weirdness"
            className="w-full accent-primary"
            data-testid="weirdness-slider"
            max={100}
            min={0}
            onChange={(event) => setWeirdness(Number(event.target.value) / 100)}
            type="range"
            value={Math.round(weirdness * 100)}
          />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          Lyrics <span className="text-muted-foreground">(optional)</span>
          <textarea
            aria-label="Lyrics"
            className="min-h-16 w-full resize-none rounded-md border border-border bg-input px-2 py-1.5 text-sm font-normal text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring"
            data-testid="lyrics-input"
            maxLength={3000}
            onChange={(event) => setLyrics(event.target.value)}
            placeholder="Leave empty for instrumental"
            value={lyrics}
          />
        </label>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ConnectGate({ connections }: { connections: FeedConnections }) {
  return (
    <div
      className="mb-3 rounded-xl border border-line bg-panel px-4 py-3 text-sm"
      data-testid="connect-gate"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
          <Music2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          {!connections.sunoConnected ? (
            <div>
              <p className="font-medium">
                Connect your Suno account to start creating
              </p>
              <p className="text-sm text-muted-foreground">
                Once Suno is connected, you can turn any prompt into music.
              </p>
            </div>
          ) : null}
          {!connections.youtubeConnected ? (
            <div>
              <p className="font-medium">
                Connect YouTube so we can publish for you
              </p>
              <p className="text-sm text-muted-foreground">
                You can keep creating now; connect YouTube before publishing.
              </p>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {!connections.sunoConnected ? (
              <Button asChild data-testid="connect-cta" size="sm">
                <Link data-testid="connect-suno" href="/onboarding">
                  Connect Suno
                </Link>
              </Button>
            ) : null}
            {!connections.youtubeConnected ? (
              <Button
                asChild
                data-testid={
                  connections.sunoConnected ? "connect-cta" : undefined
                }
                size="sm"
                variant={connections.sunoConnected ? "default" : "outline"}
              >
                <Link data-testid="connect-youtube" href="/onboarding">
                  Connect YouTube
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
