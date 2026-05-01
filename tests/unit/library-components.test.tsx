import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  LibraryToolbar,
  LibraryTrackCard,
} from "@/modules/library/library-components";
import type {
  LibraryFilters,
  LibraryScreenData,
  LibraryTrack,
} from "@/modules/library/library.types";

describe("library components", () => {
  it("renders a premium track card with metadata, status, channel, and actions", () => {
    render(<LibraryTrackCard index={0} track={makeTrack()} />);

    const card = screen.getByTestId("track-card");

    expect(within(card).getByText("Neon Skyline")).toBeInTheDocument();
    expect(within(card).getByText("Approved")).toBeInTheDocument();
    expect(within(card).getByText("Alex M. Synthwave")).toBeInTheDocument();
    expect(within(card).getByText("2:45")).toBeInTheDocument();
    expect(
      within(card).getByRole("link", { name: /preview/i }),
    ).toHaveAttribute("href", "/dashboard/tracks/track-id");
    expect(screen.getByTestId("generate-similar-action")).toHaveAttribute(
      "href",
      expect.stringContaining("/dashboard/generate?"),
    );
  });

  it("renders search, filter selects, and view toggle controls", () => {
    const filters: LibraryFilters = {
      channel: "all",
      date: "all",
      mood: "all",
      query: "neon",
      status: "approved",
      view: "card",
    };

    render(<LibraryToolbar data={makeData()} filters={filters} />);

    expect(screen.getByPlaceholderText("Search tracks...")).toHaveValue("neon");
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue(
      "approved",
    );
    expect(screen.getByRole("combobox", { name: "Mood" })).toHaveValue("all");
    expect(screen.getByRole("link", { name: /card/i })).toHaveAttribute(
      "href",
      expect.stringContaining("q=neon"),
    );
    expect(screen.getByRole("link", { name: /list/i })).toHaveAttribute(
      "href",
      expect.stringContaining("view=list"),
    );
  });
});

function makeTrack(): LibraryTrack {
  return {
    canPublish: true,
    channel: {
      handle: "@alexmsynthwave",
      id: "channel-id",
      thumbnailUrl: null,
      title: "Alex M. Synthwave",
    },
    coverUrl: null,
    createdAt: "2026-05-01T10:00:00.000Z",
    durationLabel: "2:45",
    durationSeconds: 165,
    failureReason: null,
    generationId: "generation-id",
    imageAssetId: "image-id",
    mood: "retro",
    prompt: "synthwave skyline",
    status: "approved",
    statusLabel: "Approved",
    statusTone: "violet",
    style: "synthwave",
    tags: ["synthwave", "retro", "80s"],
    title: "Neon Skyline",
    trackId: "track-id",
    uploadStatus: null,
  };
}

function makeData(): LibraryScreenData {
  return {
    channels: [
      {
        handle: "@alexmsynthwave",
        id: "channel-id",
        thumbnailUrl: null,
        title: "Alex M. Synthwave",
      },
    ],
    counts: {
      all: 24,
      filtered: 8,
    },
    filters: {
      channels: [
        { label: "All", value: "all" },
        { label: "Alex M. Synthwave", value: "channel-id" },
      ],
      moods: [
        { label: "All", value: "all" },
        { label: "retro", value: "retro" },
      ],
      statuses: [
        { label: "All", value: "all" },
        { label: "Approved", value: "approved" },
      ],
    },
    isEmpty: false,
    page: {
      current: 1,
      end: 8,
      hasNext: true,
      hasPrevious: false,
      pageSize: 8,
      start: 1,
      totalPages: 3,
    },
    tracks: [makeTrack()],
    workspaceId: "workspace-id",
  };
}
