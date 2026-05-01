import type { YoutubeErrorCode } from "@/server/services/youtube/youtube.types";

export class YoutubeIntegrationError extends Error {
  constructor(
    public readonly code: YoutubeErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "YoutubeIntegrationError";
  }
}

export function normalizeYoutubeError(error: unknown): YoutubeIntegrationError {
  if (error instanceof YoutubeIntegrationError) {
    return error;
  }

  const message = extractMessage(error);
  const lowerMessage = message.toLowerCase();
  const reasons = extractReasons(error).map((reason) => reason.toLowerCase());

  if (
    lowerMessage.includes("invalid_grant") ||
    reasons.includes("invalidgrant")
  ) {
    return new YoutubeIntegrationError(
      "invalid_grant",
      "Google rejected the OAuth grant.",
      error,
    );
  }

  if (lowerMessage.includes("expired")) {
    return new YoutubeIntegrationError(
      "expired_token",
      "YouTube token is expired.",
      error,
    );
  }

  if (
    reasons.some((reason) => reason.includes("quota")) ||
    lowerMessage.includes("quota")
  ) {
    return new YoutubeIntegrationError(
      "quota_exceeded",
      "YouTube API quota exceeded.",
      error,
    );
  }

  if (reasons.includes("forbidden") || getNumericValue(error, "code") === 403) {
    return new YoutubeIntegrationError(
      "forbidden",
      "YouTube request is forbidden.",
      error,
    );
  }

  if (
    getNumericValue(error, "code") === 413 ||
    lowerMessage.includes("too large")
  ) {
    return new YoutubeIntegrationError(
      "file_too_large",
      "Video file is too large for YouTube.",
      error,
    );
  }

  if (
    lowerMessage.includes("metadata") ||
    getNumericValue(error, "code") === 400
  ) {
    return new YoutubeIntegrationError(
      "invalid_metadata",
      "YouTube metadata is invalid.",
      error,
    );
  }

  if (lowerMessage.includes("upload")) {
    return new YoutubeIntegrationError(
      "upload_failed",
      "YouTube upload failed.",
      error,
    );
  }

  return new YoutubeIntegrationError(
    "unknown",
    message || "Unknown YouTube integration error.",
    error,
  );
}

function extractMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (!error || typeof error !== "object") {
    return String(error ?? "");
  }

  const record = error as Record<string, unknown>;
  const responseMessage = getNestedString(record, [
    "response",
    "data",
    "error",
  ]);

  return (
    getString(record, "message") ??
    responseMessage ??
    getString(record, "error") ??
    ""
  );
}

function extractReasons(error: unknown) {
  if (!error || typeof error !== "object") {
    return [];
  }

  const reasons = (error as Record<string, unknown>).errors;
  if (!Array.isArray(reasons)) {
    return [];
  }

  return reasons
    .map((item) =>
      item && typeof item === "object"
        ? (item as Record<string, unknown>).reason
        : null,
    )
    .filter((item): item is string => typeof item === "string");
}

function getNumericValue(error: unknown, key: string) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const value = (error as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

function getString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function getNestedString(record: Record<string, unknown>, keys: string[]) {
  let current: unknown = record;

  for (const key of keys) {
    if (!current || typeof current !== "object") {
      return null;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" ? current : null;
}
