import { env } from "@/lib/env";

export const APP_MODE = env.NEXT_PUBLIC_APP_MODE;

// Mock mode previously degraded silently to live mode in production, leaving
// the app running against mock env defaults (api.example.test, mock keys).
// Fail loudly instead: a production build/boot must never be in mock mode.
if (process.env.NODE_ENV === "production" && APP_MODE === "mock") {
  throw new Error(
    "NEXT_PUBLIC_APP_MODE=mock is not allowed in production builds. Set NEXT_PUBLIC_APP_MODE=live and provide real environment variables.",
  );
}

if (
  process.env.NODE_ENV === "production" &&
  env.SECRETS_ENCRYPTION_KEY === "mock-secrets-encryption-key"
) {
  throw new Error(
    "SECRETS_ENCRYPTION_KEY is still the mock default. Generate a real key (openssl rand -base64 32) before deploying.",
  );
}

export const isMockMode = APP_MODE === "mock";

export const mockUser = {
  email: "producer@bussin.test",
  id: "00000000-0000-4000-8000-000000000001",
  name: "Alex M.",
};

export const mockWorkspaceId = "00000000-0000-4000-8000-000000000010";
