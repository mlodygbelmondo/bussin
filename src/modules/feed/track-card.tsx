"use client";

import {
  CalendarClock,
  ExternalLink,
  MoreHorizontal,
  Music2,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { updateTrackDetailsAction } from "@/modules/feed/feed.actions";
import type { FeedTrack, FeedTrackStatus } from "@/modules/feed/feed.types";
import { formatDuration, toDatetimeLocalValue } from "@/modules/feed/format";
import { retryFailedQueueItem } from "@/modules/feed/jobs.actions";
import {
  publishTrackNowAction,
  rejectTrackAction,
  scheduleTrackAction,
} from "@/modules/feed/publish.actions";
import {
  cancelScheduledUploadAction,
  publishScheduledUploadNowAction,
} from "@/modules/feed/schedule.actions";
import { TrackStatusBadge } from "@/modules/feed/status-presentation";
import { useFeedAction } from "@/modules/feed/use-feed-action";

let activeAudio: HTMLAudioElement | null = null;

export function TrackCard({
  channelTitle,
  track,
}: {
  channelTitle: string | null;
  track: FeedTrack;
}) {
  const { pending, run } = useFeedAction();
  const [editing, setEditing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const justReady = useJustBecameReady(track.status);

  return (
    <div
      className={cn(
        "px-5 py-3.5 transition-colors hover:bg-panel-soft/60",
        justReady && "track-ready-pop",
      )}
      data-testid="track-card"
    >
      <div className="flex items-center gap-4">
        <CoverThumb coverUrl={track.coverUrl} title={track.title} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{track.title}</p>
            {track.durationSeconds ? (
              <span className="font-mono text-xs text-muted-foreground">
                {formatDuration(track.durationSeconds)}
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <TrackStatusBadge track={track} />
            {track.status === "scheduled" && track.scheduledAt ? (
              <span className="text-xs text-muted-foreground">
                {channelTitle ? ` → ${channelTitle}` : ""}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {track.audioUrl ? <AudioPlayButton src={track.audioUrl} /> : null}
          <PrimaryTrackAction pending={pending} run={run} track={track} />
          <TrackMoreMenu
            pending={pending}
            run={run}
            setEditing={setEditing}
            setScheduling={setScheduling}
            track={track}
          />
        </div>
      </div>

      {track.status === "failed" ? (
        <div
          className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm"
          data-testid="track-error"
        >
          <p className="font-medium">This track needs attention.</p>
          {track.failureReason ? (
            <details className="mt-1 text-muted-foreground">
              <summary className="cursor-pointer">Details</summary>
              <p className="mt-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
                {track.failureReason}
              </p>
            </details>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <EditDetailsForm onDone={() => setEditing(false)} track={track} />
      ) : null}

      <ScheduleDialog
        onOpenChange={setScheduling}
        open={scheduling}
        trackId={track.id}
      />
    </div>
  );
}

/*
 * The emotional peak of the product: when polling flips a track from
 * "generating" to "preview_ready", flash a short ember glow-pop on the card.
 */
function useJustBecameReady(status: FeedTrackStatus): boolean {
  const previousStatus = useRef(status);
  const [justReady, setJustReady] = useState(false);

  useEffect(() => {
    const previous = previousStatus.current;

    previousStatus.current = status;

    if (previous === "generating" && status === "preview_ready") {
      setJustReady(true);

      const timeout = window.setTimeout(() => setJustReady(false), 800);

      return () => window.clearTimeout(timeout);
    }
  }, [status]);

  return justReady;
}

function PrimaryTrackAction({
  pending,
  run,
  track,
}: {
  pending: boolean;
  run: ReturnType<typeof useFeedAction>["run"];
  track: FeedTrack;
}) {
  if (track.status === "preview_ready") {
    return (
      <Button
        data-testid="publish-now"
        disabled={pending}
        onClick={() => run(publishTrackNowAction, { trackId: track.id })}
        size="sm"
      >
        Publish
      </Button>
    );
  }

  if (track.status === "failed" && track.retryTarget) {
    return (
      <Button
        data-testid="track-retry"
        disabled={pending}
        onClick={() =>
          run(retryFailedQueueItem, {
            id: track.retryTarget?.id ?? "",
            type: track.retryTarget?.type ?? "track",
          })
        }
        size="sm"
        variant="outline"
      >
        <RotateCcw className="size-4" />
        Retry
      </Button>
    );
  }

  if (track.status === "published" && track.youtubeVideoId) {
    return (
      <Button asChild size="sm" variant="outline">
        <a
          data-testid="watch-on-youtube"
          href={`https://youtu.be/${track.youtubeVideoId}`}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink className="size-4" />
          Watch
        </a>
      </Button>
    );
  }

  return null;
}

function TrackMoreMenu({
  pending,
  run,
  setEditing,
  setScheduling,
  track,
}: {
  pending: boolean;
  run: ReturnType<typeof useFeedAction>["run"];
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  setScheduling: React.Dispatch<React.SetStateAction<boolean>>;
  track: FeedTrack;
}) {
  const hasPreviewActions = track.status === "preview_ready";
  const hasScheduledActions = track.status === "scheduled" && track.uploadId;

  if (!hasPreviewActions && !hasScheduledActions) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="More track options"
          data-testid="publish-options"
          disabled={pending}
          size="icon"
          variant="ghost"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {hasPreviewActions ? (
          <>
            <DropdownMenuItem
              data-testid="schedule-option"
              onSelect={() => setScheduling(true)}
            >
              <CalendarClock className="size-4" />
              Schedule for…
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="edit-details"
              onSelect={() => setEditing((value) => !value)}
            >
              <Pencil className="size-4" />
              Edit details
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="discard-track"
              onSelect={() => run(rejectTrackAction, { trackId: track.id })}
            >
              <Trash2 className="size-4" />
              Discard
            </DropdownMenuItem>
          </>
        ) : null}
        {hasScheduledActions ? (
          <>
            <DropdownMenuItem
              data-testid="publish-early"
              onSelect={() =>
                run(publishScheduledUploadNowAction, {
                  uploadId: track.uploadId ?? "",
                })
              }
            >
              <ExternalLink className="size-4" />
              Publish early
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="cancel-schedule"
              onSelect={() =>
                run(cancelScheduledUploadAction, {
                  uploadId: track.uploadId ?? "",
                })
              }
            >
              <X className="size-4" />
              Cancel schedule
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EditDetailsForm({
  onDone,
  track,
}: {
  onDone: () => void;
  track: FeedTrack;
}) {
  const { pending, run } = useFeedAction();
  const [title, setTitle] = useState(track.title);
  const [description, setDescription] = useState(track.description ?? "");
  const [tags, setTags] = useState(track.tags.join(", "));

  return (
    <div
      className="mt-3 space-y-2 rounded-md border border-border p-3"
      data-testid="edit-details-form"
    >
      <Input
        aria-label="Title"
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Title"
        value={title}
      />
      <Textarea
        aria-label="Description"
        className="min-h-16"
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Description"
        value={description}
      />
      <Input
        aria-label="Tags"
        onChange={(event) => setTags(event.target.value)}
        placeholder="Tags, comma separated"
        value={tags}
      />
      <div className="flex justify-end gap-2">
        <Button onClick={onDone} size="sm" variant="ghost">
          Cancel
        </Button>
        <Button
          data-testid="save-details"
          disabled={pending || title.trim().length === 0}
          onClick={() =>
            run(
              updateTrackDetailsAction,
              {
                description,
                tags,
                title,
                trackId: track.id,
              },
              onDone,
            )
          }
          size="sm"
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function ScheduleDialog({
  onOpenChange,
  open,
  trackId,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  trackId: string;
}) {
  const { pending, run } = useFeedAction();
  const [scheduledAt, setScheduledAt] = useState("");
  const [minScheduledAt] = useState(() =>
    toDatetimeLocalValue(new Date(Date.now() + 60_000)),
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-sm" data-testid="schedule-dialog">
        <DialogHeader>
          <DialogTitle>Schedule publishing</DialogTitle>
          <DialogDescription>
            We&apos;ll publish the video to YouTube at this time.
          </DialogDescription>
        </DialogHeader>
        <Input
          aria-label="Schedule time"
          data-testid="schedule-input"
          min={minScheduledAt}
          onChange={(event) => setScheduledAt(event.target.value)}
          type="datetime-local"
          value={scheduledAt}
        />
        <DialogFooter>
          <Button
            data-testid="schedule-confirm"
            disabled={pending || !scheduledAt}
            onClick={() => {
              const scheduledDate = new Date(scheduledAt);

              if (!Number.isFinite(scheduledDate.getTime())) {
                toast.error("Pick a date and time first.");

                return;
              }

              if (scheduledDate.getTime() <= Date.now()) {
                toast.error("Pick a time in the future");

                return;
              }

              run(
                scheduleTrackAction,
                {
                  scheduled_at: scheduledDate.toISOString(),
                  trackId,
                },
                () => onOpenChange(false),
              );
            }}
          >
            <CalendarClock className="size-4" />
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AudioPlayButton({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.addEventListener("ended", () => setPlaying(false));
      audioRef.current.addEventListener("pause", () => setPlaying(false));
    }

    if (playing) {
      audioRef.current.pause();

      return;
    }

    if (activeAudio && activeAudio !== audioRef.current) {
      activeAudio.pause();
    }

    activeAudio = audioRef.current;
    void audioRef.current.play();
    setPlaying(true);
  }

  return (
    <Button
      aria-label={playing ? "Pause preview" : "Play preview"}
      className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary transition-colors hover:bg-primary/25"
      data-testid="play-track"
      onClick={toggle}
      size="icon"
      variant="ghost"
    >
      {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
    </Button>
  );
}

function CoverThumb({
  coverUrl,
  title,
}: {
  coverUrl: string | null;
  title: string;
}) {
  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signed URLs are short-lived; next/image optimization would break them
      <img
        alt={`Cover for ${title}`}
        className="size-10 shrink-0 rounded-md border border-border object-cover"
        src={coverUrl}
      />
    );
  }

  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-accent text-muted-foreground">
      <Music2 className="size-4" />
    </span>
  );
}
