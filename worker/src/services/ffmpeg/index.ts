import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

export type FfmpegService = {
  renderVideo(input: {
    workspaceId: string;
    trackId: string;
    videoRenderId: string;
    audioInput: string;
    imageInput?: string | null;
  }): Promise<{ video: Uint8Array }>;
};

export function createFfmpegService(): FfmpegService {
  return {
    async renderVideo(input) {
      const outputPath = join(tmpdir(), `${input.videoRenderId}.mp4`);
      // Without a cover image, render onto a flat dark canvas (lavfi color
      // source) — there is no bundled default-cover asset to fall back to.
      const imageInputArgs = input.imageInput
        ? ["-loop", "1", "-i", input.imageInput]
        : ["-f", "lavfi", "-i", "color=c=0x121217:s=1920x1080:r=25"];
      const args = [
        "-y",
        ...imageInputArgs,
        "-i",
        input.audioInput,
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
        outputPath,
      ];

      await runFfmpeg(args);

      return { video: await readFile(outputPath) };
    },
  };
}

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const process = spawn("ffmpeg", args, { stdio: "ignore" });

    process.on("error", reject);
    process.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`ffmpeg exited with code ${code ?? "unknown"}.`));
    });
  });
}
