"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  Music2,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
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
import { updateTrackDetailsAction } from "@/modules/feed/feed.actions";
import type {
  FeedActionResult,
  FeedJobGroup,
  FeedTrack,
} from "@/modules/feed/feed.types";
import {
  cancelQueueRequest,
  retryFailedQueueItem,
} from "@/modules/queue/queue.actions";
import {
  cancelScheduledUploadAction,
  publishScheduledUploadNowAction,
} from "@/modules/scheduled/scheduled.actions";
import {
  publishTrackNowAction,
  rejectTrackAction,
  scheduleTrackAction,
} from "@/modules/tracks/track-preview.actions";

type FeedAction = (formData: FormData) => Promise<FeedActionResult>;

let activeAudio: HTMLAudioElement | null = null;

function useFeedAction() {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  function run(
    action: FeedAction,
    entries: Record<string, string>,
    onSuccess?: () => void,
  ) {
    startTransition(async () => {
      const formData = new FormData();

      for (const [key, value] of Object.entries(entries)) {
        formData.append(key, value);
      }

      const result = await action(formData);

      if (result.ok) {
        toast.success(result.message);
        onSuccess?.();
        await queryClient.invalidateQueries({ queryKey: ["feed"] });
      } else {
        toast.error(result.message);
      }
    });
  }

  return { pending, run };
}

export function FeedList({
  channelTitle,
  groups,
}: {
  channelTitle: string | null;
  groups: FeedJobGroup[];
}) {
  return (
    <div className="space-y-4" data-testid="feed">
      {groups.map((group) => (
        <JobGroupCard
          channelTitle={channelTitle}
          group={group}
          key={group.id}
        />
      ))}
    </div>
  );
}

function JobGroupCard({
  channelTitle,
  group,
}: {
  channelTitle: string | null;
  group: FeedJobGroup;
}) {
  const { pending, run } = useFeedAction();
  const isActive = group.status === "queued" || group.status === "running";

  return (
    <article
      className="rounded-lg border border-line bg-card p-4"
      data-testid="job-group"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{group.prompt}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(group.createdAt)} · {group.trackCount}{" "}
            {group.trackCount === 1 ? "track" : "tracks"}
          </p>
        </div>
        {isActive ? (
          <Button
            data-testid="cancel-generation"
            disabled={pending}
            onClick={() => run(cancelQueueRequest, { id: group.id })}
            size="sm"
            variant="ghost"
          >
            <X className="size-4" />
            Cancel
          </Button>
        ) : null}
      </header>
      {isActive &&
      group.tracks.every((track) => track.status === "generating") ? (
        <p
          className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"
          data-testid="loading-state"
        >
          <Loader2 className="size-4 animate-spin text-primary" />
          Generating {group.trackCount}{" "}
          {group.trackCount === 1 ? "track" : "tracks"}… this usually takes a
          minute or two.
        </p>
      ) : null}
      {group.status === "failed" ? (
        <div
          className="mt-3 flex items-center justify-between gap-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-danger"
          data-testid="error-state"
        >
          <span>{group.failureReason ?? "Generation failed."}</span>
          <Button
            disabled={pending}
            onClick={() =>
              run(retryFailedQueueItem, {
                id: group.id,
                type: "generation_request",
              })
            }
            size="sm"
            variant="outline"
          >
            <RotateCcw className="size-4" />
            Retry
          </Button>
        </div>
      ) : null}
      {group.tracks.length > 0 ? (
        <div className="mt-3 space-y-2">
          {group.tracks.map((track) => (
            <TrackCard
              channelTitle={channelTitle}
              key={track.id}
              track={track}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function TrackCard({
  channelTitle,
  track,
}: {
  channelTitle: string | null;
  track: FeedTrack;
}) {
  const { pending, run } = useFeedAction();
  const [editing, setEditing] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  return (
    <div
      className="rounded-md border border-border bg-background/40 p-3"
      data-testid="track-card"
    >
      <div className="flex items-center gap-3">
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
          <div className="mt-1 flex items-center gap-2">
            <TrackStatusBadge track={track} />
            {track.status === "scheduled" && track.scheduledAt ? (
              <span className="text-xs text-muted-foreground">
                {formatDateTime(track.scheduledAt)}
                {channelTitle ? ` → ${channelTitle}` : ""}
              </span>
            ) : null}
          </div>
        </div>
        {track.audioUrl ? <AudioPlayButton src={track.audioUrl} /> : null}
      </div>

      {track.status === "failed" ? (
        <div
          className="mt-2 flex items-center justify-between gap-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-danger"
          data-testid="track-error"
        >
          <span>{track.failureReason ?? "Something went wrong."}</span>
          {track.retryTarget ? (
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
          ) : null}
        </div>
      ) : null}

      {track.status === "preview_ready" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex">
            <Button
              className="rounded-r-none"
              data-testid="publish-now"
              disabled={pending}
              onClick={() => run(publishTrackNowAction, { trackId: track.id })}
              size="sm"
            >
              Publish now
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="More publish options"
                  className="rounded-l-none border-l border-primary-foreground/20 px-2"
                  data-testid="publish-options"
                  disabled={pending}
                  size="sm"
                >
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  data-testid="schedule-option"
                  onSelect={() => setScheduling(true)}
                >
                  <CalendarClock className="size-4" />
                  Schedule for…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button
            data-testid="edit-details"
            onClick={() => setEditing((value) => !value)}
            size="sm"
            variant="ghost"
          >
            <Pencil className="size-4" />
            Edit details
          </Button>
          <Button
            data-testid="discard-track"
            disabled={pending}
            onClick={() => run(rejectTrackAction, { trackId: track.id })}
            size="sm"
            variant="ghost"
          >
            <Trash2 className="size-4" />
            Discard
          </Button>
        </div>
      ) : null}

      {track.status === "scheduled" && track.uploadId ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            data-testid="publish-early"
            disabled={pending}
            onClick={() =>
              run(publishScheduledUploadNowAction, {
                uploadId: track.uploadId ?? "",
              })
            }
            size="sm"
            variant="outline"
          >
            Publish early
          </Button>
          <Button
            data-testid="cancel-schedule"
            disabled={pending}
            onClick={() =>
              run(cancelScheduledUploadAction, {
                uploadId: track.uploadId ?? "",
              })
            }
            size="sm"
            variant="ghost"
          >
            <X className="size-4" />
            Cancel schedule
          </Button>
        </div>
      ) : null}

      {track.status === "published" && track.youtubeVideoId ? (
        <div className="mt-3">
          <Button asChild size="sm" variant="outline">
            <a
              data-testid="watch-on-youtube"
              href={`https://youtu.be/${track.youtubeVideoId}`}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink className="size-4" />
              Watch on YouTube
            </a>
          </Button>
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

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-sm" data-testid="schedule-dialog">
        <DialogHeader>
          <DialogTitle>Schedule upload</DialogTitle>
          <DialogDescription>
            The video uploads to YouTube automatically at this time.
          </DialogDescription>
        </DialogHeader>
        <Input
          aria-label="Schedule time"
          data-testid="schedule-input"
          onChange={(event) => setScheduledAt(event.target.value)}
          type="datetime-local"
          value={scheduledAt}
        />
        <DialogFooter>
          <Button
            data-testid="schedule-confirm"
            disabled={pending || !scheduledAt}
            onClick={() =>
              run(
                scheduleTrackAction,
                {
                  scheduled_at: new Date(scheduledAt).toISOString(),
                  trackId,
                },
                () => onOpenChange(false),
              )
            }
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
      data-testid="play-track"
      onClick={toggle}
      size="icon"
      variant="outline"
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

function TrackStatusBadge({ track }: { track: FeedTrack }) {
  switch (track.status) {
    case "generating":
      return (
        <Badge variant="secondary">
          <Loader2 className="size-3 animate-spin" />
          Generating
        </Badge>
      );
    case "preview_ready":
      return <Badge variant="info">Preview ready</Badge>;
    case "rendering":
      return (
        <Badge variant="info">
          <Loader2 className="size-3 animate-spin" />
          Rendering
        </Badge>
      );
    case "uploading":
      return (
        <Badge variant="info">
          <Loader2 className="size-3 animate-spin" />
          Uploading
        </Badge>
      );
    case "scheduled":
      return (
        <Badge variant="warning">
          <CalendarClock className="size-3" />
          Scheduled
        </Badge>
      );
    case "published":
      return (
        <Badge variant="success">
          <Check className="size-3" />
          Published
        </Badge>
      );
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "discarded":
      return <Badge variant="outline">Discarded</Badge>;
  }
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);

  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(iso));
}
