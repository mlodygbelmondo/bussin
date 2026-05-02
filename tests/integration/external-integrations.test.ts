// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { createSecretsService } from "@/server/services/secrets.service";
import { createSunoConnectionActions } from "@/modules/integrations/suno/suno-connection.actions";
import { createYoutubeOAuthService } from "@/server/services/youtube/youtube-oauth.service";
import type { YoutubeChannel } from "@/server/services/youtube/youtube.types";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const connectionId = "33333333-3333-4333-8333-333333333333";

describe("Suno connection flow", () => {
  it("saves encrypted secrets and marks a successful connection as connected", async () => {
    const secrets = createSecretsService({
      encryptionKey: "test-key-with-enough-entropy-for-task-five",
    });
    const adapter = {
      createCustomGeneration: vi.fn(),
      getLimits: vi.fn().mockResolvedValue({
        creditsLeft: 42,
        monthlyLimit: null,
        monthlyUsage: null,
      }),
      getTrackById: vi.fn(),
      getTrackStatus: vi.fn(),
      testConnection: vi.fn().mockResolvedValue({
        limits: {
          creditsLeft: 42,
          monthlyLimit: null,
          monthlyUsage: null,
        },
        ok: true,
      }),
    };
    const repository = makeSunoRepository();
    const actions = createSunoConnectionActions({
      adapterFactory: () => adapter,
      repository,
      secrets,
    });

    const result = await actions.saveConnection({
      input: {
        api_url: "https://api.sunoapi.org",
        cookie: "suno-secret-cookie",
        label: "Primary Suno",
      },
      userId,
      workspaceId,
    });

    expect(result.status).toBe("connected");
    expect(repository.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        encrypted_api_url: expect.not.stringContaining("api.sunoapi.org"),
        encrypted_cookie: expect.not.stringContaining("suno-secret-cookie"),
        workspace_id: workspaceId,
      }),
    );
    const saved = vi.mocked(repository.createConnection).mock.calls[0][0];
    expect(secrets.decrypt(saved.encrypted_api_url)).toBe(
      "https://api.sunoapi.org",
    );
    expect(secrets.decrypt(saved.encrypted_cookie)).toBe("suno-secret-cookie");
    expect(repository.updateConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({
          credits_left: 42,
          status: "connected",
        }),
      }),
    );
  });

  it("records a normalized error when Suno test connection fails", async () => {
    const secrets = createSecretsService({
      encryptionKey: "test-key-with-enough-entropy-for-task-five",
    });
    const adapter = {
      createCustomGeneration: vi.fn(),
      getLimits: vi.fn(),
      getTrackById: vi.fn(),
      getTrackStatus: vi.fn(),
      testConnection: vi.fn().mockRejectedValue({ status: 401 }),
    };
    const repository = makeSunoRepository();
    const actions = createSunoConnectionActions({
      adapterFactory: () => adapter,
      repository,
      secrets,
    });

    const result = await actions.saveConnection({
      input: {
        api_url: "https://api.sunoapi.org",
        cookie: "expired-cookie",
      },
      userId,
      workspaceId,
    });

    expect(result.status).toBe("error");
    expect(repository.updateConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({
          last_error: "unauthorized",
          status: "error",
        }),
      }),
    );
  });
});

describe("YouTube OAuth connection flow", () => {
  it("validates state, encrypts tokens, saves connection, and syncs channels", async () => {
    const secrets = createSecretsService({
      encryptionKey: "test-key-with-enough-entropy-for-task-five",
    });
    const channels: YoutubeChannel[] = [
      {
        handle: "@bussin",
        thumbnailUrl: "https://img.youtube.test/thumb.jpg",
        title: "Bussin",
        youtubeChannelId: "UC123",
      },
    ];
    const oauthClient = {
      createAuthUrl: vi.fn().mockReturnValue("https://accounts.google.test/o"),
      exchangeCodeForTokens: vi.fn().mockResolvedValue({
        accessToken: "access-token",
        expiryDate: 1780000000000,
        providerAccountEmail: "creator@example.com",
        refreshToken: "refresh-token",
        scopes: ["https://www.googleapis.com/auth/youtube.upload"],
      }),
      listChannels: vi.fn().mockResolvedValue(channels),
    };
    const repository = makeYoutubeRepository();
    const service = createYoutubeOAuthService({
      oauthClient,
      repository,
      secrets,
      stateSecret: "oauth-state-secret-with-enough-entropy",
    });

    const started = service.createAuthorizationUrl({
      returnTo: "/onboarding",
      userId,
      workspaceId,
    });
    const result = await service.completeOAuth({
      code: "oauth-code",
      stateToken: started.stateToken,
      userId,
    });

    expect(result.connection.status).toBe("connected");
    expect(repository.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        encrypted_access_token: expect.not.stringContaining("access-token"),
        encrypted_refresh_token: expect.not.stringContaining("refresh-token"),
        provider_account_email: "creator@example.com",
        status: "error",
        workspace_id: workspaceId,
      }),
    );
    expect(repository.updateConnectionStatus).toHaveBeenCalledWith({
      connectionId,
      status: "connected",
      workspaceId,
    });
    const saved = vi.mocked(repository.createConnection).mock.calls[0][0];
    expect(secrets.decrypt(saved.encrypted_access_token)).toBe("access-token");
    expect(secrets.decrypt(saved.encrypted_refresh_token)).toBe(
      "refresh-token",
    );
    expect(repository.upsertChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        is_default: true,
        title: "Bussin",
        youtube_channel_id: "UC123",
      }),
    );
  });

  it("preserves an existing default channel during sync", async () => {
    const secrets = createSecretsService({
      encryptionKey: "test-key-with-enough-entropy-for-task-five",
    });
    const oauthClient = {
      createAuthUrl: vi.fn().mockReturnValue("https://accounts.google.test/o"),
      exchangeCodeForTokens: vi.fn().mockResolvedValue({
        accessToken: "access-token",
        expiryDate: 1780000000000,
        providerAccountEmail: "creator@example.com",
        refreshToken: "refresh-token",
        scopes: ["https://www.googleapis.com/auth/youtube.upload"],
      }),
      listChannels: vi.fn().mockResolvedValue([
        {
          handle: "@new",
          thumbnailUrl: null,
          title: "New Channel",
          youtubeChannelId: "UCNEW",
        },
        {
          handle: "@existing",
          thumbnailUrl: null,
          title: "Existing Channel",
          youtubeChannelId: "UCDEFAULT",
        },
      ]),
    };
    const repository = makeYoutubeRepository();
    repository.getDefaultChannelId.mockResolvedValue("UCDEFAULT");
    const service = createYoutubeOAuthService({
      oauthClient,
      repository,
      secrets,
      stateSecret: "oauth-state-secret-with-enough-entropy",
    });

    const started = service.createAuthorizationUrl({
      userId,
      workspaceId,
    });
    await service.completeOAuth({
      code: "oauth-code",
      stateToken: started.stateToken,
      userId,
    });

    expect(repository.upsertChannel).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        is_default: false,
        youtube_channel_id: "UCNEW",
      }),
    );
    expect(repository.upsertChannel).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        is_default: true,
        youtube_channel_id: "UCDEFAULT",
      }),
    );
  });

  it("keeps a new connection in error status when channel sync fails", async () => {
    const service = createYoutubeOAuthService({
      oauthClient: {
        createAuthUrl: vi
          .fn()
          .mockReturnValue("https://accounts.google.test/o"),
        exchangeCodeForTokens: vi.fn().mockResolvedValue({
          accessToken: "access-token",
          expiryDate: 1780000000000,
          providerAccountEmail: "creator@example.com",
          refreshToken: "refresh-token",
          scopes: ["https://www.googleapis.com/auth/youtube.upload"],
        }),
        listChannels: vi.fn().mockRejectedValue(new Error("channels failed")),
      },
      repository: makeYoutubeRepository(),
      secrets: createSecretsService({
        encryptionKey: "test-key-with-enough-entropy-for-task-five",
      }),
      stateSecret: "oauth-state-secret-with-enough-entropy",
    });

    const started = service.createAuthorizationUrl({
      userId,
      workspaceId,
    });

    await expect(
      service.completeOAuth({
        code: "oauth-code",
        stateToken: started.stateToken,
        userId,
      }),
    ).rejects.toMatchObject({ code: "unknown" });
  });

  it("rejects callbacks with mismatched OAuth state", async () => {
    const service = createYoutubeOAuthService({
      oauthClient: {
        createAuthUrl: vi.fn(),
        exchangeCodeForTokens: vi.fn(),
        listChannels: vi.fn(),
      },
      repository: makeYoutubeRepository(),
      secrets: createSecretsService({
        encryptionKey: "test-key-with-enough-entropy-for-task-five",
      }),
      stateSecret: "oauth-state-secret-with-enough-entropy",
    });

    await expect(
      service.completeOAuth({
        code: "oauth-code",
        stateToken: "tampered",
        userId,
      }),
    ).rejects.toThrow(/Invalid OAuth state/i);
  });
});

function makeSunoRepository() {
  return {
    createConnection: vi.fn().mockResolvedValue({
      id: connectionId,
      status: "unknown",
      workspace_id: workspaceId,
    }),
    listConnections: vi.fn().mockResolvedValue([]),
    updateConnection: vi.fn().mockResolvedValue({
      id: connectionId,
      status: "connected",
      workspace_id: workspaceId,
    }),
  };
}

function makeYoutubeRepository() {
  return {
    createConnection: vi.fn().mockResolvedValue({
      id: connectionId,
      status: "error",
      workspace_id: workspaceId,
    }),
    getDefaultChannelId: vi.fn().mockResolvedValue(null),
    listChannels: vi.fn().mockResolvedValue([]),
    setDefaultChannel: vi.fn().mockResolvedValue(undefined),
    updateConnectionStatus: vi.fn().mockResolvedValue({
      id: connectionId,
      status: "connected",
      workspace_id: workspaceId,
    }),
    upsertChannel: vi.fn().mockResolvedValue({
      id: "channel-row-id",
      status: "connected",
      workspace_id: workspaceId,
    }),
  };
}
