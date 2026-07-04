"use client";

import { Loader2, RotateCcw, X } from "lucide-react";
import { motion } from "motion/react";
import { EASE_OUT, staggerDelay } from "@/components/common/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FeedJobGroup } from "@/modules/feed/feed.types";
import { formatDateTime } from "@/modules/feed/format";
import {
  cancelQueueRequest,
  retryFailedQueueItem,
} from "@/modules/feed/jobs.actions";
import { getJobGroupStatusPresentation } from "@/modules/feed/status-presentation";
import { TrackCard } from "@/modules/feed/track-card";
import { useFeedAction } from "@/modules/feed/use-feed-action";

export function FeedList({
  channelTitle,
  groups,
}: {
  channelTitle: string | null;
  groups: FeedJobGroup[];
}) {
  return (
    <div className="space-y-4 pt-2" data-testid="feed">
      {groups.map((group, index) => (
        <JobGroupCard
          channelTitle={channelTitle}
          group={group}
          index={index}
          key={group.id}
        />
      ))}
    </div>
  );
}

function JobGroupCard({
  channelTitle,
  group,
  index,
}: {
  channelTitle: string | null;
  group: FeedJobGroup;
  index: number;
}) {
  const { pending, run } = useFeedAction();
  const isActive = group.status === "queued" || group.status === "running";
  const groupStatus = getJobGroupStatusPresentation(group.status);

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-line bg-card/80"
      data-testid="job-group"
      initial={{ opacity: 0, y: 8 }}
      transition={{
        delay: staggerDelay(index),
        duration: 0.4,
        ease: EASE_OUT,
      }}
    >
      <header className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <p className="truncate font-medium">{group.prompt}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {formatDateTime(group.createdAt)} · {group.trackCount}{" "}
            {group.trackCount === 1 ? "track" : "tracks"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={groupStatus.variant}>{groupStatus.label}</Badge>
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
        </div>
      </header>
      {isActive &&
      group.tracks.every((track) => track.status === "generating") ? (
        <p
          className="flex items-center gap-2 border-t border-line/60 px-5 py-3 text-sm text-muted-foreground"
          data-testid="loading-state"
        >
          <Loader2 className="size-4 animate-spin text-primary" />
          Creating {group.trackCount}{" "}
          {group.trackCount === 1 ? "track" : "tracks"}… this usually takes a
          minute or two.
        </p>
      ) : null}
      {group.status === "failed" ? (
        <div
          className="mx-5 mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm"
          data-testid="error-state"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">We couldn&apos;t create this one.</p>
              {group.failureReason ? (
                <details className="mt-1 text-muted-foreground">
                  <summary className="cursor-pointer">Details</summary>
                  <p className="mt-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
                    {group.failureReason}
                  </p>
                </details>
              ) : null}
            </div>
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
        </div>
      ) : null}
      {group.tracks.length > 0 ? (
        <div className="divide-y divide-line/60 border-t border-line/60">
          {group.tracks.map((track) => (
            <TrackCard
              channelTitle={channelTitle}
              key={track.id}
              track={track}
            />
          ))}
        </div>
      ) : null}
    </motion.article>
  );
}
