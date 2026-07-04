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

export type FfmpegProcessAdapter = {
  run(args: string[]): Promise<{ exitCode: number | null; stderr?: string }>;
  readOutput(outputPath: string): Promise<Uint8Array>;
};

export function createFfmpegService(
  input: {
    adapter?: FfmpegProcessAdapter;
  } = {},
): FfmpegService {
  const adapter = input.adapter ?? createFfmpegProcessAdapter();

  return {
    async renderVideo(request) {
      const outputPath = join(tmpdir(), `${request.videoRenderId}.mp4`);
      // Without a cover image, render onto a flat dark canvas (lavfi color
      // source) — there is no bundled default-cover asset to fall back to.
      const imageInputArgs = request.imageInput
        ? ["-loop", "1", "-i", request.imageInput]
        : ["-f", "lavfi", "-i", "color=c=0x121217:s=1920x1080:r=25"];
      const args = [
        "-y",
        ...imageInputArgs,
        "-i",
        request.audioInput,
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

      const { exitCode, stderr } = await adapter.run(args);

      if (exitCode !== 0) {
        const detail = stderr?.trim().split("\n").at(-1);

        throw new Error(
          `ffmpeg exited with code ${exitCode ?? "unknown"}.${
            detail ? ` ${detail}` : ""
          }`,
        );
      }

      return { video: await adapter.readOutput(outputPath) };
    },
  };
}

function createFfmpegProcessAdapter(): FfmpegProcessAdapter {
  return {
    readOutput: (outputPath) => readFile(outputPath),
    run(args) {
      return new Promise((resolve, reject) => {
        const process = spawn("ffmpeg", args, {
          stdio: ["ignore", "ignore", "pipe"],
        });
        let stderr = "";

        process.stderr?.on("data", (chunk: Buffer) => {
          // Keep only the tail — ffmpeg logs its whole config banner first.
          stderr = (stderr + chunk.toString()).slice(-2000);
        });
        process.on("error", reject);
        process.on("exit", (code) => {
          resolve({ exitCode: code, stderr });
        });
      });
    },
  };
}
