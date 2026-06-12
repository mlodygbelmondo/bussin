import { NonRetryableJobError } from "../../queue/retry-policy";
import { createSunoAdapter } from "../../../../src/server/services/suno/suno-adapter";
import { normalizeSunoError } from "../../../../src/server/services/suno/suno.errors";
import type { SunoAdapter } from "../../../../src/server/services/suno/suno.types";
import type { WorkerDatabaseService } from "../database";

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

type SunoCredentialSource = Pick<
  WorkerDatabaseService,
  "getSunoConnection" | "markSunoConnectionError"
>;

export function createSunoService(input: {
  adapterFactory?: (params: {
    apiUrl: string;
    credential: string;
  }) => SunoAdapter;
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
        return await adapter.createCustomGeneration({
          finalPrompt: request.prompt,
          makeInstrumental: true,
          style: "instrumental",
          title: request.title,
          waitAudio: false,
        });
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
        return handleCredentialFailure({
          connectionId,
          error,
          workspaceId: request.workspaceId,
        });
      }
    },
  };
}
