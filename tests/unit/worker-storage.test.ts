// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkerStorageService } from "../../worker/src/services/storage";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const trackId = "33333333-3333-4333-8333-333333333333";

describe("worker storage audio download", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects non-HTTPS audio URLs before fetching", async () => {
    const fetchImpl = vi.fn();
    const service = createWorkerStorageService(mockSupabase(), {
      fetch: fetchImpl,
      resolveHostname: vi.fn(),
    });

    await expect(
      service.copyAudioFromUrl({
        audioUrl: "http://cdn.example.test/audio.mp3",
        trackId,
        workspaceId,
      }),
    ).rejects.toThrow("Audio URL must use HTTPS.");

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects private resolved audio hosts before fetching", async () => {
    const fetchImpl = vi.fn();
    const service = createWorkerStorageService(mockSupabase(), {
      fetch: fetchImpl,
      resolveHostname: vi.fn().mockResolvedValue(["127.0.0.1"]),
    });

    await expect(
      service.copyAudioFromUrl({
        audioUrl: "https://cdn.example.test/audio.mp3",
        trackId,
        workspaceId,
      }),
    ).rejects.toThrow("Audio URL resolved to a private address.");

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects oversized audio responses using content-length", async () => {
    const upload = vi.fn();
    const service = createWorkerStorageService(mockSupabase({ upload }), {
      fetch: vi.fn().mockResolvedValue(
        new Response(null, {
          headers: {
            "content-length": String(51 * 1024 * 1024),
            "content-type": "audio/mpeg",
          },
          status: 200,
        }),
      ),
      resolveHostname: vi.fn().mockResolvedValue(["93.184.216.34"]),
    });

    await expect(
      service.copyAudioFromUrl({
        audioUrl: "https://cdn.example.test/audio.mp3",
        trackId,
        workspaceId,
      }),
    ).rejects.toThrow("Audio download is larger than 50 MB.");

    expect(upload).not.toHaveBeenCalled();
  });

  it("streams audio uploads with a byte cap", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const service = createWorkerStorageService(mockSupabase({ upload }), {
      fetch: vi.fn().mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-type": "audio/mpeg" },
          status: 200,
        }),
      ),
      resolveHostname: vi.fn().mockResolvedValue(["93.184.216.34"]),
    });

    await expect(
      service.copyAudioFromUrl({
        audioUrl: "https://cdn.example.test/audio.mp3",
        trackId,
        workspaceId,
      }),
    ).resolves.toBe(`${workspaceId}/audio/${trackId}.mp3`);

    expect(upload).toHaveBeenCalledWith(
      `${workspaceId}/audio/${trackId}.mp3`,
      expect.any(Uint8Array),
      { contentType: "audio/mpeg", upsert: true },
    );
  });
});

function mockSupabase({ upload = vi.fn() } = {}) {
  return {
    storage: {
      from: vi.fn().mockReturnValue({
        upload,
      }),
    },
  } as never;
}
