import { QueuePayloadError } from "./queue-types";

export class RetryableJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableJobError";
  }
}

export class NonRetryableJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableJobError";
  }
}

export type MappedJobError = {
  failureReason: string;
  retryable: boolean;
};

export function calculateRetryDelaySeconds(input: {
  attempt: number;
  baseDelaySeconds?: number;
  maxDelaySeconds?: number;
}) {
  const baseDelaySeconds = input.baseDelaySeconds ?? 15;
  const maxDelaySeconds = input.maxDelaySeconds ?? 900;
  const exponent = Math.max(input.attempt - 1, 0);

  return Math.min(baseDelaySeconds * 2 ** exponent, maxDelaySeconds);
}

export function shouldRetryJob(input: {
  attempt: number;
  maxAttempts?: number;
}) {
  return input.attempt < (input.maxAttempts ?? 5);
}

export function mapJobError(error: unknown): MappedJobError {
  if (error instanceof NonRetryableJobError) {
    return { failureReason: error.message, retryable: false };
  }

  if (error instanceof QueuePayloadError) {
    return { failureReason: error.message, retryable: false };
  }

  if (error instanceof RetryableJobError) {
    return { failureReason: error.message, retryable: true };
  }

  if (error instanceof Error) {
    return {
      failureReason: error.message || "Unknown worker error",
      retryable: true,
    };
  }

  if (typeof error === "string" && error.length > 0) {
    return { failureReason: error, retryable: true };
  }

  return { failureReason: "Unknown worker error", retryable: true };
}
