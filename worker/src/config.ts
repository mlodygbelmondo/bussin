import { hostname } from "node:os";
import { env, requireEnv } from "../../src/lib/env";

export type WorkerConfig = {
  googleClientId: string;
  googleClientSecret: string;
  healthPort: number;
  maxAttempts: number;
  maxConcurrency: number;
  pollIntervalMs: number;
  queueVisibilityTimeoutSeconds: number;
  retryBaseDelaySeconds: number;
  retryMaxDelaySeconds: number;
  secretsEncryptionKey: string;
  serviceRoleKey: string;
  sunoApiBaseUrl: string;
  sunoApiKey?: string;
  supabaseUrl: string;
  workerId: string;
};

export function loadWorkerConfig(): WorkerConfig {
  return {
    googleClientId: env.GOOGLE_CLIENT_ID,
    googleClientSecret: env.GOOGLE_CLIENT_SECRET,
    healthPort: env.WORKER_HEALTH_PORT,
    maxAttempts: env.WORKER_MAX_ATTEMPTS,
    maxConcurrency: env.WORKER_MAX_CONCURRENCY,
    pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,
    queueVisibilityTimeoutSeconds: env.WORKER_QUEUE_VISIBILITY_TIMEOUT_SECONDS,
    retryBaseDelaySeconds: env.WORKER_RETRY_BASE_DELAY_SECONDS,
    retryMaxDelaySeconds: env.WORKER_RETRY_MAX_DELAY_SECONDS,
    secretsEncryptionKey: env.SECRETS_ENCRYPTION_KEY,
    serviceRoleKey: requireEnv(
      env.SUPABASE_SERVICE_ROLE_KEY,
      "SUPABASE_SERVICE_ROLE_KEY",
    ),
    sunoApiBaseUrl: env.SUNO_DEFAULT_API_BASE_URL,
    sunoApiKey: env.SUNO_API_KEY,
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    workerId: env.WORKER_ID ?? `worker-${hostname()}`,
  };
}
