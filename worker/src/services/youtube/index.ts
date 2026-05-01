import { google } from "googleapis";
import { NonRetryableJobError } from "../../queue/retry-policy";
import type { SecretsService } from "../../../../src/server/services/secrets.service";
import { createYoutubeUploadAdapter } from "../../../../src/server/services/youtube/youtube-upload-adapter";

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

export function createYoutubeService(input: {
  googleClientId: string;
  googleClientSecret: string;
  secrets: SecretsService;
}): YoutubeService {
  return {
    async uploadVideo(request) {
      const accessToken = input.secrets.decrypt(request.encryptedAccessToken);
      const refreshToken = input.secrets.decrypt(request.encryptedRefreshToken);
      const oauth = new google.auth.OAuth2(
        input.googleClientId,
        input.googleClientSecret,
      );

      oauth.setCredentials({
        access_token: accessToken,
        expiry_date: request.tokenExpiresAt
          ? new Date(request.tokenExpiresAt).getTime()
          : undefined,
        refresh_token: refreshToken,
      });

      const adapter = createYoutubeUploadAdapter({
        createYoutubeClient: () =>
          google.youtube({ auth: oauth, version: "v3" }) as Parameters<
            typeof createYoutubeUploadAdapter
          >[0]["createYoutubeClient"] extends () => infer Client
            ? Client
            : never,
      });

      try {
        if (request.youtubeChannelId) {
          const youtube = google.youtube({ auth: oauth, version: "v3" });
          const channels = await youtube.channels.list({
            mine: true,
            part: ["id"],
          });
          const canUploadToChannel = (channels.data.items ?? []).some(
            (channel) => channel.id === request.youtubeChannelId,
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
