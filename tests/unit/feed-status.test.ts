import { describe, expect, it } from "vitest";
import {
  deriveRetryTarget,
  deriveTrackStatus,
} from "@/modules/feed/feed.queries";
import { getTrackStatusPresentation } from "@/modules/feed/status-presentation";

type TrackInput = Parameters<typeof deriveTrackStatus>[0]["track"];
type RenderInput = Parameters<typeof deriveTrackStatus>[0]["render"];
type UploadInput = Parameters<typeof deriveTrackStatus>[0]["upload"];

function track(overrides: Partial<TrackInput> = {}): TrackInput {
  return {
    audio_storage_path: null,
    description: null,
    duration_seconds: null,
    failure_reason: null,
    generation_request_id: "request-1",
    id: "track-1",
    image_asset_id: null,
    source_audio_url: null,
    status: "generating",
    tags: null,
    title: null,
    ...overrides,
  };
}

function render(overrides: Partial<NonNullable<RenderInput>>): RenderInput {
  return {
    created_at: "2026-06-12T10:00:00Z",
    failure_reason: null,
    id: "render-1",
    status: "queued",
    track_id: "track-1",
    ...overrides,
  };
}

function upload(overrides: Partial<NonNullable<UploadInput>>): UploadInput {
  return {
    created_at: "2026-06-12T10:00:00Z",
    failure_reason: null,
    id: "upload-1",
    scheduled_at: null,
    status: "draft",
    track_id: "track-1",
    youtube_video_id: null,
    ...overrides,
  };
}

describe("deriveTrackStatus", () => {
  it("reports generating before any audio exists", () => {
    expect(
      deriveTrackStatus({ render: null, track: track(), upload: null }),
    ).toBe("generating");
  });

  it("reports preview_ready once audio exists", () => {
    expect(
      deriveTrackStatus({
        render: null,
        track: track({ audio_storage_path: "ws/track.mp3" }),
        upload: null,
      }),
    ).toBe("preview_ready");
  });

  it("reports rendering while the render job runs", () => {
    expect(
      deriveTrackStatus({
        render: render({ status: "running" }),
        track: track({ audio_storage_path: "ws/track.mp3" }),
        upload: null,
      }),
    ).toBe("rendering");
  });

  it("reports uploading for a draft upload with a finished render", () => {
    expect(
      deriveTrackStatus({
        render: render({ status: "rendered" }),
        track: track({ audio_storage_path: "ws/track.mp3" }),
        upload: upload({ status: "draft" }),
      }),
    ).toBe("uploading");
  });

  it("reports scheduled for scheduled uploads", () => {
    expect(
      deriveTrackStatus({
        render: render({ status: "rendered" }),
        track: track({ audio_storage_path: "ws/track.mp3" }),
        upload: upload({
          scheduled_at: "2026-06-13T18:00:00Z",
          status: "scheduled",
        }),
      }),
    ).toBe("scheduled");
  });

  it("reports published after upload completes", () => {
    expect(
      deriveTrackStatus({
        render: render({ status: "rendered" }),
        track: track({ audio_storage_path: "ws/track.mp3" }),
        upload: upload({ status: "uploaded", youtube_video_id: "abc" }),
      }),
    ).toBe("published");
  });

  it("prefers failed over scheduled when the upload failed", () => {
    expect(
      deriveTrackStatus({
        render: render({ status: "rendered" }),
        track: track({ audio_storage_path: "ws/track.mp3" }),
        upload: upload({ failure_reason: "Token expired", status: "failed" }),
      }),
    ).toBe("failed");
  });

  it("reports discarded for rejected tracks regardless of pipeline state", () => {
    expect(
      deriveTrackStatus({
        render: render({ status: "failed" }),
        track: track({ status: "rejected" }),
        upload: null,
      }),
    ).toBe("discarded");
  });
});

describe("deriveRetryTarget", () => {
  it("targets the upload when the upload failed", () => {
    expect(
      deriveRetryTarget({
        render: render({ status: "rendered" }),
        track: track(),
        upload: upload({ status: "failed" }),
      }),
    ).toEqual({ id: "upload-1", type: "youtube_upload" });
  });

  it("targets the render when only the render failed", () => {
    expect(
      deriveRetryTarget({
        render: render({ status: "failed" }),
        track: track(),
        upload: null,
      }),
    ).toEqual({ id: "render-1", type: "video_render" });
  });

  it("targets the track when generation failed", () => {
    expect(
      deriveRetryTarget({
        render: null,
        track: track({ status: "failed" }),
        upload: null,
      }),
    ).toEqual({ id: "track-1", type: "track" });
  });

  it("returns null when nothing failed", () => {
    expect(
      deriveRetryTarget({ render: null, track: track(), upload: null }),
    ).toBeNull();
  });
});

describe("getTrackStatusPresentation", () => {
  it("maps feed statuses to friendly labels", () => {
    expect(getTrackStatusPresentation({ status: "generating" }).label).toBe(
      "Composing…",
    );
    expect(getTrackStatusPresentation({ status: "preview_ready" }).label).toBe(
      "Ready to publish",
    );
    expect(getTrackStatusPresentation({ status: "rendering" }).label).toBe(
      "Making your video…",
    );
    expect(getTrackStatusPresentation({ status: "uploading" }).label).toBe(
      "Publishing…",
    );
    expect(getTrackStatusPresentation({ status: "published" }).label).toBe(
      "Live on YouTube",
    );
    expect(getTrackStatusPresentation({ status: "failed" }).label).toBe(
      "Needs attention",
    );
    expect(getTrackStatusPresentation({ status: "discarded" }).label).toBe(
      "Discarded",
    );
  });

  it("includes the scheduled date in scheduled labels", () => {
    expect(
      getTrackStatusPresentation({
        scheduledAt: "2026-06-13T18:00:00Z",
        status: "scheduled",
      }).label,
    ).toContain("Scheduled for");
  });
});
