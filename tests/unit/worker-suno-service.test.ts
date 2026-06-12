// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { createSecretsService } from "@/server/services/secrets.service";
import type { SunoAdapter } from "@/server/services/suno/suno.types";
import { NonRetryableJobError } from "../../worker/src/queue/retry-policy";
import { createSunoService } from "../../worker/src/services/suno";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const trackId = "33333333-3333-4333-8333-333333333333";
const connectionId = "66666666-6666-4666-8666-666666666666";

const secrets = createSecretsService({
  encryptionKey: "test-key-with-enough-entropy-for-worker",
});

function makeAdapter(overrides: Partial<SunoAdapter> = {}): SunoAdapter {
  return {
    createCustomGeneration: vi
      .fn()
      .mockResolvedValue({ sunoTrackId: "suno-task-1" }),
    getLimits: vi.fn(),
    getTrackById: vi.fn(),
    getTrackStatus: vi.fn().mockResolvedValue({ status: "processing" }),
    testConnection: vi.fn(),
    ...overrides,
  };
}

describe("worker Suno service credential resolution", () => {
  it("generates with the workspace's decrypted Suno credentials", async () => {
    const adapter = makeAdapter();
    const adapterFactory = vi.fn().mockReturnValue(adapter);
    const database = {
      getSunoConnection: vi.fn().mockResolvedValue({
        connectionId,
        encryptedApiUrl: secrets.encrypt("https://api.sunoapi.org"),
        encryptedCookie: secrets.encrypt("workspace-api-key"),
      }),
      markSunoConnectionError: vi.fn(),
    };
    const service = createSunoService({
      adapterFactory,
      database,
      fallbackApiBaseUrl: "https://fallback.sunoapi.org",
      fallbackApiKey: "fallback-key",
      secrets,
    });

    const result = await service.createCustomGeneration({
      prompt: "upbeat synthwave track",
      title: "Launch Loop",
      trackId,
      workspaceId,
    });

    expect(result).toEqual({ sunoTrackId: "suno-task-1" });
    expect(database.getSunoConnection).toHaveBeenCalledWith(workspaceId);
    expect(adapterFactory).toHaveBeenCalledWith({
      apiUrl: "https://api.sunoapi.org",
      credential: "workspace-api-key",
    });
  });

  it("falls back to the env API key only when no connection exists", async () => {
    const adapterFactory = vi.fn().mockReturnValue(makeAdapter());
    const database = {
      getSunoConnection: vi.fn().mockResolvedValue(null),
      markSunoConnectionError: vi.fn(),
    };
    const service = createSunoService({
      adapterFactory,
      database,
      fallbackApiBaseUrl: "https://fallback.sunoapi.org",
      fallbackApiKey: "fallback-key",
      secrets,
    });

    await service.getTrackStatus({
      sunoTrackId: "suno-task-1",
      trackId,
      workspaceId,
    });

    expect(adapterFactory).toHaveBeenCalledWith({
      apiUrl: "https://fallback.sunoapi.org",
      credential: "fallback-key",
    });
  });

  it("fails non-retryably when no connection exists and no fallback is set", async () => {
    const service = createSunoService({
      adapterFactory: vi.fn(),
      database: {
        getSunoConnection: vi.fn().mockResolvedValue(null),
        markSunoConnectionError: vi.fn(),
      },
      fallbackApiBaseUrl: "https://fallback.sunoapi.org",
      secrets,
    });

    await expect(
      service.createCustomGeneration({
        prompt: "upbeat synthwave track",
        title: "Launch Loop",
        trackId,
        workspaceId,
      }),
    ).rejects.toBeInstanceOf(NonRetryableJobError);
  });

  it("marks the connection as errored on unauthorized failures", async () => {
    const adapter = makeAdapter({
      createCustomGeneration: vi.fn().mockRejectedValue({ status: 401 }),
    });
    const database = {
      getSunoConnection: vi.fn().mockResolvedValue({
        connectionId,
        encryptedApiUrl: secrets.encrypt("https://api.sunoapi.org"),
        encryptedCookie: secrets.encrypt("revoked-api-key"),
      }),
      markSunoConnectionError: vi.fn().mockResolvedValue(undefined),
    };
    const service = createSunoService({
      adapterFactory: () => adapter,
      database,
      fallbackApiBaseUrl: "https://fallback.sunoapi.org",
      secrets,
    });

    await expect(
      service.createCustomGeneration({
        prompt: "upbeat synthwave track",
        title: "Launch Loop",
        trackId,
        workspaceId,
      }),
    ).rejects.toBeInstanceOf(NonRetryableJobError);
    expect(database.markSunoConnectionError).toHaveBeenCalledWith({
      connectionId,
      lastError: "unauthorized",
      workspaceId,
    });
  });

  it("fails non-retryably when stored credentials cannot be decrypted", async () => {
    const service = createSunoService({
      adapterFactory: vi.fn(),
      database: {
        getSunoConnection: vi.fn().mockResolvedValue({
          connectionId,
          encryptedApiUrl: "v1:not:real:ciphertext",
          encryptedCookie: "v1:not:real:ciphertext",
        }),
        markSunoConnectionError: vi.fn(),
      },
      fallbackApiBaseUrl: "https://fallback.sunoapi.org",
      secrets,
    });

    await expect(
      service.getTrackStatus({
        sunoTrackId: "suno-task-1",
        trackId,
        workspaceId,
      }),
    ).rejects.toBeInstanceOf(NonRetryableJobError);
  });
});
