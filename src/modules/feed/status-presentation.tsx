import { CalendarClock, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/modules/feed/format";
import type { FeedJobGroup, FeedTrack } from "@/modules/feed/feed.types";

export type StatusPresentation = {
  label: string;
  variant: React.ComponentProps<typeof Badge>["variant"];
};

export function TrackStatusBadge({ track }: { track: FeedTrack }) {
  const status = getTrackStatusPresentation({
    scheduledAt: track.scheduledAt,
    status: track.status,
  });

  switch (track.status) {
    case "generating":
    case "rendering":
    case "uploading":
      return (
        <Badge variant={status.variant}>
          <Loader2 className="size-3 animate-spin" />
          {status.label}
        </Badge>
      );
    case "scheduled":
      return (
        <Badge variant={status.variant}>
          <CalendarClock className="size-3" />
          {status.label}
        </Badge>
      );
    case "published":
      return (
        <Badge variant={status.variant}>
          <Check className="size-3" />
          {status.label}
        </Badge>
      );
    case "preview_ready":
    case "failed":
    case "discarded":
      return <Badge variant={status.variant}>{status.label}</Badge>;
  }
}

export function getTrackStatusPresentation({
  scheduledAt,
  status,
}: {
  scheduledAt?: string | null;
  status: FeedTrack["status"];
}): StatusPresentation {
  switch (status) {
    case "generating":
      return { label: "Composing…", variant: "secondary" };
    case "preview_ready":
      return { label: "Ready to publish", variant: "info" };
    case "rendering":
      return { label: "Making your video…", variant: "info" };
    case "uploading":
      return { label: "Publishing…", variant: "info" };
    case "scheduled":
      return {
        label: scheduledAt
          ? `Scheduled for ${formatDateTime(scheduledAt)}`
          : "Scheduled",
        variant: "warning",
      };
    case "published":
      return { label: "Live on YouTube", variant: "success" };
    case "failed":
      return { label: "Needs attention", variant: "destructive" };
    case "discarded":
      return { label: "Discarded", variant: "outline" };
  }
}

export function getJobGroupStatusPresentation(
  status: FeedJobGroup["status"],
): StatusPresentation {
  switch (status) {
    case "queued":
      return { label: "Queued", variant: "secondary" };
    case "running":
      return { label: "Generating", variant: "info" };
    case "completed":
      return { label: "Complete", variant: "success" };
    case "failed":
      return { label: "Failed", variant: "destructive" };
    case "cancelled":
      return { label: "Cancelled", variant: "outline" };
  }
}
