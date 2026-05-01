import { describe, expect, it } from "vitest";
import {
  InvalidStatusTransitionError,
  assertStatusTransition,
} from "@/server/services/status-transition.service";
import { createSecretsService } from "@/server/services/secrets.service";

describe("status transitions", () => {
  it("allows strict valid transitions", () => {
    expect(() =>
      assertStatusTransition("tracks", "ready", "approved"),
    ).not.toThrow();
    expect(() =>
      assertStatusTransition("youtube_uploads", "scheduled", "uploading"),
    ).not.toThrow();
  });

  it("throws typed errors for invalid transitions", () => {
    expect(() => assertStatusTransition("tracks", "ready", "uploaded")).toThrow(
      InvalidStatusTransitionError,
    );
  });
});

describe("secrets service", () => {
  it("encrypts, decrypts, and masks secrets", () => {
    const service = createSecretsService({
      encryptionKey: "test-key-with-enough-entropy-for-unit-tests",
    });

    const encrypted = service.encrypt("sk_test_1234567890");

    expect(encrypted).not.toContain("sk_test_1234567890");
    expect(service.decrypt(encrypted)).toBe("sk_test_1234567890");
    expect(service.mask("sk_test_1234567890")).toBe("sk_t...7890");
  });
});
