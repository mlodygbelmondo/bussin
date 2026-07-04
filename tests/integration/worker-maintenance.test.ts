// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { startHealthServer } from "../../worker/src/health";
import { runWorkerLoop, type WorkerServices } from "../../worker/src/index";
import { runMaintenanceJob } from "../../worker/src/jobs/maintenance";
import {
  consumeQueue,
  createInMemoryQueueClient,
} from "../../worker/src/queue/queue-client";
import { QUEUE_NAMES } from "../../worker/src/queue/queue-types";
import type { WorkerConfig } from "../../worker/src/config";
import type { WorkerLogger } from "../../worker/src/logger";
import type { WorkerDatabaseService } from "../../worker/src/services/database";
import type { WorkerStorageService } from "../../worker/src/services/storage";
import type { SunoService } from "../../worker/src/services/suno";

const workspaceId = "11111111-1111-4111-8111-111111111111";

describe("worker maintenance jobs", () => {
  it("recovers stale jobs through the recover_stale_jobs RPC", async () => {
    const services = makeServices();
    vi.mocked(services.database.recoverStaleJobs).mockResolvedValue({
      staleRenders: 1,
      staleTracks: 2,
      staleUploads: 0,
    });

    await runMaintenanceJob({ task: "stale-job-recovery" }, services);

    expect(services.database.recoverStaleJobs).toHaveBeenCalledWith(60);
    expect(services.logger.info).toHaveBeenCalledWith(
      "Stale jobs recovered.",
      expect.objectContaining({ staleRenders: 1, staleTracks: 2 }),
    );
  });

  it("syncs Suno limits for every connected workspace", async () => {
    const services = makeServices();
    vi.mocked(services.database.listConnectedSunoConnections).mockResolvedValue(
      [{ connectionId: "conn-1", workspaceId }],
    );
    vi.mocked(services.suno.getLimits).mockResolvedValue({
      creditsLeft: 120,
      monthlyLimit: 500,
      monthlyUsage: 380,
    });

    await runMaintenanceJob({ task: "sync-suno-limits" }, services);

    expect(services.suno.getLimits).toHaveBeenCalledWith({ workspaceId });
    expect(services.database.updateSunoConnectionLimits).toHaveBeenCalledWith({
      connectionId: "conn-1",
      creditsLeft: 120,
      monthlyLimit: 500,
      monthlyUsage: 380,
      workspaceId,
    });
  });

  it("keeps syncing other workspaces when one connection fails", async () => {
    const services = makeServices();
    vi.mocked(services.database.listConnectedSunoConnections).mockResolvedValue(
      [
        { connectionId: "conn-broken", workspaceId },
        { connectionId: "conn-ok", workspaceId },
      ],
    );
    vi.mocked(services.suno.getLimits)
      .mockRejectedValueOnce(new Error("expired cookie"))
      .mockResolvedValueOnce({
        creditsLeft: 10,
        monthlyLimit: 100,
        monthlyUsage: 90,
      });

    await runMaintenanceJob({ task: "sync-suno-limits" }, services);

    expect(services.database.updateSunoConnectionLimits).toHaveBeenCalledTimes(
      1,
    );
    expect(services.database.updateSunoConnectionLimits).toHaveBeenCalledWith(
      expect.objectContaining({ connectionId: "conn-ok" }),
    );
    expect(services.logger.error).toHaveBeenCalledWith(
      "Suno limit sync failed for a workspace.",
      expect.objectContaining({ workspaceId }),
    );
  });

  it("removes stale temp objects through the storage API", async () => {
    const services = makeServices();
    vi.mocked(services.database.listStaleTempObjects).mockResolvedValue([
      `${workspaceId}/temp/old-1.bin`,
      `${workspaceId}/temp/old-2.bin`,
    ]);

    await runMaintenanceJob({ task: "cleanup-temp-assets" }, services);

    expect(services.database.listStaleTempObjects).toHaveBeenCalledWith(2);
    expect(services.storage.removeTempObjects).toHaveBeenCalledWith([
      `${workspaceId}/temp/old-1.bin`,
      `${workspaceId}/temp/old-2.bin`,
    ]);
  });

  it("skips storage removal when nothing is stale", async () => {
    const services = makeServices();

    await runMaintenanceJob({ task: "cleanup-temp-assets" }, services);

    expect(services.storage.removeTempObjects).not.toHaveBeenCalled();
  });

  it("dispatches maintenance queue messages through the worker loop", async () => {
    const queue = createInMemoryQueueClient();
    const services = makeWorkerServices(queue);
    const shutdown = new AbortController();
    const onTick = vi.fn();

    vi.mocked(services.database.recoverStaleJobs).mockImplementation(
      async () => {
        shutdown.abort();
        return {
          staleRenders: 0,
          staleTracks: 1,
          staleUploads: 0,
        };
      },
    );

    await queue.send(QUEUE_NAMES.maintenance, {
      task: "stale-job-recovery",
    });

    await runWorkerLoop({
      config: makeWorkerConfig(),
      onTick,
      services,
      signal: shutdown.signal,
    });

    expect(onTick).toHaveBeenCalled();
    expect(services.database.recoverStaleJobs).toHaveBeenCalledWith(60);
    expect(services.logger.info).toHaveBeenCalledWith(
      "Worker job completed.",
      expect.objectContaining({ queueName: QUEUE_NAMES.maintenance }),
    );
    expect(
      await consumeQueue(queue, QUEUE_NAMES.maintenance, {
        maxMessages: 1,
        visibilityTimeoutSeconds: 30,
      }),
    ).toEqual([]);
  });
});

describe("worker health server", () => {
  it("serves health checks and stops cleanly", async () => {
    const health = startHealthServer({ logger: makeLogger(), port: 0 });
    await health.ready;

    const address = health.server.address();
    expect(typeof address).toBe("object");

    if (!address || typeof address === "string") {
      throw new Error("Expected health server to listen on a TCP port.");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/healthz`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
    await expect(health.stop()).resolves.toBeUndefined();
  });

  it("rejects startup when the health port is already in use", async () => {
    const first = startHealthServer({ logger: makeLogger(), port: 0 });
    await first.ready;

    const address = first.server.address();

    if (!address || typeof address === "string") {
      throw new Error("Expected health server to listen on a TCP port.");
    }

    const second = startHealthServer({
      logger: makeLogger(),
      port: address.port,
    });

    await expect(second.ready).rejects.toThrow();
    await expect(second.stop()).resolves.toBeUndefined();
    await expect(first.stop()).resolves.toBeUndefined();
  });
});

function makeServices() {
  return {
    database: {
      listConnectedSunoConnections: vi.fn().mockResolvedValue([]),
      listStaleTempObjects: vi.fn().mockResolvedValue([]),
      recoverStaleJobs: vi.fn().mockResolvedValue({
        staleRenders: 0,
        staleTracks: 0,
        staleUploads: 0,
      }),
      updateSunoConnectionLimits: vi.fn().mockResolvedValue(undefined),
    } as unknown as WorkerDatabaseService,
    logger: makeLogger(),
    storage: {
      removeTempObjects: vi.fn().mockResolvedValue(undefined),
    } as unknown as WorkerStorageService,
    suno: {
      getLimits: vi.fn(),
    } as unknown as SunoService,
  };
}

function makeWorkerServices(
  queue = createInMemoryQueueClient(),
): WorkerServices {
  const services = makeServices();

  return {
    ...services,
    ffmpeg: {
      renderVideo: vi.fn(),
    },
    queue,
    youtube: {
      uploadVideo: vi.fn(),
    },
  } as unknown as WorkerServices;
}

function makeWorkerConfig(): WorkerConfig {
  return {
    googleClientId: "google-client-id",
    googleClientSecret: "google-client-secret",
    healthPort: 8081,
    maxAttempts: 1,
    maxConcurrency: 1,
    pollIntervalMs: 1,
    queueVisibilityTimeoutSeconds: 30,
    retryBaseDelaySeconds: 1,
    retryMaxDelaySeconds: 1,
    secretsEncryptionKey: "secret",
    serviceRoleKey: "service-role-key",
    sunoApiBaseUrl: "https://api.example.test",
    sunoCallbackUrl: "https://app.example.test/api/suno/callback",
    supabaseUrl: "http://127.0.0.1:54321",
    workerId: "test-worker",
  };
}

function makeLogger() {
  return {
    error: vi.fn(),
    info: vi.fn(),
  } as unknown as WorkerLogger;
}
