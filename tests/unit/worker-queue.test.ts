// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  QUEUE_NAMES,
  parseQueuePayload,
} from "../../worker/src/queue/queue-types";
import {
  calculateRetryDelaySeconds,
  mapJobError,
  NonRetryableJobError,
  RetryableJobError,
  shouldRetryJob,
} from "../../worker/src/queue/retry-policy";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const generationRequestId = "22222222-2222-4222-8222-222222222222";
const trackId = "33333333-3333-4333-8333-333333333333";
const renderId = "44444444-4444-4444-8444-444444444444";
const uploadId = "55555555-5555-4555-8555-555555555555";

describe("worker queue payloads", () => {
  it("accepts the required generation job payload", () => {
    expect(
      parseQueuePayload(QUEUE_NAMES.generation, {
        workspaceId,
        generationRequestId,
        trackId,
      }),
    ).toEqual({ workspaceId, generationRequestId, trackId });
  });

  it("rejects invalid generation job payloads with a readable error", () => {
    expect(() =>
      parseQueuePayload(QUEUE_NAMES.generation, {
        workspaceId: "not-a-uuid",
        generationRequestId,
        trackId,
      }),
    ).toThrow(/generation-jobs payload/i);
  });

  it("requires Suno polling jobs to carry a positive attempt", () => {
    expect(
      parseQueuePayload(QUEUE_NAMES.sunoPolling, {
        workspaceId,
        trackId,
        sunoTrackId: "suno-track-1",
        attempt: 1,
      }),
    ).toEqual({
      workspaceId,
      trackId,
      sunoTrackId: "suno-track-1",
      attempt: 1,
    });

    expect(() =>
      parseQueuePayload(QUEUE_NAMES.sunoPolling, {
        workspaceId,
        trackId,
        sunoTrackId: "suno-track-1",
        attempt: 0,
      }),
    ).toThrow(/suno-polling-jobs payload/i);
  });

  it("accepts render and YouTube upload payloads", () => {
    expect(
      parseQueuePayload(QUEUE_NAMES.render, {
        workspaceId,
        trackId,
        videoRenderId: renderId,
      }),
    ).toEqual({ workspaceId, trackId, videoRenderId: renderId });

    expect(
      parseQueuePayload(QUEUE_NAMES.youtubeUpload, {
        workspaceId,
        trackId,
        videoRenderId: renderId,
        youtubeUploadId: uploadId,
      }),
    ).toEqual({
      workspaceId,
      trackId,
      videoRenderId: renderId,
      youtubeUploadId: uploadId,
    });
  });
});

describe("worker retry policy", () => {
  it("uses exponential backoff with a cap", () => {
    expect(
      calculateRetryDelaySeconds({
        attempt: 1,
        baseDelaySeconds: 5,
        maxDelaySeconds: 300,
      }),
    ).toBe(5);
    expect(
      calculateRetryDelaySeconds({
        attempt: 4,
        baseDelaySeconds: 5,
        maxDelaySeconds: 300,
      }),
    ).toBe(40);
    expect(
      calculateRetryDelaySeconds({
        attempt: 10,
        baseDelaySeconds: 5,
        maxDelaySeconds: 300,
      }),
    ).toBe(300);
  });

  it("maps retryable and non-retryable errors to readable failure reasons", () => {
    expect(mapJobError(new RetryableJobError("Suno rate limited"))).toEqual({
      failureReason: "Suno rate limited",
      retryable: true,
    });

    expect(mapJobError(new NonRetryableJobError("Invalid payload"))).toEqual({
      failureReason: "Invalid payload",
      retryable: false,
    });

    expect(mapJobError("opaque failure")).toEqual({
      failureReason: "opaque failure",
      retryable: true,
    });
  });

  it("stops retrying after the configured max attempts", () => {
    expect(shouldRetryJob({ attempt: 2, maxAttempts: 3 })).toBe(true);
    expect(shouldRetryJob({ attempt: 3, maxAttempts: 3 })).toBe(false);
  });
});
