import type { SupabaseClient } from "@supabase/supabase-js";

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
): WorkerStorageService {
  const client = supabase as unknown as SupabaseStorageClient;

  return {
    async copyAudioFromUrl(input) {
      const response = await fetch(input.audioUrl);

      if (!response.ok) {
        throw new Error(`Audio download failed with ${response.status}.`);
      }

      const audio = await response.arrayBuffer();
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
