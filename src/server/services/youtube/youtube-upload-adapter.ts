import { Readable } from "node:stream";
import { z } from "zod";
import {
  normalizeYoutubeError,
  YoutubeIntegrationError,
} from "@/server/services/youtube/youtube.errors";
import type {
  YoutubeUploadAdapter,
  YoutubeUploadInput,
  YoutubeUploadResult,
} from "@/server/services/youtube/youtube.types";

const youtubeUploadInputSchema = z
  .object({
    description: z.string().max(5000).nullish(),
    madeForKids: z.boolean().optional(),
    privacyStatus: z.enum(["private", "unlisted", "public"]),
    publishAt: z.string().datetime().nullish(),
    tags: z.array(z.string().trim().min(1)).max(50).nullish(),
    title: z.string().trim().min(1).max(100),
    video: z.custom<Blob | ArrayBuffer | Uint8Array>(
      (value) =>
        value instanceof Blob ||
        value instanceof ArrayBuffer ||
        value instanceof Uint8Array,
      "Video body is required.",
    ),
  })
  .strict();

export function validateYoutubeUploadInput(input: YoutubeUploadInput) {
  return youtubeUploadInputSchema.parse(input);
}

export function createYoutubeUploadAdapter(input: {
  authClient?: YoutubeAuthClient;
  createYoutubeClient: () => YoutubeClient;
}): YoutubeUploadAdapter {
  return {
    async refreshToken(refreshToken) {
      if (!input.authClient?.refreshToken) {
        throw new YoutubeIntegrationError(
          "expired_token",
          "YouTube auth client cannot refresh tokens.",
        );
      }

      try {
        const tokens = await input.authClient.refreshToken(refreshToken);
        return {
          accessToken: tokens.credentials.access_token,
          expiryDate: tokens.credentials.expiry_date,
        };
      } catch (error) {
        throw normalizeYoutubeError(error);
      }
    },
    async schedulePublish(request) {
      const youtube = input.createYoutubeClient();

      try {
        await youtube.videos.update({
          part: ["status"],
          requestBody: {
            id: request.videoId,
            status: {
              privacyStatus: "private",
              publishAt: request.publishAt,
            },
          },
        });
      } catch (error) {
        throw normalizeYoutubeError(error);
      }
    },
    async setMetadata(request) {
      const youtube = input.createYoutubeClient();

      try {
        await youtube.videos.update({
          part: ["snippet", "status"],
          requestBody: {
            id: request.videoId,
            snippet: {
              description: request.description ?? undefined,
              tags: request.tags ?? undefined,
              title: request.title,
            },
            status: {
              privacyStatus: request.privacyStatus,
            },
          },
        });
      } catch (error) {
        throw normalizeYoutubeError(error);
      }
    },
    async uploadVideo(rawInput): Promise<YoutubeUploadResult> {
      const parsed = validateYoutubeUploadInput(rawInput);
      const youtube = input.createYoutubeClient();

      try {
        const response = await youtube.videos.insert({
          media: {
            body: toReadable(parsed.video),
          },
          part: ["snippet", "status"],
          requestBody: {
            snippet: {
              description: parsed.description ?? undefined,
              tags: parsed.tags ?? undefined,
              title: parsed.title,
            },
            status: {
              privacyStatus: parsed.privacyStatus,
              publishAt: parsed.publishAt ?? undefined,
              selfDeclaredMadeForKids: parsed.madeForKids ?? false,
            },
          },
        });
        const youtubeVideoId = response.data.id;

        if (!youtubeVideoId) {
          throw new YoutubeIntegrationError(
            "upload_failed",
            "YouTube upload response did not include a video id.",
            response,
          );
        }

        return { youtubeVideoId };
      } catch (error) {
        throw normalizeYoutubeError(error);
      }
    },
  };
}

function toReadable(video: Blob | ArrayBuffer | Uint8Array) {
  if (video instanceof Uint8Array) {
    return Readable.from([Buffer.from(video)]);
  }

  if (video instanceof ArrayBuffer) {
    return Readable.from([Buffer.from(video)]);
  }

  return Readable.from(video.stream() as unknown as AsyncIterable<Uint8Array>);
}

type YoutubeClient = {
  videos: {
    insert(
      input: Record<string, unknown>,
    ): Promise<{ data: { id?: string | null } }>;
    update(input: Record<string, unknown>): Promise<unknown>;
  };
};

type YoutubeAuthClient = {
  refreshToken(refreshToken: string): Promise<{
    credentials: {
      access_token: string;
      expiry_date?: number | null;
    };
  }>;
};
