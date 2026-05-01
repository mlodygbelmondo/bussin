import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScheduledUploadRow } from "@/modules/scheduled/scheduled-components";
import { formatScheduledDateTime } from "@/modules/scheduled/scheduled.queries";
import type { ScheduledUpload } from "@/modules/scheduled/scheduled.types";

vi.mock("@/modules/scheduled/scheduled.actions", () => ({
  cancelScheduledUploadAction: vi.fn(),
  publishScheduledUploadNowAction: vi.fn(),
  rescheduleUploadAction: vi.fn(),
}));

describe("scheduled upload components", () => {
  it("renders a scheduled upload row with thumbnail, status, channel, and actions", () => {
    render(<ScheduledUploadRow upload={makeUpload()} />);

    expect(screen.getByTestId("scheduled-upload-row")).toBeInTheDocument();
    expect(screen.getByText("Neon Skyline")).toBeInTheDocument();
    expect(screen.getByText("Alex M. Synthwave")).toBeInTheDocument();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reschedule/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("reschedule-datetime")).toBeInTheDocument();
  });

  it("formats schedule datetimes in the selected timezone", () => {
    expect(
      formatScheduledDateTime("2026-06-01T14:30:00.000Z", "America/New_York"),
    ).toContain("10:30 AM");
  });
});

function makeUpload(): ScheduledUpload {
  return {
    channel: {
      handle: "@alexmsynthwave",
      id: "channel-id",
      thumbnailUrl: null,
      title: "Alex M. Synthwave",
    },
    coverUrl: null,
    dayIndex: 1,
    failureReason: null,
    imageAssetId: null,
    platform: "youtube",
    renderStatus: "rendered",
    scheduledAt: "2026-06-01T14:30:00.000Z",
    status: "scheduled",
    statusLabel: "Scheduled",
    statusTone: "violet",
    timeLabel: "10:30 AM",
    timeSlot: 90,
    title: "Neon Skyline",
    trackId: "track-id",
    uploadId: "upload-id",
    videoRenderId: "render-id",
  };
}
