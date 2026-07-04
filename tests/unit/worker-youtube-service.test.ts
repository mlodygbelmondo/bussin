// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { createSecretsService } from "@/server/services/secrets.service";
import { NonRetryableJobError } from "../../worker/src/queue/retry-policy";
import {
  createYoutubeService,
  type YoutubeWorkerAdapter,
} from "../../worker/src/services/youtube";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const channelId = "UCworkspacechannel";

const secrets = createSecretsService({
  encryptionKey: "test-key-with-enough-entropy-for-worker",
});

function makeAdapter(
  overrides: Partial<YoutubeWorkerAdapter> = {},
): YoutubeWorkerAdapter {
  return {
    listOwnedChannelIds: vi.fn().mockResolvedValue([channelId]),
    uploadVideo: vi.fn().mockResolvedValue({ youtubeVideoId: "yt-video-1" }),
    ...overrides,
  };
}

function makeUploadRequest() {
  return {
    description: "A generated instrumental.",
    encryptedAccessToken: secrets.encrypt("access-token"),
    encryptedRefreshToken: secrets.encrypt("refresh-token"),
    privacyStatus: "private" as const,
    tags: ["instrumental"],
    title: "Launch Loop",
    tokenExpiresAt: "2026-07-04T12:00:00.000Z",
    video: new Uint8Array([1, 2, 3]),
    workspaceId,
    youtubeChannelId: channelId,
  };
}

describe("worker YouTube service", () => {
  it("uploads through the adapter after the channel-ownership check passes", async () => {
    const adapter = makeAdapter();
    const adapterFactory = vi.fn().mockReturnValue(adapter);
    const service = createYoutubeService({
      adapterFactory,
      googleClientId: "client-id",
      googleClientSecret: "client-secret",
      secrets,
    });

    const result = await service.uploadVideo(makeUploadRequest());

    expect(result).toEqual({ youtubeVideoId: "yt-video-1" });
    expect(adapterFactory).toHaveBeenCalledWith({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      tokenExpiresAt: "2026-07-04T12:00:00.000Z",
    });
    expect(adapter.listOwnedChannelIds).toHaveBeenCalledOnce();
    expect(adapter.uploadVideo).toHaveBeenCalledWith({
      description: "A generated instrumental.",
      privacyStatus: "private",
      tags: ["instrumental"],
      title: "Launch Loop",
      video: new Uint8Array([1, 2, 3]),
    });
  });

  it("fails non-retryably when the channel is not owned by the credentials", async () => {
    const adapter = makeAdapter({
      listOwnedChannelIds: vi.fn().mockResolvedValue(["UCsomeoneelse"]),
    });
    const service = createYoutubeService({
      adapterFactory: () => adapter,
      googleClientId: "client-id",
      googleClientSecret: "client-secret",
      secrets,
    });

    await expect(service.uploadVideo(makeUploadRequest())).rejects.toThrow(
      NonRetryableJobError,
    );
    expect(adapter.uploadVideo).not.toHaveBeenCalled();
  });

  it("skips the ownership check when no channel id is set", async () => {
    const adapter = makeAdapter();
    const service = createYoutubeService({
      adapterFactory: () => adapter,
      googleClientId: "client-id",
      googleClientSecret: "client-secret",
      secrets,
    });

    await service.uploadVideo({ ...makeUploadRequest(), youtubeChannelId: "" });

    expect(adapter.listOwnedChannelIds).not.toHaveBeenCalled();
    expect(adapter.uploadVideo).toHaveBeenCalledOnce();
  });

  it("rethrows adapter errors and wraps non-Error throws non-retryably", async () => {
    const adapterError = new Error("quota exceeded");
    const failingService = createYoutubeService({
      adapterFactory: () =>
        makeAdapter({
          uploadVideo: vi.fn().mockRejectedValue(adapterError),
        }),
      googleClientId: "client-id",
      googleClientSecret: "client-secret",
      secrets,
    });

    await expect(failingService.uploadVideo(makeUploadRequest())).rejects.toBe(
      adapterError,
    );

    const nonErrorService = createYoutubeService({
      adapterFactory: () =>
        makeAdapter({
          uploadVideo: vi.fn().mockRejectedValue("boom"),
        }),
      googleClientId: "client-id",
      googleClientSecret: "client-secret",
      secrets,
    });

    await expect(
      nonErrorService.uploadVideo(makeUploadRequest()),
    ).rejects.toThrow(NonRetryableJobError);
  });
});
