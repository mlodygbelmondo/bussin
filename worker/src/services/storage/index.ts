import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_AUDIO_DOWNLOAD_BYTES = 50 * 1024 * 1024;

export type WorkerStorageService = {
  copyAudioFromUrl(input: {
    workspaceId: string;
    trackId: string;
    audioUrl: string;
  }): Promise<string>;
  downloadVideo(storagePath: string): Promise<Uint8Array>;
  uploadVideo(input: {
    workspaceId: string;
    trackId: string;
    videoRenderId: string;
    video: Blob | ArrayBuffer | Uint8Array;
  }): Promise<string>;
};

export function createWorkerStorageService(
  supabase: SupabaseClient,
  options?: {
    fetch?: typeof fetch;
    resolveHostname?: (hostname: string) => Promise<string[]>;
  },
): WorkerStorageService {
  const client = supabase as unknown as SupabaseStorageClient;
  const fetchImpl = options?.fetch ?? fetch;
  const resolveHostname =
    options?.resolveHostname ??
    (async (hostname: string) =>
      (await lookup(hostname, { all: true, verbatim: true })).map(
        (entry) => entry.address,
      ));

  return {
    async copyAudioFromUrl(input) {
      const audioUrl = new URL(input.audioUrl);

      await assertSafeAudioUrl(audioUrl, resolveHostname);

      const response = await fetchImpl(audioUrl.toString());

      if (!response.ok) {
        throw new Error(`Audio download failed with ${response.status}.`);
      }

      assertAudioResponse(response);

      const audio = await readResponseWithLimit(
        response,
        MAX_AUDIO_DOWNLOAD_BYTES,
      );
      const storagePath = `${input.workspaceId}/audio/${input.trackId}.mp3`;
      const { error } = await client.storage
        .from("audio-assets")
        .upload(storagePath, audio, {
          contentType: response.headers.get("content-type") ?? "audio/mpeg",
          upsert: true,
        });

      if (error) {
        throw new Error(error.message);
      }

      return storagePath;
    },
    async downloadVideo(storagePath) {
      const { data, error } = await client.storage
        .from("video-renders")
        .download(storagePath);

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Video render download returned no data.");
      }

      return new Uint8Array(await data.arrayBuffer());
    },
    async uploadVideo(input) {
      const storagePath = `${input.workspaceId}/renders/${input.videoRenderId}.mp4`;
      const { error } = await client.storage
        .from("video-renders")
        .upload(storagePath, input.video, {
          contentType: "video/mp4",
          upsert: true,
        });

      if (error) {
        throw new Error(error.message);
      }

      return storagePath;
    },
  };
}

async function assertSafeAudioUrl(
  url: URL,
  resolveHostname: (hostname: string) => Promise<string[]>,
) {
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Audio URL must use HTTPS.");
  }

  const literalIpVersion = isIP(url.hostname);
  const addresses = literalIpVersion
    ? [url.hostname]
    : await resolveHostname(url.hostname);

  if (
    addresses.length === 0 ||
    addresses.some((address) => isPrivateAddress(address))
  ) {
    throw new Error("Audio URL resolved to a private address.");
  }
}

function assertAudioResponse(response: Response) {
  const contentLength = response.headers.get("content-length");

  if (
    contentLength &&
    Number.isFinite(Number(contentLength)) &&
    Number(contentLength) > MAX_AUDIO_DOWNLOAD_BYTES
  ) {
    throw new Error("Audio download is larger than 50 MB.");
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (
    contentType &&
    !contentType.toLowerCase().startsWith("audio/") &&
    !contentType.toLowerCase().startsWith("application/octet-stream")
  ) {
    throw new Error("Audio download returned an unsupported content type.");
  }
}

async function readResponseWithLimit(response: Response, maxBytes: number) {
  if (!response.body) {
    throw new Error("Audio download returned no response body.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new Error("Audio download is larger than 50 MB.");
    }

    chunks.push(value);
  }

  const output = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
}

function isPrivateAddress(address: string) {
  const version = isIP(address);

  if (version === 4) {
    const [first = 0, second = 0, third = 0] = address
      .split(".")
      .map((part) => Number(part));

    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      first >= 224 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 192 && second === 0 && third === 0) ||
      (first === 192 && second === 0 && third === 2) ||
      (first === 198 && (second === 18 || second === 19)) ||
      (first === 198 && second === 51 && third === 100) ||
      (first === 203 && second === 0 && third === 113)
    );
  }

  if (version === 6) {
    const normalized = address.toLowerCase();

    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:") ||
      normalized.startsWith("::ffff:10.") ||
      normalized.startsWith("::ffff:127.") ||
      normalized.startsWith("::ffff:169.254.") ||
      normalized.startsWith("::ffff:192.168.")
    );
  }

  return true;
}

type SupabaseStorageClient = {
  storage: {
    from(bucket: string): {
      download(
        path: string,
      ): Promise<{ data: Blob | null; error: { message: string } | null }>;
      upload(
        path: string,
        body: Blob | ArrayBuffer | Uint8Array,
        options?: { contentType?: string; upsert?: boolean },
      ): Promise<{ error: { message: string } | null }>;
    };
  };
};
