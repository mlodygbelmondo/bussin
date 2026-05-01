import type { SecretsService } from "@/server/services/secrets.service";
import type {
  SunoConnectionRecord,
  SunoConnectionRepository,
} from "@/modules/integrations/suno/suno-connection.actions";

export type SafeSunoConnection = Omit<
  SunoConnectionRecord,
  "encrypted_api_url" | "encrypted_cookie"
> & {
  id: string;
  maskedApiUrl: string;
  maskedCookie: string;
  status: string;
  workspace_id: string;
};

export async function listSafeSunoConnections(input: {
  repository: SunoConnectionRepository;
  secrets: SecretsService;
  workspaceId: string;
}): Promise<SafeSunoConnection[]> {
  const connections = await input.repository.listConnections(input.workspaceId);

  return connections.map((connection) => ({
    ...connection,
    encrypted_api_url: undefined,
    encrypted_cookie: undefined,
    maskedApiUrl: input.secrets.mask(
      decryptOptional(input.secrets, connection.encrypted_api_url),
    ),
    maskedCookie: input.secrets.mask(
      decryptOptional(input.secrets, connection.encrypted_cookie),
    ),
  }));
}

function decryptOptional(
  secrets: SecretsService,
  value: string | null | undefined,
) {
  if (!value) {
    return "";
  }

  return secrets.decrypt(value);
}
