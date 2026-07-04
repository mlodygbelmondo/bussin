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
import { useState } from "react";
import { Reveal } from "@/components/common/motion";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  cancelScheduleOptimism,
  discardTrackOptimism,
  editTrackDetailsOptimism,
  publishScheduledEarlyOptimism,
  retryTrackOptimism,
  scheduleTrackOptimism,
} from "@/modules/feed/feed-optimism";
import type { FeedPublishDefaults, FeedTrack } from "@/modules/feed/feed.types";
import { formatDuration } from "@/modules/feed/format";
import { retryFailedQueueItem } from "@/modules/feed/jobs.actions";
import { PublishDialog } from "@/modules/feed/publish-dialog";
import {
  rejectTrackAction,
  scheduleTrackAction,
} from "@/modules/feed/publish.actions";
import {
  cancelScheduledUploadAction,
  publishScheduledUploadNowAction,
} from "@/modules/feed/schedule.actions";
import { useStatusMomentClass } from "@/modules/feed/status-moments";
import { TrackStatusBadge } from "@/modules/feed/status-presentation";
import {
  ComposingEqualizer,
  PlaybackWaveform,
  useAudioPreview,
  useWaveformPeaks,
} from "@/modules/feed/track-waveform";
import { useFeedAction } from "@/modules/feed/use-feed-action";

export function TrackCard({
  channelTitle,
  publishDefaults,
  track,
}: {
  channelTitle: string | null;
  publishDefaults: FeedPublishDefaults;
  track: FeedTrack;
}) {
  const { pending, run } = useFeedAction();
  const [editing, setEditing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const preview = useAudioPreview(track.audioUrl);
  const peaks = useWaveformPeaks(preview.src);
  const momentClass = useStatusMomentClass(track.status);

  return (
    <div
      className={cn(
        "px-5 py-3.5 transition-colors hover:bg-panel-soft/60",
        momentClass,
      )}
      data-testid="track-card"
    >
      <div className="flex items-center gap-4">
        <CoverThumb
          composing={track.status === "generating"}
          coverUrl={track.coverUrl}
          title={track.title}
        />
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
          {track.audioUrl || preview.active ? (
            <AudioPlayButton
              onToggle={preview.toggle}
              playing={preview.playing}
            />
          ) : null}
          <PrimaryTrackAction
            onPublish={() => setPublishing(true)}
            pending={pending}
            run={run}
            track={track}
          />
          <TrackMoreMenu
            pending={pending}
            run={run}
            setEditing={setEditing}
            setScheduling={setScheduling}
            track={track}
          />
        </div>
      </div>

      {preview.active ? (
        <Reveal className="mt-3">
          <PlaybackWaveform
            peaks={peaks}
            playing={preview.playing}
            progress={preview.progress}
          />
        </Reveal>
      ) : null}

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

      {track.status === "generating" ? (
        <ComposingNameField track={track} />
      ) : null}

      {editing ? (
        <EditDetailsForm onDone={() => setEditing(false)} track={track} />
      ) : null}

      {publishing ? (
        <PublishDialog
          defaults={publishDefaults}
          onOpenChange={setPublishing}
          open={publishing}
          track={track}
        />
      ) : null}

      <ScheduleDialog
        onOpenChange={setScheduling}
        open={scheduling}
        trackId={track.id}
      />
    </div>
  );
}

function PrimaryTrackAction({
  onPublish,
  pending,
  run,
  track,
}: {
  onPublish: () => void;
  pending: boolean;
  run: ReturnType<typeof useFeedAction>["run"];
  track: FeedTrack;
}) {
  if (track.status === "preview_ready") {
    return (
      <Button
        data-testid="publish-now"
        disabled={pending}
        onClick={onPublish}
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
        onClick={() => {
          const target = track.retryTarget;

          if (!target) {
            return;
          }

          run(
            retryFailedQueueItem,
            { id: target.id, type: target.type },
            { optimistic: retryTrackOptimism(track.id, target.type) },
          );
        }}
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
              onSelect={() =>
                run(
                  rejectTrackAction,
                  { trackId: track.id },
                  { optimistic: discardTrackOptimism(track.id) },
                )
              }
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
                run(
                  publishScheduledUploadNowAction,
                  { uploadId: track.uploadId ?? "" },
                  { optimistic: publishScheduledEarlyOptimism(track.id) },
                )
              }
            >
              <ExternalLink className="size-4" />
              Publish early
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="cancel-schedule"
              onSelect={() =>
                run(
                  cancelScheduledUploadAction,
                  { uploadId: track.uploadId ?? "" },
                  { optimistic: cancelScheduleOptimism(track.id) },
                )
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
          onClick={() => {
            run(
              updateTrackDetailsAction,
              { description, tags, title, trackId: track.id },
              {
                optimistic: editTrackDetailsOptimism(track.id, {
                  description,
                  tags,
                  title,
                }),
              },
            );
            // Optimistic-first: the card already shows the new details.
            onDone();
          }}
          size="sm"
        >
          Save
        </Button>
      </div>
    </div>
  );
}

/**
 * Composing tracks show an inline name field so the wait is useful — the
 * title lands on the track (and later the YouTube upload) via the normal
 * details action.
 */
function ComposingNameField({ track }: { track: FeedTrack }) {
  const { pending, run } = useFeedAction();
  const [title, setTitle] = useState(track.title);
  const dirty = title.trim() !== track.title && title.trim().length > 0;

  function save() {
    if (!dirty || pending) {
      return;
    }

    run(
      updateTrackDetailsAction,
      {
        description: track.description ?? "",
        tags: track.tags.join(","),
        title: title.trim(),
        trackId: track.id,
      },
      {
        optimistic: editTrackDetailsOptimism(track.id, {
          description: track.description ?? "",
          tags: track.tags.join(","),
          title: title.trim(),
        }),
      },
    );
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <Input
        aria-label="Name this track"
        className="h-8 max-w-xs text-sm"
        data-testid="composing-name-input"
        maxLength={100}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            save();
          }
        }}
        placeholder="Name this track while it composes…"
        value={title}
      />
      {dirty ? (
        <Button
          data-testid="composing-name-save"
          disabled={pending}
          onClick={save}
          size="sm"
          variant="outline"
        >
          Save
        </Button>
      ) : null}
    </div>
  );
}

function isFutureDate(date: Date) {
  return date.getTime() > Date.now();
}

const SCHEDULE_PRESETS: Array<{ label: string; at: () => Date }> = [
  {
    at: () => {
      const date = new Date();

      date.setDate(date.getDate() + 1);
      date.setHours(18, 0, 0, 0);

      return date;
    },
    label: "Tomorrow 18:00",
  },
  {
    at: () => {
      const date = new Date();
      const daysUntilSaturday = (6 - date.getDay() + 7) % 7 || 7;

      date.setDate(date.getDate() + daysUntilSaturday);
      date.setHours(12, 0, 0, 0);

      return date;
    },
    label: "Saturday 12:00",
  },
  {
    at: () => {
      const date = new Date();

      date.setDate(date.getDate() + 7);
      date.setHours(18, 0, 0, 0);

      return date;
    },
    label: "In a week",
  },
];

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
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [time, setTime] = useState("18:00");
  const [today] = useState(() => {
    const date = new Date();

    date.setHours(0, 0, 0, 0);

    return date;
  });

  function composeScheduledDate(): Date | null {
    if (!selectedDay) {
      return null;
    }

    const [hours = 0, minutes = 0] = time.split(":").map(Number);
    const date = new Date(selectedDay);

    date.setHours(hours, minutes, 0, 0);

    return date;
  }

  function confirm(date: Date | null) {
    if (!date || !Number.isFinite(date.getTime())) {
      toast.error("Pick a date and time first.");

      return;
    }

    if (!isFutureDate(date)) {
      toast.error("Pick a time in the future");

      return;
    }

    const scheduledIso = date.toISOString();

    run(
      scheduleTrackAction,
      { scheduled_at: scheduledIso, trackId },
      { optimistic: scheduleTrackOptimism(trackId, scheduledIso) },
    );
    // Optimistic-first: the card already shows the schedule.
    onOpenChange(false);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-sm" data-testid="schedule-dialog">
        <DialogHeader>
          <DialogTitle>Schedule publishing</DialogTitle>
          <DialogDescription>
            We&apos;ll publish the video to YouTube at this time.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {SCHEDULE_PRESETS.map((preset) => (
            <button
              className="rounded-full border border-line bg-panel/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              data-testid="schedule-preset"
              disabled={pending}
              key={preset.label}
              onClick={() => confirm(preset.at())}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="rounded-md border border-border">
          <Calendar
            disabled={{ before: today }}
            mode="single"
            onSelect={setSelectedDay}
            selected={selectedDay}
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          Time
          <Input
            aria-label="Schedule time"
            className="h-9 w-28"
            data-testid="schedule-input"
            onChange={(event) => setTime(event.target.value)}
            type="time"
            value={time}
          />
        </label>
        <DialogFooter>
          <Button
            data-testid="schedule-confirm"
            disabled={pending || !selectedDay}
            onClick={() => confirm(composeScheduledDate())}
          >
            <CalendarClock className="size-4" />
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AudioPlayButton({
  onToggle,
  playing,
}: {
  onToggle: () => void;
  playing: boolean;
}) {
  return (
    <Button
      aria-label={playing ? "Pause preview" : "Play preview"}
      className={cn(
        "flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary transition-colors hover:bg-primary/25",
        playing && "bg-primary/25",
      )}
      data-testid="play-track"
      onClick={onToggle}
      size="icon"
      variant="ghost"
    >
      {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
    </Button>
  );
}

function CoverThumb({
  composing,
  coverUrl,
  title,
}: {
  composing: boolean;
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
      {composing ? <ComposingEqualizer /> : <Music2 className="size-4" />}
    </span>
  );
}
