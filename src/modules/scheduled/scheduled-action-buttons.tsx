"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CalendarClock, Loader2, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  cancelScheduledUploadAction,
  publishScheduledUploadNowAction,
  rescheduleUploadAction,
} from "@/modules/scheduled/scheduled.actions";
import type { ScheduledUpload } from "@/modules/scheduled/scheduled.types";

export function ScheduledUploadActions({
  upload,
}: {
  upload: ScheduledUpload;
}) {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [minSchedule] = useState(() =>
    toDatetimeLocal(new Date(Date.now() + 5 * 60 * 1000).toISOString()),
  );
  const [scheduledAt, setScheduledAt] = useState(() =>
    toDatetimeLocal(
      upload.scheduledAt ??
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ),
  );
  const [isPending, startTransition] = useTransition();
  const disabled = isPending || upload.status === "uploaded";

  function runAction(kind: "cancel" | "publish" | "reschedule") {
    startTransition(async () => {
      setPendingAction(kind);

      const formData = new FormData();
      formData.set("uploadId", upload.uploadId);

      if (kind === "reschedule") {
        formData.set("scheduled_at", scheduledAt);
      }

      const result =
        kind === "cancel"
          ? await cancelScheduledUploadAction(formData)
          : kind === "publish"
            ? await publishScheduledUploadNowAction(formData)
            : await rescheduleUploadAction(formData);

      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }

      setPendingAction(null);
    });
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
      <label className="sm:col-span-2 xl:col-span-1">
        <span className="sr-only">New schedule time</span>
        <input
          className="h-9 w-full rounded-md border border-white/10 bg-slate-950/30 px-3 text-xs text-slate-200 outline-none focus:border-violet-300/45"
          data-testid="reschedule-datetime"
          disabled={disabled || upload.status === "cancelled"}
          min={minSchedule}
          onChange={(event) => setScheduledAt(event.currentTarget.value)}
          type="datetime-local"
          value={scheduledAt}
        />
      </label>
      <Button
        className="h-9 justify-start px-3 text-violet-100"
        disabled={disabled || upload.status === "cancelled"}
        onClick={() => runAction("reschedule")}
        type="button"
        variant="outline"
      >
        {pendingAction === "reschedule" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CalendarClock className="size-4" />
        )}
        Reschedule
      </Button>
      <Button
        className="h-9 justify-start px-3 text-cyan-100"
        disabled={disabled || upload.status === "cancelled"}
        onClick={() => runAction("publish")}
        type="button"
        variant="outline"
      >
        {pendingAction === "publish" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Publish now
      </Button>
      <Button
        className="h-9 justify-start px-3 text-red-300 hover:text-red-100"
        disabled={disabled || upload.status === "cancelled"}
        onClick={() => runAction("cancel")}
        type="button"
        variant="ghost"
      >
        {pendingAction === "cancel" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <XCircle className="size-4" />
        )}
        Cancel
      </Button>
      {upload.trackId ? (
        <Button
          asChild
          className="h-9 justify-start px-3 text-slate-200"
          variant="ghost"
        >
          <Link href={`/dashboard/tracks/${upload.trackId}`}>Open track</Link>
        </Button>
      ) : null}
    </div>
  );
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);

  return local.toISOString().slice(0, 16);
}
