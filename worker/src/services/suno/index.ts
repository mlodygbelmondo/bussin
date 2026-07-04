import { NonRetryableJobError } from "../../queue/retry-policy";
import { createSunoAdapter } from "../../../../src/server/services/suno/suno-adapter";
import { normalizeSunoError } from "../../../../src/server/services/suno/suno.errors";
import type {
  SunoAdapter,
  SunoLimits,
} from "../../../../src/server/services/suno/suno.types";
import type { WorkerDatabaseService } from "../database";

export type SunoService = {
  createCustomGeneration(input: {
    prompt: string;
    title: string;
    workspaceId: string;
    trackId: string;
    options?: {
      model?: string;
      styleWeight?: number;
      weirdnessConstraint?: number;
      lyrics?: string;
    };
  }): Promise<{ sunoTrackId: string }>;
  getLimits(input: { workspaceId: string }): Promise<SunoLimits>;
  getTrackStatus(input: {
    sunoTrackId: string;
    workspaceId: string;
    trackId: string;
  }): Promise<
    | { status: "processing" | "failed"; failureReason?: string }
    | { status: "ready"; audioUrl: string; imageUrl: string | null }
  >;
};

type SunoCredentialSource = Pick<
  WorkerDatabaseService,
  "getSunoConnection" | "markSunoConnectionError"
>;

export function createSunoService(input: {
  adapterFactory?: (params: {
    apiUrl: string;
    credential: string;
  }) => SunoAdapter;
  callbackUrl: string;
  database: SunoCredentialSource;
  fallbackApiBaseUrl: string;
  fallbackApiKey?: string;
  secrets: { decrypt(value: string): string };
}): SunoService {
  const adapterFactory =
    input.adapterFactory ??
    ((params) =>
      createSunoAdapter({
        apiUrl: params.apiUrl,
        credential: params.credential,
      }));

  async function resolveAdapter(workspaceId: string): Promise<{
    adapter: SunoAdapter;
    connectionId: string | null;
  }> {
    const connection = await input.database.getSunoConnection(workspaceId);

    if (connection) {
      let apiUrl: string;
      let credential: string;

      try {
        apiUrl = input.secrets.decrypt(connection.encryptedApiUrl);
        credential = input.secrets.decrypt(connection.encryptedCookie);
      } catch {
        throw new NonRetryableJobError(
          "Stored Suno credentials could not be decrypted. Reconnect your Suno account.",
        );
      }

      return {
        adapter: adapterFactory({ apiUrl, credential }),
        connectionId: connection.connectionId,
      };
    }

    if (input.fallbackApiKey) {
      return {
        adapter: adapterFactory({
          apiUrl: input.fallbackApiBaseUrl,
          credential: input.fallbackApiKey,
        }),
        connectionId: null,
      };
    }

    throw new NonRetryableJobError(
      "No connected Suno account for this workspace. Connect your Suno API key, then retry.",
    );
  }

  async function handleCredentialFailure(params: {
    connectionId: string | null;
    error: unknown;
    workspaceId: string;
  }): Promise<never> {
    const normalized = normalizeSunoError(params.error);
    const credentialFailure =
      normalized.code === "unauthorized" ||
      normalized.code === "expired_cookie";

    if (credentialFailure && params.connectionId) {
      await input.database
        .markSunoConnectionError({
          connectionId: params.connectionId,
          lastError: normalized.code,
          workspaceId: params.workspaceId,
        })
        .catch(() => undefined);
    }

    if (credentialFailure || normalized.code === "invalid_response") {
      throw new NonRetryableJobError(normalized.message);
    }

    throw params.error;
  }

  return {
    async createCustomGeneration(request) {
      const { adapter, connectionId } = await resolveAdapter(
        request.workspaceId,
      );

      try {
        const lyrics = request.options?.lyrics;

        return await adapter.createCustomGeneration({
          callbackUrl: input.callbackUrl,
          // With lyrics the prompt field carries them and the music
          // description moves to style; instrumental stays the default.
          finalPrompt: lyrics ?? request.prompt,
          makeInstrumental: !lyrics,
          model: request.options?.model,
          style: lyrics ? request.prompt.slice(0, 1000) : "instrumental",
          styleWeight: request.options?.styleWeight,
          title: request.title,
          waitAudio: false,
          weirdnessConstraint: request.options?.weirdnessConstraint,
        });
      } catch (error) {
        return handleCredentialFailure({
          connectionId,
          error,
          workspaceId: request.workspaceId,
        });
      }
    },
    async getLimits(request) {
      const { adapter, connectionId } = await resolveAdapter(
        request.workspaceId,
      );

      try {
        return await adapter.getLimits();
      } catch (error) {
        return handleCredentialFailure({
          connectionId,
          error,
          workspaceId: request.workspaceId,
        });
      }
    },
    async getTrackStatus(request) {
      const { adapter, connectionId } = await resolveAdapter(
        request.workspaceId,
      );

      try {
        const status = await adapter.getTrackStatus({
          sunoTrackId: request.sunoTrackId,
        });

        if (status.status === "ready") {
          return {
            audioUrl: status.audioUrl,
            imageUrl: status.track.imageUrl ?? null,
            status: "ready",
          };
        }

        if (status.status === "failed") {
          return {
            failureReason: status.failureReason,
            status: "failed",
          };
        }

        return { status: "processing" };
      } catch (error) {
        return handleCredentialFailure({
          connectionId,
          error,
          workspaceId: request.workspaceId,
        });
      }
    },
  };
}
