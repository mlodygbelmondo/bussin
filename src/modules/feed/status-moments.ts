"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedTrackStatus } from "@/modules/feed/feed.types";

/*
 * Signature moments (design-system → Motion 3): the Studio's budget of four
 * one-shot celebrations. Three live here as status-transition pops on the
 * track card; the fourth (generation in progress) is the composing equalizer
 * in track-waveform.tsx, which runs only while its event is live.
 */

export type TrackStatusMoment = "published" | "ready" | "scheduled";

const MOMENT_CLASS: Record<TrackStatusMoment, string> = {
  published: "track-published-pop",
  ready: "track-ready-pop",
  scheduled: "track-scheduled-pop",
};

/** How long the one-shot class stays applied — matches the CSS durations. */
const MOMENT_DURATION_MS = 900;

/**
 * The moment (if any) a status change should celebrate. Pure so the mapping
 * is unit-testable; `null` means the transition passes silently.
 */
export function resolveStatusMoment(
  previous: FeedTrackStatus,
  next: FeedTrackStatus,
): TrackStatusMoment | null {
  if (previous === next) {
    return null;
  }

  if (previous === "generating" && next === "preview_ready") {
    return "ready";
  }

  if (next === "published") {
    return "published";
  }

  if (next === "scheduled") {
    return "scheduled";
  }

  return null;
}

/**
 * Watches a track's status across renders (poll refreshes and optimistic
 * updates alike) and returns the one-shot animation class to apply, or null.
 * Never fires on mount — only on an observed transition.
 */
export function useStatusMomentClass(status: FeedTrackStatus): string | null {
  const previousStatus = useRef(status);
  const [moment, setMoment] = useState<TrackStatusMoment | null>(null);

  useEffect(() => {
    const nextMoment = resolveStatusMoment(previousStatus.current, status);

    previousStatus.current = status;

    if (!nextMoment) {
      return;
    }

    setMoment(nextMoment);

    const timeout = window.setTimeout(
      () => setMoment(null),
      MOMENT_DURATION_MS,
    );

    return () => window.clearTimeout(timeout);
  }, [status]);

  return moment ? MOMENT_CLASS[moment] : null;
}
