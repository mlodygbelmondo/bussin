"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/app-config";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createYouTubeOAuthClient } from "@/lib/integrations/youtube";
import {
  createSunoConnectionActions,
  type SunoConnectionRepository,
} from "@/modules/integrations/suno/suno-connection.actions";
import { describeSunoConnectionError } from "@/modules/integrations/suno/suno-connection.errors";
import { createSunoConnectionSchema } from "@/server/validators/suno-connection.validator";
import {
  YOUTUBE_OAUTH_STATE_COOKIE,
  youtubeOAuthStateCookieOptions,
} from "@/modules/integrations/youtube/youtube-oauth.routes";
import { createSecretsService } from "@/server/services/secrets.service";
import {
  createYoutubeOAuthService,
  type YoutubeConnectionRepository,
} from "@/server/services/youtube/youtube-oauth.service";

async function requireWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to update onboarding.");
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Workspace not found.");
  }

  return { supabase, user, workspaceId: data.workspace_id };
}

export async function saveSunoConnectionAction(formData: FormData) {
  if (isMockMode) {
    redirect("/onboarding");
  }

  const { supabase, user, workspaceId } = await requireWorkspace();
  const label = String(formData.get("label") || "Primary Suno");
  const apiUrl = String(formData.get("api_url") ?? "");
  const cookie = String(formData.get("cookie") ?? "");
  const parsed = createSunoConnectionSchema.safeParse({
    api_url: apiUrl,
    cookie,
    label,
  });

  if (!parsed.success) {
    redirectWithSunoError(
      parsed.error.issues[0]?.message ?? "Invalid Suno connection details.",
    );
  }

  const actions = createSunoConnectionActions({
    repository: createSunoRepository(supabase),
    secrets: createSecretsService({
      encryptionKey: env.SECRETS_ENCRYPTION_KEY,
    }),
  });
  let result: Awaited<ReturnType<typeof actions.saveConnection>>;

  try {
    result = await actions.saveConnection({
      input: parsed.data,
      userId: user.id,
      workspaceId,
    });
  } catch {
    redirectWithSunoError("Could not save the Suno connection. Try again.");
  }

  revalidatePath("/onboarding");

  if (result.status !== "connected") {
    redirectWithSunoError(describeSunoConnectionError(result.last_error));
  }

  redirect("/onboarding");
}

function redirectWithSunoError(message: string): never {
  redirect(`/onboarding?suno_error=${encodeURIComponent(message)}`);
}

export async function startYoutubeOAuthAction() {
  if (isMockMode) {
    redirect("/onboarding");
  }

  const { user, workspaceId } = await requireWorkspace();
  const oauthService = createYoutubeOAuthService({
    oauthClient: createYouTubeOAuthClient(),
    repository: createOAuthRepositoryStub(),
    secrets: createSecretsService({
      encryptionKey: env.SECRETS_ENCRYPTION_KEY,
    }),
    stateSecret: env.SECRETS_ENCRYPTION_KEY,
  });
  const authorization = oauthService.createAuthorizationUrl({
    returnTo: "/onboarding",
    userId: user.id,
    workspaceId,
  });
  const cookieStore = await import("next/headers").then(({ cookies }) =>
    cookies(),
  );

  cookieStore.set(YOUTUBE_OAUTH_STATE_COOKIE, authorization.stateToken, {
    ...youtubeOAuthStateCookieOptions,
  });

  redirect(authorization.url);
}

export async function saveDefaultsAction(formData: FormData) {
  if (isMockMode) {
    redirect("/onboarding");
  }

  const { supabase, workspaceId } = await requireWorkspace();
  await persistDefaults({ formData, supabase, workspaceId });

  revalidatePath("/onboarding");
}

export async function completeOnboardingAction(formData: FormData) {
  if (isMockMode) {
    redirect("/dashboard");
  }

  const { supabase, workspaceId } = await requireWorkspace();

  await persistDefaults({ formData, supabase, workspaceId });

  const { error } = await supabase
    .from("workspaces")
    .update({ onboarding_completed: true })
    .eq("id", workspaceId);

  if (error) {
    throw new Error(error.message);
  }

  redirect("/dashboard");
}

async function persistDefaults(input: {
  formData: FormData;
  supabase: Awaited<ReturnType<typeof createClient>>;
  workspaceId: string;
}) {
  const channelId = String(input.formData.get("defaultChannelId") ?? "");

  if (!channelId) {
    return;
  }

  const { data: channel, error: channelError } = await input.supabase
    .from("youtube_channels")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("id", channelId)
    .maybeSingle();

  if (channelError) {
    throw new Error(channelError.message);
  }

  if (!channel) {
    throw new Error("Selected YouTube channel is not available.");
  }

  const { error: clearError } = await input.supabase
    .from("youtube_channels")
    .update({ is_default: false })
    .eq("workspace_id", input.workspaceId);

  if (clearError) {
    throw new Error(clearError.message);
  }

  const { error: setError } = await input.supabase
    .from("youtube_channels")
    .update({ is_default: true })
    .eq("workspace_id", input.workspaceId)
    .eq("id", channel.id);

  if (setError) {
    throw new Error(setError.message);
  }
}

function createSunoRepository(
  supabase: Awaited<ReturnType<typeof createClient>>,
): SunoConnectionRepository {
  return {
    async createConnection(input) {
      const { data, error } = await supabase
        .from("suno_connections")
        .insert(input)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    async listConnections(workspaceId) {
      const { data, error } = await supabase
        .from("suno_connections")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    async updateConnection(input) {
      const { data, error } = await supabase
        .from("suno_connections")
        .update(input.values)
        .eq("workspace_id", input.workspaceId)
        .eq("id", input.connectionId)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  };
}

function createOAuthRepositoryStub(): YoutubeConnectionRepository {
  return {
    createConnection() {
      throw new Error("OAuth repository is unavailable during authorization.");
    },
    getDefaultChannelId() {
      throw new Error("OAuth repository is unavailable during authorization.");
    },
    updateConnectionStatus() {
      throw new Error("OAuth repository is unavailable during authorization.");
    },
    upsertChannel() {
      throw new Error("OAuth repository is unavailable during authorization.");
    },
  };
}
