import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { signOut } from "@/app/auth/actions";
import { SingleWindow } from "@/modules/feed/single-window";
import type { FeedData } from "@/modules/feed/feed.types";

vi.mock("@/app/auth/actions", () => ({
  signOut: vi.fn(async () => undefined),
}));

describe("SingleWindow account menu", () => {
  it("submits the sign-out action from the account menu", async () => {
    renderWithQueryClient(<SingleWindow initialFeed={makeFeedData()} />);

    fireEvent.pointerDown(screen.getByTestId("account-menu-trigger"));
    const signOutItem = await screen.findByTestId("sign-out");

    expect(signOutItem.closest("form")).toBeNull();

    fireEvent.click(signOutItem);

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps the docked prompt wrapper transparent when the feed has history", () => {
    renderWithQueryClient(
      <SingleWindow
        initialFeed={makeFeedData({
          groups: [
            {
              createdAt: "2026-07-04T04:17:00.000Z",
              failureReason: null,
              id: "feed-group-1",
              prompt: "Dark cinematic trap",
              status: "completed",
              trackCount: 1,
              tracks: [],
            },
          ],
        })}
      />,
    );

    const promptSection = screen.getByTestId("prompt-input").closest("section");

    expect(promptSection).not.toHaveClass("bg-background/70");
    expect(promptSection).not.toHaveClass("backdrop-blur-md");
  });
});

function renderWithQueryClient(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

function makeFeedData(overrides: Partial<FeedData> = {}): FeedData {
  return {
    connections: {
      channelTitle: "Bussin Beats",
      sunoConnected: true,
      youtubeConnected: true,
    },
    groups: [],
    hasActiveWork: false,
    publishDefaults: {
      descriptionTemplate: null,
      privacyStatus: "private",
      titleTemplate: null,
    },
    usage: {
      limit: 10,
      plan: "trial",
      used: 2,
    },
    user: {
      displayName: "Producer One",
      email: "producer@example.com",
      initials: "PO",
    },
    ...overrides,
  };
}
