// @vitest-environment node

import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  createFfmpegService,
  type FfmpegProcessAdapter,
} from "../../worker/src/services/ffmpeg";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const trackId = "33333333-3333-4333-8333-333333333333";
const videoRenderId = "44444444-4444-4444-8444-444444444444";

const expectedOutputPath = join(tmpdir(), `${videoRenderId}.mp4`);

function makeAdapter(
  overrides: Partial<FfmpegProcessAdapter> = {},
): FfmpegProcessAdapter {
  return {
    readOutput: vi.fn().mockResolvedValue(new Uint8Array([9, 9, 9])),
    run: vi.fn().mockResolvedValue({ exitCode: 0 }),
    ...overrides,
  };
}

describe("worker FFmpeg service", () => {
  it("renders with a looped cover image and returns the output bytes", async () => {
    const adapter = makeAdapter();
    const service = createFfmpegService({ adapter });

    const result = await service.renderVideo({
      audioInput: "/tmp/audio.mp3",
      imageInput: "/tmp/cover.png",
      trackId,
      videoRenderId,
      workspaceId,
    });

    expect(result).toEqual({ video: new Uint8Array([9, 9, 9]) });
    expect(adapter.run).toHaveBeenCalledWith([
      "-y",
      "-loop",
      "1",
      "-i",
      "/tmp/cover.png",
      "-i",
      "/tmp/audio.mp3",
      "-c:v",
      "libx264",
      "-tune",
      "stillimage",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-pix_fmt",
      "yuv420p",
      "-shortest",
      expectedOutputPath,
    ]);
    expect(adapter.readOutput).toHaveBeenCalledWith(expectedOutputPath);
  });

  it("renders onto the flat dark canvas when no cover image is set", async () => {
    const adapter = makeAdapter();
    const service = createFfmpegService({ adapter });

    await service.renderVideo({
      audioInput: "/tmp/audio.mp3",
      imageInput: null,
      trackId,
      videoRenderId,
      workspaceId,
    });

    const args = vi.mocked(adapter.run).mock.calls[0]?.[0];
    expect(args?.slice(0, 4)).toEqual(["-y", "-f", "lavfi", "-i"]);
    expect(args?.[4]).toBe("color=c=0x121217:s=1920x1080:r=25");
  });

  it("shapes a non-zero exit code into a failure message", async () => {
    const adapter = makeAdapter({
      run: vi.fn().mockResolvedValue({ exitCode: 1 }),
    });
    const service = createFfmpegService({ adapter });

    await expect(
      service.renderVideo({
        audioInput: "/tmp/audio.mp3",
        trackId,
        videoRenderId,
        workspaceId,
      }),
    ).rejects.toThrow("ffmpeg exited with code 1.");
    expect(adapter.readOutput).not.toHaveBeenCalled();
  });

  it("reports an unknown exit code when the process dies without one", async () => {
    const adapter = makeAdapter({
      run: vi.fn().mockResolvedValue({ exitCode: null }),
    });
    const service = createFfmpegService({ adapter });

    await expect(
      service.renderVideo({
        audioInput: "/tmp/audio.mp3",
        trackId,
        videoRenderId,
        workspaceId,
      }),
    ).rejects.toThrow("ffmpeg exited with code unknown.");
  });
});
