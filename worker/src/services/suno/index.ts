import { NonRetryableJobError } from "../../queue/retry-policy";
import { createSunoAdapter } from "../../../../src/server/services/suno/suno-adapter";
import { normalizeSunoError } from "../../../../src/server/services/suno/suno.errors";

export type SunoService = {
  createCustomGeneration(input: {
    prompt: string;
    title: string;
    workspaceId: string;
    trackId: string;
  }): Promise<{ sunoTrackId: string }>;
  getTrackStatus(input: {
    sunoTrackId: string;
    workspaceId: string;
    trackId: string;
  }): Promise<
    | { status: "processing" | "failed"; failureReason?: string }
    | { status: "ready"; audioUrl: string }
  >;
};

export function createSunoService(input: {
  apiBaseUrl: string;
  apiKey?: string;
}): SunoService {
  const adapter = input.apiKey
    ? createSunoAdapter({
        apiUrl: input.apiBaseUrl,
        credential: input.apiKey,
      })
    : null;

  return {
    async createCustomGeneration(request) {
      if (!adapter) {
        throw new NonRetryableJobError(
          "SUNO_API_KEY is required to process generation jobs.",
        );
      }

      const result = await adapter.createCustomGeneration({
        finalPrompt: request.prompt,
        makeInstrumental: true,
        style: "instrumental",
        title: request.title,
        waitAudio: false,
      });

      return result;
    },
    async getTrackStatus(request) {
      if (!adapter) {
        throw new NonRetryableJobError(
          "SUNO_API_KEY is required to poll generation jobs.",
        );
      }

      try {
        const status = await adapter.getTrackStatus({
          sunoTrackId: request.sunoTrackId,
        });

        if (status.status === "ready") {
          return { audioUrl: status.audioUrl, status: "ready" };
        }

        if (status.status === "failed") {
          return {
            failureReason: status.failureReason,
            status: "failed",
          };
        }

        return { status: "processing" };
      } catch (error) {
        const normalized = normalizeSunoError(error);

        if (
          normalized.code === "unauthorized" ||
          normalized.code === "expired_cookie" ||
          normalized.code === "invalid_response"
        ) {
          throw new NonRetryableJobError(normalized.message);
        }

        throw error;
      }
    },
  };
}
