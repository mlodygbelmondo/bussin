import { env } from "@/lib/env";
import {
  createGoogleYoutubeOAuthClient,
  youtubeScopes,
} from "@/server/services/youtube/youtube-oauth.service";

export function createYouTubeOAuthClient() {
  return createGoogleYoutubeOAuthClient({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
  });
}

export { youtubeScopes };
