import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ChannelCard,
  ChannelsGrid,
  SunoStatusCard,
} from "@/modules/channels/channels-components";
import type {
  ChannelCardItem,
  SunoConnectionStatus,
} from "@/modules/channels/channels.types";

vi.mock("@/modules/channels/channels.actions", () => ({
  disconnectYoutubeConnectionAction: vi.fn(),
  setDefaultChannelAction: vi.fn(),
  startChannelsYoutubeOAuthAction: vi.fn(),
  syncYoutubeChannelsAction: vi.fn(),
  testSunoConnectionAction: vi.fn(),
}));

describe("channels components", () => {
  it("renders a connected default YouTube channel card", () => {
    render(<ChannelCard channel={makeChannel({ isDefault: true })} />);

    const card = screen.getByTestId("channel-card");

    expect(within(card).getByText("Alex M. Synthwave")).toBeInTheDocument();
    expect(within(card).getByText("Connected")).toBeInTheDocument();
    expect(within(card).getByText("Default")).toBeInTheDocument();
    expect(within(card).getByText("Default destination")).toBeDisabled();
    expect(within(card).getByText(/@alexmsynthwave/)).toBeInTheDocument();
    expect(within(card).getByText("alexm@suno.com")).toBeInTheDocument();
  });

  it("renders reconnect actions for a disconnected channel", () => {
    render(
      <ChannelCard
        channel={makeChannel({
          isDefault: false,
          status: "disconnected",
          statusLabel: "Disconnected",
          statusTone: "amber",
        })}
      />,
    );

    const card = screen.getByTestId("channel-card");

    expect(
      within(card).getByRole("button", { name: /reconnect/i }),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("button", { name: /remove/i }),
    ).toBeInTheDocument();
  });

  it("renders Suno connection health and usage", () => {
    render(<SunoStatusCard suno={makeSuno()} />);

    const card = screen.getByTestId("suno-card");

    expect(within(card).getByText("Suno connection")).toBeInTheDocument();
    expect(within(card).getByText("Connected")).toBeInTheDocument();
    expect(within(card).getByText("412 / 1,000")).toBeInTheDocument();
    expect(
      within(card).getByRole("button", { name: /test suno connection/i }),
    ).toBeInTheDocument();
  });

  it("renders empty guidance when no channels exist", () => {
    render(<ChannelsGrid channels={[]} planLimitReached={false} />);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("No channels connected yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /connect your first channel/i }),
    ).toBeEnabled();
  });
});

function makeChannel(
  overrides: Partial<ChannelCardItem> = {},
): ChannelCardItem {
  return {
    connectedAccount: "alexm@suno.com",
    handle: "@alexmsynthwave",
    id: "channel-id",
    isDefault: false,
    lastSyncLabel: "Just now",
    status: "connected",
    statusLabel: "Connected",
    statusTone: "emerald",
    subscribersLabel: "12.4K subscribers",
    thumbnailUrl: null,
    title: "Alex M. Synthwave",
    youtubeChannelId: "UC123",
    youtubeConnectionId: "connection-id",
    ...overrides,
  };
}

function makeSuno(): SunoConnectionStatus {
  return {
    checkedLabel: "Checked Just now",
    creditsLabel: "412 / 1,000",
    emailLabel: "Member since May 2, 2025",
    id: "suno-id",
    label: "Suno Account",
    status: "connected",
    statusLabel: "Connected",
    statusTone: "emerald",
  };
}
