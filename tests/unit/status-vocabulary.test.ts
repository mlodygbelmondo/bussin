import { describe, expect, it } from "vitest";
import {
  assertStatusTransition,
  canTransition,
  GENERATION_REQUEST_STATUSES,
  isGenerationRequestStatus,
  isTrackStatus,
  isVideoRenderStatus,
  isYoutubeUploadStatus,
  TRACK_STATUSES,
  VIDEO_RENDER_STATUSES,
  YOUTUBE_UPLOAD_STATUSES,
} from "@/server/services/status-transition.service";

describe("status vocabulary", () => {
  it("exposes the full vocabulary per entity", () => {
    expect(GENERATION_REQUEST_STATUSES).toEqual([
      "draft",
      "queued",
      "running",
      "completed",
      "failed",
      "cancelled",
    ]);
    expect(TRACK_STATUSES).toContain("preview_ready");
    expect(VIDEO_RENDER_STATUSES).toContain("rendered");
    expect(YOUTUBE_UPLOAD_STATUSES).toContain("scheduled");
  });

  it("guards accept vocabulary values and reject near-misses", () => {
    expect(isTrackStatus("generating")).toBe(true);
    expect(isTrackStatus("cancelled")).toBe(false);
    expect(isVideoRenderStatus("rendered")).toBe(true);
    expect(isVideoRenderStatus("canceled")).toBe(false);
    expect(isYoutubeUploadStatus("uploading")).toBe(true);
    expect(isYoutubeUploadStatus("uploded")).toBe(false);
    expect(isGenerationRequestStatus("queued")).toBe(true);
    expect(isGenerationRequestStatus("generating")).toBe(false);
  });

  it("every transition target is itself a legal status", () => {
    const entities = [
      ["generation_requests", GENERATION_REQUEST_STATUSES],
      ["tracks", TRACK_STATUSES],
      ["video_renders", VIDEO_RENDER_STATUSES],
      ["youtube_uploads", YOUTUBE_UPLOAD_STATUSES],
    ] as const;

    for (const [entity, statuses] of entities) {
      for (const from of statuses) {
        for (const to of statuses) {
          // canTransition must never throw for vocabulary values; it may
          // only answer yes/no.
          expect(typeof canTransition(entity, from, to)).toBe("boolean");
        }
      }
    }
  });

  it("rejects illegal transitions and allows no-ops", () => {
    expect(canTransition("tracks", "uploaded", "draft")).toBe(false);
    expect(canTransition("tracks", "generating", "preview_ready")).toBe(true);
    expect(() =>
      assertStatusTransition("youtube_uploads", "uploaded", "scheduled"),
    ).toThrow();
    expect(() =>
      assertStatusTransition("youtube_uploads", "uploaded", "uploaded"),
    ).not.toThrow();
  });
});
