import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const appModeSchema = z.enum(["live", "mock"]).default("live");

const serverSchema = {
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
  SECRETS_ENCRYPTION_KEY: z.string().min(1),
  STRIPE_CREATOR_PRICE_ID: z.string().min(1).optional(),
  STRIPE_PRO_PRICE_ID: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_STUDIO_PRICE_ID: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  SUNO_API_KEY: z.string().min(1).optional(),
  SUNO_DEFAULT_API_BASE_URL: z.string().url(),
  SUPABASE_DB_URL: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  WORKER_ID: z.string().min(1).optional(),
  WORKER_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  WORKER_MAX_CONCURRENCY: z.coerce.number().int().positive().default(2),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(10000),
  WORKER_QUEUE_VISIBILITY_TIMEOUT_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(300),
  WORKER_RETRY_BASE_DELAY_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(15),
  WORKER_RETRY_MAX_DELAY_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(900),
};

const clientSchema = {
  NEXT_PUBLIC_APP_MODE: appModeSchema,
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
};

const combinedSchema = z.object({
  ...serverSchema,
  ...clientSchema,
});

const mockDefaults = {
  GOOGLE_CLIENT_ID: "mock-google-client-id",
  GOOGLE_CLIENT_SECRET: "mock-google-client-secret",
  GOOGLE_REDIRECT_URI: "http://localhost:3000/api/youtube/oauth/callback",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "mock-supabase-anon-key",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  SECRETS_ENCRYPTION_KEY: "mock-secrets-encryption-key",
  STRIPE_SECRET_KEY: "sk_test_mock",
  STRIPE_WEBHOOK_SECRET: "whsec_mock",
  SUNO_DEFAULT_API_BASE_URL: "https://api.example.test",
  SUPABASE_SERVICE_ROLE_KEY: "mock-supabase-service-role-key",
} satisfies Partial<EnvInput>;

export type AppMode = z.infer<typeof appModeSchema>;
export type Env = z.infer<typeof combinedSchema>;
export type EnvInput = Record<string, string | undefined>;

export function parseEnv(input: EnvInput): Env {
  const parsed = combinedSchema.safeParse(withMockDefaults(input));

  if (!parsed.success) {
    throw new Error(
      `Invalid environment variables: ${formatEnvIssues(parsed.error)}`,
    );
  }

  return parsed.data;
}

export const env = createEnv({
  client: clientSchema,
  emptyStringAsUndefined: true,
  runtimeEnv: withMockDefaults(process.env) as Record<
    keyof Env,
    string | boolean | number | undefined
  >,
  server: serverSchema,
}) as Env;

export function requireEnv<T>(value: T | undefined, name: string): T {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function withMockDefaults(input: EnvInput): EnvInput {
  const normalized = normalizeEmptyStrings(input);
  const mode = appModeSchema.parse(normalized.NEXT_PUBLIC_APP_MODE);

  if (mode !== "mock") {
    return normalized;
  }

  return {
    ...mockDefaults,
    ...normalized,
    NEXT_PUBLIC_APP_MODE: "mock",
  };
}

function normalizeEmptyStrings(input: EnvInput): EnvInput {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      value === "" ? undefined : value,
    ]),
  );
}

function formatEnvIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => issue.path.join(".") || "environment")
    .join(", ");
}
