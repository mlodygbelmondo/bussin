import type { SunoErrorCode } from "@/server/services/suno/suno.types";

export class SunoIntegrationError extends Error {
  constructor(
    public readonly code: SunoErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "SunoIntegrationError";
  }
}

export function normalizeSunoError(error: unknown): SunoIntegrationError {
  if (error instanceof SunoIntegrationError) {
    return error;
  }

  const status =
    getNumericValue(error, "status") ?? getNumericValue(error, "code");
  const message =
    getStringValue(error, "message") ?? getStringValue(error, "msg");
  const normalizedMessage = message?.toLowerCase() ?? "";

  if (status === 401 || normalizedMessage.includes("unauthorized")) {
    return new SunoIntegrationError(
      "unauthorized",
      "Suno credentials are unauthorized.",
      error,
    );
  }

  if (
    normalizedMessage.includes("expired") ||
    normalizedMessage.includes("cookie")
  ) {
    return new SunoIntegrationError(
      "expired_cookie",
      "Suno credential appears to be expired.",
      error,
    );
  }

  if (status === 429 || normalizedMessage.includes("credit")) {
    return new SunoIntegrationError(
      "quota_exceeded",
      "Suno quota or credits are exhausted.",
      error,
    );
  }

  if (status === 408 || normalizedMessage.includes("timeout")) {
    return new SunoIntegrationError(
      "timeout",
      "Suno request timed out.",
      error,
    );
  }

  if (
    error instanceof TypeError ||
    normalizedMessage.includes("fetch failed")
  ) {
    return new SunoIntegrationError(
      "api_unreachable",
      "Suno API is unreachable.",
      error,
    );
  }

  if (
    normalizedMessage.includes("generate") &&
    normalizedMessage.includes("failed")
  ) {
    return new SunoIntegrationError(
      "generation_failed",
      "Suno generation failed.",
      error,
    );
  }

  return new SunoIntegrationError(
    "unknown",
    message ?? "Unknown Suno integration error.",
    error,
  );
}

function getNumericValue(error: unknown, key: string) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const value = (error as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

function getStringValue(error: unknown, key: string) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}
