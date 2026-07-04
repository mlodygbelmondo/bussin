import { google } from "googleapis";
import { NonRetryableJobError } from "../../queue/retry-policy";
import type { SecretsService } from "../../../../src/server/services/secrets.service";
import { createYoutubeUploadAdapter } from "../../../../src/server/services/youtube/youtube-upload-adapter";
import type {
  YoutubeUploadInput,
  YoutubeUploadResult,
} from "../../../../src/server/services/youtube/youtube.types";

export type YoutubeService = {
  uploadVideo(input: {
    workspaceId: string;
    youtubeChannelId: string;
    title: string;
    description?: string | null;
    encryptedAccessToken: string;
    encryptedRefreshToken: string;
    tags?: string[] | null;
    privacyStatus: "private" | "unlisted" | "public";
    tokenExpiresAt?: string | null;
    video: Uint8Array;
  }): Promise<{ youtubeVideoId: string }>;
};

export type YoutubeWorkerAdapter = {
  listOwnedChannelIds(): Promise<string[]>;
  uploadVideo(input: YoutubeUploadInput): Promise<YoutubeUploadResult>;
};

type YoutubeWorkerAdapterFactory = (params: {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt?: string | null;
}) => YoutubeWorkerAdapter;

export function createYoutubeService(input: {
  adapterFactory?: YoutubeWorkerAdapterFactory;
  googleClientId: string;
  googleClientSecret: string;
  secrets: SecretsService;
}): YoutubeService {
  const adapterFactory =
    input.adapterFactory ??
    ((params) =>
      createGoogleYoutubeWorkerAdapter({
        accessToken: params.accessToken,
        googleClientId: input.googleClientId,
        googleClientSecret: input.googleClientSecret,
        refreshToken: params.refreshToken,
        tokenExpiresAt: params.tokenExpiresAt,
      }));

  return {
    async uploadVideo(request) {
      const adapter = adapterFactory({
        accessToken: input.secrets.decrypt(request.encryptedAccessToken),
        refreshToken: input.secrets.decrypt(request.encryptedRefreshToken),
        tokenExpiresAt: request.tokenExpiresAt,
      });

      try {
        if (request.youtubeChannelId) {
          const ownedChannelIds = await adapter.listOwnedChannelIds();
          const canUploadToChannel = ownedChannelIds.includes(
            request.youtubeChannelId,
          );

          if (!canUploadToChannel) {
            throw new NonRetryableJobError(
              "Selected YouTube channel is not available for the stored OAuth credentials.",
            );
          }
        }

        return await adapter.uploadVideo({
          description: request.description,
          privacyStatus: request.privacyStatus,
          tags: request.tags,
          title: request.title,
          video: request.video,
        });
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }

        throw new NonRetryableJobError("YouTube upload failed.");
      }
    },
  };
}

type UploadClient = ReturnType<
  Parameters<typeof createYoutubeUploadAdapter>[0]["createYoutubeClient"]
>;

function createGoogleYoutubeWorkerAdapter(params: {
  accessToken: string;
  googleClientId: string;
  googleClientSecret: string;
  refreshToken: string;
  tokenExpiresAt?: string | null;
}): YoutubeWorkerAdapter {
  const oauth = new google.auth.OAuth2(
    params.googleClientId,
    params.googleClientSecret,
  );

  oauth.setCredentials({
    access_token: params.accessToken,
    expiry_date: params.tokenExpiresAt
      ? new Date(params.tokenExpiresAt).getTime()
      : undefined,
    refresh_token: params.refreshToken,
  });

  const uploadAdapter = createYoutubeUploadAdapter({
    createYoutubeClient: () =>
      google.youtube({ auth: oauth, version: "v3" }) as unknown as UploadClient,
  });

  return {
    async listOwnedChannelIds() {
      const youtube = google.youtube({ auth: oauth, version: "v3" });
      const channels = await youtube.channels.list({
        mine: true,
        part: ["id"],
      });

      return (channels.data.items ?? []).flatMap((channel) =>
        channel.id ? [channel.id] : [],
      );
    },
    uploadVideo: (uploadInput) => uploadAdapter.uploadVideo(uploadInput),
  };
}
