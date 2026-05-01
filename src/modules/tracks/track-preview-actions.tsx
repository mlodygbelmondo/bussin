"use client";

import { useState, useTransition } from "react";
import { CalendarDays, CheckCircle2, Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  approveTrackAction,
  publishTrackNowAction,
  rejectTrackAction,
  scheduleTrackAction,
} from "@/modules/tracks/track-preview.actions";
import type { TrackActionResult } from "@/modules/tracks/track-preview.types";

type TrackPreviewActionsProps = {
  canApprove: boolean;
  canPublish: boolean;
  trackId: string;
};

export function TrackPreviewActions({
  canApprove,
  canPublish,
  trackId,
}: TrackPreviewActionsProps) {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const disabled = isPending;

  function runAction(
    name: string,
    action: (formData: FormData) => Promise<TrackActionResult>,
    extra?: (formData: FormData) => void,
  ) {
    startTransition(async () => {
      setPendingAction(name);
      const formData = new FormData();
      formData.set("trackId", trackId);
      extra?.(formData);

      const result = await action(formData);

      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }

      setPendingAction(null);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        className="h-10 border-red-400/25 bg-red-500/10 px-5 text-red-200 hover:bg-red-500/18"
        data-testid="reject-action"
        disabled={disabled}
        onClick={() => runAction("reject", rejectTrackAction)}
        type="button"
        variant="outline"
      >
        {pendingAction === "reject" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <X className="size-4" />
        )}
        Reject
      </Button>
      <Button
        className="h-10 px-5"
        data-testid="primary-action"
        disabled={disabled || !canApprove}
        onClick={() => runAction("approve", approveTrackAction)}
        type="button"
        variant="outline"
      >
        {pendingAction === "approve" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CheckCircle2 className="size-4" />
        )}
        Approve
      </Button>
      <Button
        className="h-10 px-5"
        data-testid="publish-now-action"
        disabled={disabled || !canPublish}
        onClick={() => runAction("publish", publishTrackNowAction)}
        type="button"
      >
        {pendingAction === "publish" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Publish now
      </Button>
      <ScheduleButton
        disabled={disabled || !canPublish}
        pending={pendingAction === "schedule"}
        run={(scheduledAt) =>
          runAction("schedule", scheduleTrackAction, (formData) => {
            formData.set("scheduled_at", scheduledAt);
          })
        }
      />
    </div>
  );
}

function ScheduleButton({
  disabled,
  pending,
  run,
}: {
  disabled: boolean;
  pending: boolean;
  run: (scheduledAt: string) => void;
}) {
  const [scheduledAt, setScheduledAt] = useState("");

  return (
    <div className="flex h-10 overflow-hidden rounded-lg border border-white/10 bg-slate-950/30">
      <label className="flex items-center gap-2 border-r border-white/10 px-3 text-sm text-slate-300">
        <CalendarDays className="size-4 text-slate-400" />
        <input
          aria-label="Schedule upload time"
          className="w-[168px] bg-transparent text-sm text-slate-200 outline-none [color-scheme:dark]"
          disabled={disabled}
          onChange={(event) => setScheduledAt(event.target.value)}
          type="datetime-local"
          value={scheduledAt}
        />
      </label>
      <button
        className="flex min-w-28 items-center justify-center gap-2 px-4 text-sm font-semibold text-slate-100 hover:bg-violet-500/10 disabled:opacity-50"
        data-testid="schedule-action"
        disabled={disabled || !scheduledAt}
        onClick={() => run(scheduledAt)}
        type="button"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Schedule
      </button>
    </div>
  );
}
