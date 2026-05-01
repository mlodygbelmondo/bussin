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
      const args = [
        "-y",
        "-loop",
        "1",
        "-i",
        input.imageInput ?? "assets/default-cover.png",
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
