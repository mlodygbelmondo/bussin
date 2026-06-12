import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("throws when required environment variables are missing", () => {
    expect(parseEnv).toEqual(expect.any(Function));
    expect(() => parseEnv({})).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("fills service placeholders only in mock mode", () => {
    expect(
      parseEnv({
        NEXT_PUBLIC_APP_MODE: "mock",
      }).SUPABASE_SERVICE_ROLE_KEY,
    ).toBe("mock-supabase-service-role-key");
  });

  it("accepts the Supabase publishable key env name", () => {
    expect(
      parseEnv({
        GOOGLE_CLIENT_ID: "google-client-id",
        GOOGLE_CLIENT_SECRET: "google-client-secret",
        GOOGLE_REDIRECT_URI: "http://localhost:3000/api/youtube/oauth/callback",
        NEXT_PUBLIC_APP_MODE: "live",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        SECRETS_ENCRYPTION_KEY: "test-secrets-encryption-key",
        STRIPE_SECRET_KEY: "sk_test_placeholder",
        STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
        SUNO_DEFAULT_API_BASE_URL: "https://api.example.test",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      }).NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ).toBe("sb_publishable_test");
  });
});
