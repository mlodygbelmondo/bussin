import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  MetadataPreview,
  TrackAudioPlayer,
} from "@/modules/tracks/track-preview-components";
import type { TrackPreviewData } from "@/modules/tracks/track-preview.types";

describe("track preview components", () => {
  it("renders the audio player with progress and accessible playback control", () => {
    render(
      <TrackAudioPlayer
        audioUrl="https://audio.example.test/neon.mp3"
        durationSeconds={165}
        title="Neon Skyline"
      />,
    );

    expect(screen.getByTestId("track-audio-player")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /play preview/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByText("2:45")).toBeInTheDocument();
  });

  it("renders metadata, tags, cover preview, and target channel", () => {
    render(<MetadataPreview data={makePreviewData()} />);

    expect(screen.getByTestId("metadata-preview")).toBeInTheDocument();
    expect(screen.getByText("Neon Skyline")).toBeInTheDocument();
    expect(screen.getByText(/late-night drives/i)).toBeInTheDocument();
    expect(screen.getByText("synthwave")).toBeInTheDocument();
    expect(screen.getByText("Alex M. Synthwave")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /neon skyline cover/i }),
    ).toBeInTheDocument();
  });
});

function makePreviewData(): TrackPreviewData {
  return {
    audioUrl: "https://audio.example.test/neon.mp3",
    channel: {
      handle: "@alexmsynthwave",
      id: "channel-id",
      thumbnailUrl: null,
      title: "Alex M. Synthwave",
    },
    coverUrl: null,
    createdAt: "2026-05-01T10:00:00.000Z",
    description:
      "Immerse yourself in the neon-lit world of late-night drives and retro futures.",
    durationSeconds: 165,
    failureReason: null,
    generation: {
      finalPrompt: "synthwave, retro 80s, driving bassline",
      id: "generation-id",
      mood: "night drive",
      publishMode: "draft",
      scheduledAt: null,
      style: "Synthwave",
    },
    imageAssetId: null,
    imageMeta: null,
    mood: "night drive",
    render: null,
    status: "preview_ready",
    style: "Synthwave",
    tags: ["synthwave", "retrowave", "80s music"],
    title: "Neon Skyline",
    trackId: "track-id",
    trackStatus: "preview_ready",
    upload: null,
    workspaceId: "workspace-id",
  };
}
