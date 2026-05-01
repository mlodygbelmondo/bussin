import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UploadPerformanceCard } from "@/modules/dashboard/upload-performance-card";
import type { DashboardHomeData } from "@/modules/dashboard/dashboard.types";

const dashboardData = {
  activity: [],
  generatedTotal: 0,
  hasFailures: false,
  isEmpty: false,
  kpis: [],
  planName: "Pro",
  queue: [],
  queueActive: 0,
  queueCapacity: 5,
  quickActions: [],
  sunoCredits: 0,
  sunoLimit: 0,
  sunoResetLabel: "Current billing period",
  topTracks: [],
  uploadPerformance: {
    comments: "128",
    likes: "2.4K",
    listeners: "18.7K",
    totalPlays: "245.6K",
  },
  userDisplayName: "Alex",
  workspaceId: "workspace-1",
} satisfies DashboardHomeData;

describe("UploadPerformanceCard", () => {
  it("renders hourly sample bars for the weekly view", () => {
    render(<UploadPerformanceCard data={dashboardData} />);

    expect(screen.getByTestId("upload-performance-total")).toHaveTextContent(
      "245.6K",
    );
    expect(screen.getAllByTestId("upload-performance-bar")).toHaveLength(28);
    expect(
      screen.getByLabelText(
        "May 6, 2025, 00:00-06:00: 2.8K plays, 1.2K listeners, 22 likes",
      ),
    ).toBeInTheDocument();
  });

  it("updates analytics when the period changes", () => {
    render(<UploadPerformanceCard data={dashboardData} />);

    fireEvent.change(screen.getByTestId("upload-performance-period"), {
      target: { value: "month" },
    });

    expect(screen.getByTestId("upload-performance-total")).toHaveTextContent(
      "541.0K",
    );
    expect(screen.getByText("vs last month")).toBeInTheDocument();
    expect(screen.getAllByTestId("upload-performance-bar")).toHaveLength(16);
    expect(
      screen.getByLabelText(
        "Apr 15-21, 2025, Mon-Tue: 18.2K plays, 7.6K listeners, 146 likes",
      ),
    ).toBeInTheDocument();
  });
});
