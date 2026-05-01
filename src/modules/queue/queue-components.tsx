import { cn } from "@/lib/utils";
import type { QueueStatus } from "@/modules/queue/queue.types";

const statusStyles: Record<QueueStatus, string> = {
  failed: "border-red-300/20 bg-red-500/14 text-red-300",
  generating: "border-violet-300/25 bg-violet-500/16 text-violet-200",
  polling: "border-blue-300/20 bg-blue-500/14 text-blue-300",
  preview_ready: "border-blue-300/20 bg-blue-500/14 text-blue-300",
  queued: "border-blue-300/20 bg-blue-500/14 text-blue-300",
  rendering: "border-violet-300/25 bg-violet-500/16 text-violet-200",
  uploaded: "border-emerald-300/20 bg-emerald-500/14 text-emerald-300",
  uploading: "border-cyan-300/20 bg-cyan-500/14 text-cyan-200",
};

export function QueueStatusChip({
  label,
  status,
}: {
  label: string;
  status: QueueStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm font-medium",
        statusStyles[status],
      )}
      data-testid={`status-chip-${status}`}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          status === "failed"
            ? "bg-red-400"
            : status === "uploaded"
              ? "bg-emerald-400"
              : status === "preview_ready"
                ? "bg-blue-300"
                : "bg-violet-400",
        )}
      />
      {label}
    </span>
  );
}

export function QueueProgress({
  progress,
  status,
}: {
  progress: number | null;
  status: QueueStatus;
}) {
  if (progress === null) {
    return (
      <div className="flex items-center gap-3" data-testid="queue-progress">
        <div className="bussin-waveform h-7 w-44 opacity-70" />
        <span className="text-xs text-slate-400">0:30</span>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="queue-progress">
      <p className="text-sm text-slate-300">
        {status === "queued"
          ? "Waiting in queue"
          : status === "failed"
            ? `Failed at ${progress}%`
            : `${progress}% complete`}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800/70">
        <div
          className={cn(
            "h-full rounded-full",
            status === "failed"
              ? "bg-red-400"
              : status === "uploaded"
                ? "bg-emerald-400"
                : "bg-gradient-to-r from-violet-500 to-blue-400",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
