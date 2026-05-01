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
});
