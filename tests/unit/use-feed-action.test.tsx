import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { patchFeedTrack } from "@/modules/feed/feed-optimism";
import type { FeedData } from "@/modules/feed/feed.types";
import { useFeedAction } from "@/modules/feed/use-feed-action";

vi.mock("@/components/ui/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const { toast } = await import("@/components/ui/toast");

function buildFeed(): FeedData {
  return {
    connections: {
      channelTitle: null,
      sunoConnected: true,
      youtubeConnected: true,
    },
    groups: [
      {
        createdAt: "2026-07-04T10:00:00.000Z",
        failureReason: null,
        id: "group-1",
        prompt: "Lo-fi study beat",
        status: "completed",
        trackCount: 1,
        tracks: [
          {
            audioUrl: null,
            coverUrl: null,
            description: null,
            durationSeconds: null,
            failureReason: null,
            id: "track-1",
            retryTarget: null,
            scheduledAt: null,
            status: "preview_ready",
            tags: [],
            title: "Midnight drive",
            uploadId: null,
            youtubeVideoId: null,
          },
        ],
      },
    ],
    hasActiveWork: false,
    usage: { limit: 10, plan: "trial", used: 1 },
    user: { displayName: "P", email: "p@example.com", initials: "P" },
  };
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  queryClient.setQueryData(["feed"], buildFeed());

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useFeedAction(), { wrapper });

  return { queryClient, result };
}

function feedTrackStatus(queryClient: QueryClient): string {
  const feed = queryClient.getQueryData<FeedData>(["feed"]);

  return feed?.groups[0]?.tracks[0]?.status ?? "missing";
}

describe("useFeedAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies the optimistic update before the server responds", async () => {
    const { queryClient, result } = setup();
    let resolveAction!: (value: { message: string; ok: boolean }) => void;
    const action = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      }),
    );

    act(() => {
      result.current.run(
        action,
        { trackId: "track-1" },
        { optimistic: patchFeedTrack("track-1", { status: "rendering" }) },
      );
    });

    expect(feedTrackStatus(queryClient)).toBe("rendering");

    resolveAction({ message: "Queued.", ok: true });

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Queued."));
  });

  it("sends the entries as FormData and reports success", async () => {
    const { result } = setup();
    const action = vi.fn().mockResolvedValue({ message: "Done.", ok: true });
    const onSuccess = vi.fn();

    act(() => {
      result.current.run(action, { trackId: "track-1" }, { onSuccess });
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());

    const formData = action.mock.calls[0][0] as FormData;

    expect(formData.get("trackId")).toBe("track-1");
    expect(toast.success).toHaveBeenCalledWith("Done.");
  });

  it("rolls the optimistic update back when the action fails", async () => {
    const { queryClient, result } = setup();
    const action = vi.fn().mockResolvedValue({ message: "Nope.", ok: false });

    act(() => {
      result.current.run(
        action,
        { trackId: "track-1" },
        { optimistic: patchFeedTrack("track-1", { status: "rendering" }) },
      );
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Nope."));

    expect(feedTrackStatus(queryClient)).toBe("preview_ready");
  });

  it("rolls back and shows a generic error when the action throws", async () => {
    const { queryClient, result } = setup();
    const action = vi.fn().mockRejectedValue(new Error("network"));

    act(() => {
      result.current.run(
        action,
        { trackId: "track-1" },
        { optimistic: patchFeedTrack("track-1", { status: "rendering" }) },
      );
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalled());

    expect(feedTrackStatus(queryClient)).toBe("preview_ready");
  });
});
