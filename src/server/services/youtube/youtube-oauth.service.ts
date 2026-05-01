import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { google } from "googleapis";
import type { Tables, TablesInsert } from "@/lib/database.types";
import type { SecretsService } from "@/server/services/secrets.service";
import { normalizeYoutubeError } from "@/server/services/youtube/youtube.errors";
import type {
  YoutubeChannel,
  YoutubeOAuthClient,
  YoutubeOAuthTokens,
} from "@/server/services/youtube/youtube.types";

export const youtubeScopes = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export type YoutubeConnectionRecord = Partial<Tables<"youtube_connections">> & {
  id: string;
  status: string;
  workspace_id: string;
};

export type YoutubeConnectionRepository = {
  createConnection(
    input: Pick<
      TablesInsert<"youtube_connections">,
      | "encrypted_access_token"
      | "encrypted_refresh_token"
      | "provider_account_email"
      | "scopes"
      | "status"
      | "token_expires_at"
      | "workspace_id"
    >,
  ): Promise<YoutubeConnectionRecord>;
  getDefaultChannelId(workspaceId: string): Promise<string | null>;
  updateConnectionStatus(input: {
    connectionId: string;
    status: "connected" | "disconnected" | "expired" | "error";
    workspaceId: string;
  }): Promise<YoutubeConnectionRecord>;
  upsertChannel(
    input: Pick<
      TablesInsert<"youtube_channels">,
      | "handle"
      | "is_default"
      | "last_sync_at"
      | "status"
      | "thumbnail_url"
      | "title"
      | "workspace_id"
      | "youtube_channel_id"
      | "youtube_connection_id"
    >,
  ): Promise<Partial<Tables<"youtube_channels">>>;
};

type OAuthStatePayload = {
  expiresAt: number;
  nonce: string;
  returnTo?: string;
  userId: string;
  workspaceId: string;
};

export function createYoutubeOAuthService(input: {
  oauthClient: YoutubeOAuthClient;
  repository: YoutubeConnectionRepository;
  secrets: SecretsService;
  stateSecret: string;
}) {
  return {
    createAuthorizationUrl(params: {
      returnTo?: string;
      userId: string;
      workspaceId: string;
    }) {
      const stateToken = createOAuthStateToken(
        {
          expiresAt: Date.now() + 10 * 60 * 1000,
          nonce: randomBytes(16).toString("base64url"),
          returnTo: params.returnTo,
          userId: params.userId,
          workspaceId: params.workspaceId,
        },
        input.stateSecret,
      );

      return {
        stateToken,
        url: input.oauthClient.createAuthUrl({
          scopes: youtubeScopes,
          state: stateToken,
        }),
      };
    },
    async completeOAuth(params: {
      code: string;
      stateToken: string;
      userId: string;
    }) {
      const state = verifyOAuthStateToken(params.stateToken, input.stateSecret);

      if (state.userId !== params.userId || state.expiresAt < Date.now()) {
        throw new Error("Invalid OAuth state.");
      }

      try {
        const tokens = await input.oauthClient.exchangeCodeForTokens(
          params.code,
        );
        const connection = await input.repository.createConnection({
          encrypted_access_token: input.secrets.encrypt(tokens.accessToken),
          encrypted_refresh_token: input.secrets.encrypt(tokens.refreshToken),
          provider_account_email: tokens.providerAccountEmail,
          scopes: tokens.scopes,
          status: "error",
          token_expires_at: tokens.expiryDate
            ? new Date(tokens.expiryDate).toISOString()
            : null,
          workspace_id: state.workspaceId,
        });
        const channels = await input.oauthClient.listChannels(tokens);
        const syncedChannels = await syncYoutubeChannels({
          channels,
          connectionId: connection.id,
          repository: input.repository,
          workspaceId: state.workspaceId,
        });
        const connectedConnection =
          await input.repository.updateConnectionStatus({
            connectionId: connection.id,
            status: "connected",
            workspaceId: state.workspaceId,
          });

        return {
          channels: syncedChannels,
          connection: connectedConnection,
          returnTo: state.returnTo,
        };
      } catch (error) {
        throw normalizeYoutubeError(error);
      }
    },
  };
}

export async function syncYoutubeChannels(input: {
  channels: YoutubeChannel[];
  connectionId: string;
  repository: Pick<
    YoutubeConnectionRepository,
    "getDefaultChannelId" | "upsertChannel"
  >;
  workspaceId: string;
}) {
  const synced = [];
  const now = new Date().toISOString();
  const defaultChannelId = await input.repository.getDefaultChannelId(
    input.workspaceId,
  );

  for (const [index, channel] of input.channels.entries()) {
    synced.push(
      await input.repository.upsertChannel({
        handle: channel.handle,
        is_default: defaultChannelId
          ? channel.youtubeChannelId === defaultChannelId
          : index === 0,
        last_sync_at: now,
        status: "connected",
        thumbnail_url: channel.thumbnailUrl,
        title: channel.title,
        workspace_id: input.workspaceId,
        youtube_channel_id: channel.youtubeChannelId,
        youtube_connection_id: input.connectionId,
      }),
    );
  }

  return synced;
}

export function createOAuthStateToken(
  payload: OAuthStatePayload,
  secret: string,
) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

export function verifyOAuthStateToken(token: string, secret: string) {
  const [body, signature] = token.split(".");

  if (!body || !signature) {
    throw new Error("Invalid OAuth state.");
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(body)
    .digest("base64url");

  if (!safeEqual(signature, expectedSignature)) {
    throw new Error("Invalid OAuth state.");
  }

  try {
    return JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as OAuthStatePayload;
  } catch {
    throw new Error("Invalid OAuth state.");
  }
}

export function maskIntegrationSecret(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  if (value.length <= 8) {
    return "****";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function createGoogleYoutubeOAuthClient(input: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): YoutubeOAuthClient {
  const oauth = new google.auth.OAuth2(
    input.clientId,
    input.clientSecret,
    input.redirectUri,
  );

  return {
    createAuthUrl(params) {
      return oauth.generateAuthUrl({
        access_type: "offline",
        include_granted_scopes: true,
        prompt: "consent",
        scope: params.scopes,
        state: params.state,
      });
    },
    async exchangeCodeForTokens(code): Promise<YoutubeOAuthTokens> {
      const { tokens } = await oauth.getToken(code);
      oauth.setCredentials(tokens);
      const userInfo = await google
        .oauth2({ auth: oauth, version: "v2" })
        .userinfo.get();

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error("Google OAuth response did not include tokens.");
      }

      return {
        accessToken: tokens.access_token,
        expiryDate: tokens.expiry_date,
        providerAccountEmail: userInfo.data.email ?? "",
        refreshToken: tokens.refresh_token,
        scopes: parseScopes(tokens.scope),
      };
    },
    async listChannels(tokens) {
      oauth.setCredentials({
        access_token: tokens.accessToken,
        expiry_date: tokens.expiryDate ?? undefined,
        refresh_token: tokens.refreshToken,
      });

      const response = await google
        .youtube({ auth: oauth, version: "v3" })
        .channels.list({
          mine: true,
          part: ["snippet"],
        });

      return (response.data.items ?? []).map((item) => ({
        handle: item.snippet?.customUrl ?? null,
        thumbnailUrl:
          item.snippet?.thumbnails?.default?.url ??
          item.snippet?.thumbnails?.medium?.url ??
          null,
        title: item.snippet?.title ?? "Untitled YouTube channel",
        youtubeChannelId: item.id ?? "",
      }));
    },
  };
}

function parseScopes(scope: string | null | undefined) {
  if (!scope) {
    return youtubeScopes;
  }

  return scope.split(/\s+/).filter(Boolean);
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
