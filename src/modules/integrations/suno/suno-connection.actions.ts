import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";
import type { SecretsService } from "@/server/services/secrets.service";
import { createSunoAdapter } from "@/server/services/suno/suno-adapter";
import type { SunoAdapter } from "@/server/services/suno/suno.types";
import { normalizeSunoError } from "@/server/services/suno/suno.errors";
import { createSunoConnectionSchema } from "@/server/validators/suno-connection.validator";
import type { CreateSunoConnectionInput } from "@/server/validators/suno-connection.validator";

export type SunoConnectionRecord = Partial<Tables<"suno_connections">> & {
  id: string;
  status: string;
  workspace_id: string;
};

export type SunoConnectionRepository = {
  createConnection(
    input: Pick<
      TablesInsert<"suno_connections">,
      | "encrypted_api_url"
      | "encrypted_cookie"
      | "label"
      | "status"
      | "workspace_id"
    >,
  ): Promise<SunoConnectionRecord>;
  listConnections(workspaceId: string): Promise<SunoConnectionRecord[]>;
  updateConnection(input: {
    connectionId: string;
    values: Pick<
      TablesUpdate<"suno_connections">,
      | "credits_left"
      | "encrypted_api_url"
      | "encrypted_cookie"
      | "label"
      | "last_checked_at"
      | "last_error"
      | "monthly_limit"
      | "monthly_usage"
      | "status"
    >;
    workspaceId: string;
  }): Promise<SunoConnectionRecord>;
};

export function createSunoConnectionActions(input: {
  adapterFactory?: (params: {
    apiUrl: string;
    credential: string;
  }) => SunoAdapter;
  repository: SunoConnectionRepository;
  secrets: SecretsService;
}) {
  const adapterFactory =
    input.adapterFactory ??
    ((params) =>
      createSunoAdapter({
        apiUrl: params.apiUrl,
        credential: params.credential,
      }));

  return {
    async listConnections(workspaceId: string) {
      return input.repository.listConnections(workspaceId);
    },
    async saveConnection(params: {
      input: CreateSunoConnectionInput;
      userId: string;
      workspaceId: string;
    }) {
      const parsed = createSunoConnectionSchema.parse(params.input);
      const encryptedApiUrl = input.secrets.encrypt(parsed.api_url);
      const encryptedCookie = input.secrets.encrypt(parsed.cookie);
      const existing = await input.repository.listConnections(
        params.workspaceId,
      );
      const connection = existing[0]
        ? await input.repository.updateConnection({
            connectionId: existing[0].id,
            values: {
              encrypted_api_url: encryptedApiUrl,
              encrypted_cookie: encryptedCookie,
              label: parsed.label,
              status: "unknown",
            },
            workspaceId: params.workspaceId,
          })
        : await input.repository.createConnection({
            encrypted_api_url: encryptedApiUrl,
            encrypted_cookie: encryptedCookie,
            label: parsed.label,
            status: "unknown",
            workspace_id: params.workspaceId,
          });
      const adapter = adapterFactory({
        apiUrl: parsed.api_url,
        credential: parsed.cookie,
      });

      try {
        const { limits } = await adapter.testConnection();

        await input.repository.updateConnection({
          connectionId: connection.id,
          values: {
            credits_left: limits.creditsLeft,
            last_checked_at: new Date().toISOString(),
            last_error: null,
            monthly_limit: limits.monthlyLimit,
            monthly_usage: limits.monthlyUsage,
            status: "connected",
          },
          workspaceId: params.workspaceId,
        });

        return {
          ...connection,
          credits_left: limits.creditsLeft,
          last_error: null,
          status: "connected",
        };
      } catch (error) {
        const normalized = normalizeSunoError(error);

        await input.repository.updateConnection({
          connectionId: connection.id,
          values: {
            last_checked_at: new Date().toISOString(),
            last_error: normalized.code,
            status: "error",
          },
          workspaceId: params.workspaceId,
        });

        return {
          ...connection,
          last_error: normalized.code,
          status: "error",
        };
      }
    },
    async syncLimits(params: {
      apiUrl: string;
      connectionId: string;
      credential: string;
      workspaceId: string;
    }) {
      const adapter = adapterFactory({
        apiUrl: params.apiUrl,
        credential: params.credential,
      });
      const limits = await adapter.getLimits();

      return input.repository.updateConnection({
        connectionId: params.connectionId,
        values: {
          credits_left: limits.creditsLeft,
          last_checked_at: new Date().toISOString(),
          last_error: null,
          monthly_limit: limits.monthlyLimit,
          monthly_usage: limits.monthlyUsage,
          status: "connected",
        },
        workspaceId: params.workspaceId,
      });
    },
  };
}
