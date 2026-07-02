import type { WorkerLogger } from "../logger";
import {
  QUEUE_NAMES,
  parseQueuePayload,
  type MaintenanceJobPayload,
} from "../queue/queue-types";
import type { WorkerDatabaseService } from "../services/database";
import type { WorkerStorageService } from "../services/storage";
import type { SunoService } from "../services/suno";

const STALE_JOB_MINUTES = 60;
const TEMP_ASSET_MAX_AGE_DAYS = 2;

export async function runMaintenanceJob(
  rawPayload: MaintenanceJobPayload,
  services: {
    database: WorkerDatabaseService;
    logger: WorkerLogger;
    storage: WorkerStorageService;
    suno: SunoService;
  },
) {
  const payload = parseQueuePayload(QUEUE_NAMES.maintenance, rawPayload);

  switch (payload.task) {
    case "stale-job-recovery":
      return recoverStaleJobs(services);
    case "sync-suno-limits":
      return syncSunoLimits(services);
    case "cleanup-temp-assets":
      return cleanupTempAssets(services);
  }
}

async function recoverStaleJobs(services: {
  database: WorkerDatabaseService;
  logger: WorkerLogger;
}) {
  const counts = await services.database.recoverStaleJobs(STALE_JOB_MINUTES);
  const total = counts.staleTracks + counts.staleRenders + counts.staleUploads;

  if (total > 0) {
    services.logger.info("Stale jobs recovered.", { ...counts });
  }
}

async function syncSunoLimits(services: {
  database: WorkerDatabaseService;
  logger: WorkerLogger;
  suno: SunoService;
}) {
  const connections = await services.database.listConnectedSunoConnections();

  for (const connection of connections) {
    try {
      const limits = await services.suno.getLimits({
        workspaceId: connection.workspaceId,
      });

      await services.database.updateSunoConnectionLimits({
        connectionId: connection.connectionId,
        creditsLeft: limits.creditsLeft,
        monthlyLimit: limits.monthlyLimit,
        monthlyUsage: limits.monthlyUsage,
        workspaceId: connection.workspaceId,
      });
    } catch (error) {
      // Per-connection failures (expired credentials etc.) are recorded on
      // the connection row by the suno service; keep syncing the rest.
      services.logger.error("Suno limit sync failed for a workspace.", {
        error,
        workspaceId: connection.workspaceId,
      });
    }
  }
}

async function cleanupTempAssets(services: {
  database: WorkerDatabaseService;
  logger: WorkerLogger;
  storage: WorkerStorageService;
}) {
  const stalePaths = await services.database.listStaleTempObjects(
    TEMP_ASSET_MAX_AGE_DAYS,
  );

  if (stalePaths.length === 0) {
    return;
  }

  await services.storage.removeTempObjects(stalePaths);
  services.logger.info("Temp assets cleaned up.", {
    removedCount: stalePaths.length,
  });
}
