import { describe, expect, it } from "vitest";
import {
  cancelGroupOptimism,
  cancelScheduleOptimism,
  discardTrackOptimism,
  editTrackDetailsOptimism,
  patchFeedTrack,
  publishScheduledEarlyOptimism,
  publishTrackOptimism,
  retryGroupOptimism,
  retryTrackOptimism,
  scheduleTrackOptimism,
} from "@/modules/feed/feed-optimism";
import type {
  FeedData,
  FeedJobGroup,
  FeedTrack,
} from "@/modules/feed/feed.types";

function buildTrack(overrides: Partial<FeedTrack> = {}): FeedTrack {
  return {
    audioUrl: "https://example.com/audio.mp3",
    coverUrl: null,
    description: "A track",
    durationSeconds: 180,
    failureReason: null,
    id: "track-1",
    retryTarget: null,
    scheduledAt: null,
    status: "preview_ready",
    tags: ["lofi"],
    title: "Midnight drive",
    uploadId: null,
    youtubeVideoId: null,
    ...overrides,
  };
}

function buildGroup(overrides: Partial<FeedJobGroup> = {}): FeedJobGroup {
  return {
    createdAt: "2026-07-04T10:00:00.000Z",
    failureReason: null,
    id: "group-1",
    prompt: "Lo-fi study beat",
    status: "completed",
    trackCount: 1,
    tracks: [buildTrack()],
    ...overrides,
  };
}

function buildFeed(groups: FeedJobGroup[]): FeedData {
  return {
    connections: {
      channelTitle: "My Channel",
      sunoConnected: true,
      youtubeConnected: true,
    },
    groups,
    hasActiveWork: false,
    publishDefaults: {
      descriptionTemplate: null,
      privacyStatus: "private",
      titleTemplate: null,
    },
    usage: { limit: 10, plan: "trial", used: 2 },
    user: { displayName: "Piotr", email: "p@example.com", initials: "P" },
  };
}

function trackById(feed: FeedData, trackId: string): FeedTrack {
  const track = feed.groups
    .flatMap((group) => group.tracks)
    .find((candidate) => candidate.id === trackId);

  if (!track) {
    throw new Error(`Track ${trackId} not found`);
  }

  return track;
}

describe("patchFeedTrack", () => {
  it("patches only the targeted track and leaves siblings untouched", () => {
    const sibling = buildTrack({ id: "track-2", title: "Other" });
    const feed = buildFeed([buildGroup({ tracks: [buildTrack(), sibling] })]);

    const next = patchFeedTrack("track-1", { title: "Renamed" })(feed);

    expect(trackById(next, "track-1").title).toBe("Renamed");
    expect(trackById(next, "track-2")).toEqual(sibling);
  });

  it("does not mutate the original feed", () => {
    const feed = buildFeed([buildGroup()]);

    patchFeedTrack("track-1", { title: "Renamed" })(feed);

    expect(trackById(feed, "track-1").title).toBe("Midnight drive");
  });

  it("leaves the feed unchanged for an unknown track id", () => {
    const feed = buildFeed([buildGroup()]);

    expect(patchFeedTrack("missing", { title: "x" })(feed).groups).toEqual(
      feed.groups,
    );
  });
});

describe("action optimism", () => {
  it("publish now flips the track to rendering and resumes polling", () => {
    const feed = buildFeed([buildGroup()]);

    const next = publishTrackOptimism("track-1")(feed);

    expect(trackById(next, "track-1").status).toBe("rendering");
    expect(next.hasActiveWork).toBe(true);
  });

  it("discard flips the track to discarded without activating polling", () => {
    const feed = buildFeed([buildGroup()]);

    const next = discardTrackOptimism("track-1")(feed);

    expect(trackById(next, "track-1").status).toBe("discarded");
    expect(next.hasActiveWork).toBe(false);
  });

  it("schedule sets the scheduled time", () => {
    const feed = buildFeed([buildGroup()]);

    const next = scheduleTrackOptimism(
      "track-1",
      "2026-07-05T10:00:00.000Z",
    )(feed);

    expect(trackById(next, "track-1")).toMatchObject({
      scheduledAt: "2026-07-05T10:00:00.000Z",
      status: "scheduled",
    });
  });

  it("cancel schedule returns the track to preview_ready", () => {
    const feed = buildFeed([
      buildGroup({
        tracks: [
          buildTrack({
            scheduledAt: "2026-07-05T10:00:00.000Z",
            status: "scheduled",
          }),
        ],
      }),
    ]);

    const next = cancelScheduleOptimism("track-1")(feed);

    expect(trackById(next, "track-1")).toMatchObject({
      scheduledAt: null,
      status: "preview_ready",
    });
  });

  it("publish early flips a scheduled track to uploading", () => {
    const feed = buildFeed([
      buildGroup({
        tracks: [
          buildTrack({
            scheduledAt: "2026-07-05T10:00:00.000Z",
            status: "scheduled",
          }),
        ],
      }),
    ]);

    const next = publishScheduledEarlyOptimism("track-1")(feed);

    expect(trackById(next, "track-1")).toMatchObject({
      scheduledAt: null,
      status: "uploading",
    });
    expect(next.hasActiveWork).toBe(true);
  });

  it.each([
    ["track", "generating"],
    ["video_render", "rendering"],
    ["youtube_upload", "uploading"],
  ] as const)("retrying a failed %s clears the failure", (target, status) => {
    const feed = buildFeed([
      buildGroup({
        tracks: [
          buildTrack({
            failureReason: "boom",
            retryTarget: { id: "target-1", type: target },
            status: "failed",
          }),
        ],
      }),
    ]);

    const next = retryTrackOptimism("track-1", target)(feed);

    expect(trackById(next, "track-1")).toMatchObject({
      failureReason: null,
      retryTarget: null,
      status,
    });
    expect(next.hasActiveWork).toBe(true);
  });

  it("edit details parses tags like the server action", () => {
    const feed = buildFeed([buildGroup()]);

    const next = editTrackDetailsOptimism("track-1", {
      description: "New description",
      tags: " chill , lofi ,, beats ",
      title: "New title",
    })(feed);

    expect(trackById(next, "track-1")).toMatchObject({
      description: "New description",
      tags: ["chill", "lofi", "beats"],
      title: "New title",
    });
  });

  it("cancelling a group marks it cancelled and fails active tracks", () => {
    const feed = buildFeed([
      buildGroup({
        status: "running",
        tracks: [
          buildTrack({ id: "track-1", status: "generating" }),
          buildTrack({ id: "track-2", status: "preview_ready" }),
        ],
      }),
    ]);

    const next = cancelGroupOptimism("group-1")(feed);

    expect(next.groups[0].status).toBe("cancelled");
    expect(trackById(next, "track-1").status).toBe("failed");
    expect(trackById(next, "track-2").status).toBe("preview_ready");
    expect(next.hasActiveWork).toBe(false);
  });

  it("retrying a group requeues it and resets only failed tracks", () => {
    const feed = buildFeed([
      buildGroup({
        failureReason: "boom",
        status: "failed",
        tracks: [
          buildTrack({
            failureReason: "boom",
            id: "track-1",
            retryTarget: { id: "track-1", type: "track" },
            status: "failed",
          }),
          buildTrack({ id: "track-2", status: "preview_ready" }),
        ],
      }),
    ]);

    const next = retryGroupOptimism("group-1")(feed);

    expect(next.groups[0]).toMatchObject({
      failureReason: null,
      status: "queued",
    });
    expect(trackById(next, "track-1")).toMatchObject({
      failureReason: null,
      status: "generating",
    });
    expect(trackById(next, "track-2").status).toBe("preview_ready");
    expect(next.hasActiveWork).toBe(true);
  });
});
