"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/app-config";
import { env } from "@/lib/env";
import { createYouTubeOAuthClient } from "@/lib/integrations/youtube";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createSunoConnectionActions,
  type SunoConnectionRepository,
} from "@/modules/integrations/suno/suno-connection.actions";
import { createSecretsService } from "@/server/services/secrets.service";
import {
  syncYoutubeChannels,
  type YoutubeConnectionRepository,
} from "@/server/services/youtube/youtube-oauth.service";
import type { ChannelsActionResult } from "@/modules/channels/channels.types";

type WorkspaceContext = {
  role: string | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  workspaceId: string;
};

export async function startChannelsYoutubeOAuthAction(): Promise<void> {
  if (isMockMode) {
    redirect("/dashboard/channels");
  }

  const { workspaceId } = await requireWorkspace();

  redirect(
    `/api/youtube/oauth/start?workspaceId=${encodeURIComponent(
      workspaceId,
    )}&returnTo=${encodeURIComponent("/dashboard/channels")}`,
  );
}

export async function setDefaultChannelAction(
  formData: FormData,
): Promise<ChannelsActionResult> {
  if (isMockMode) {
    return { message: "Mock default channel updated.", ok: true };
  }

  const channelId = String(formData.get("channelId") ?? "");

  if (!channelId) {
    return { message: "Missing channel.", ok: false };
  }

  const { supabase, userId, workspaceId } = await requireWorkspace();
  const { data: channel, error: channelError } = await supabase
    .from("youtube_channels")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("id", channelId)
    .maybeSingle();

  if (channelError) {
    return { message: channelError.message, ok: false };
  }

  if (!channel) {
    return {
      message: "Channel is not available in this workspace.",
      ok: false,
    };
  }

  const { error: clearError } = await supabase
    .from("youtube_channels")
    .update({ is_default: false })
    .eq("workspace_id", workspaceId);

  if (clearError) {
    return { message: clearError.message, ok: false };
  }

  const { error: setError } = await supabase
    .from("youtube_channels")
    .update({ is_default: true })
    .eq("workspace_id", workspaceId)
    .eq("id", channel.id);

  if (setError) {
    return { message: setError.message, ok: false };
  }

  await audit({
    action: "channels.default_set",
    entityId: channel.id,
    entityType: "youtube_channel",
    supabase,
    userId,
    workspaceId,
  });

  revalidatePath("/dashboard/channels");

  return { message: "Default channel updated.", ok: true };
}

export async function disconnectYoutubeConnectionAction(
  formData: FormData,
): Promise<ChannelsActionResult> {
  if (isMockMode) {
    return { message: "Mock YouTube channel disconnected.", ok: true };
  }

  const connectionId = String(formData.get("connectionId") ?? "");

  if (!connectionId) {
    return { message: "Missing YouTube connection.", ok: false };
  }

  const { supabase, userId, workspaceId } = await requireWorkspace();
  const { error: connectionError } = await supabase
    .from("youtube_connections")
    .update({ status: "disconnected" })
    .eq("workspace_id", workspaceId)
    .eq("id", connectionId);

  if (connectionError) {
    return { message: connectionError.message, ok: false };
  }

  const { error: channelError } = await supabase
    .from("youtube_channels")
    .update({ is_default: false, status: "disconnected" })
    .eq("workspace_id", workspaceId)
    .eq("youtube_connection_id", connectionId);

  if (channelError) {
    return { message: channelError.message, ok: false };
  }

  await audit({
    action: "channels.youtube_disconnected",
    entityId: connectionId,
    entityType: "youtube_connection",
    supabase,
    userId,
    workspaceId,
  });

  revalidatePath("/dashboard/channels");

  return { message: "YouTube channel disconnected.", ok: true };
}

export async function syncYoutubeChannelsAction(
  formData: FormData,
): Promise<ChannelsActionResult> {
  if (isMockMode) {
    return { message: "Mock channels synced.", ok: true };
  }

  const connectionId = String(formData.get("connectionId") ?? "");

  if (!connectionId) {
    return { message: "Missing YouTube connection.", ok: false };
  }

  const { role, supabase, userId, workspaceId } = await requireWorkspace();

  if (!canManageIntegrations(role)) {
    return { message: "Workspace admin access required.", ok: false };
  }

  const admin = createAdminClient();
  const { data: connection, error } = await admin
    .from("youtube_connections")
    .select(
      "id, encrypted_access_token, encrypted_refresh_token, token_expires_at",
    )
    .eq("workspace_id", workspaceId)
    .eq("id", connectionId)
    .maybeSingle();

  if (error) {
    return { message: error.message, ok: false };
  }

  if (
    !connection?.encrypted_access_token ||
    !connection.encrypted_refresh_token
  ) {
    return { message: "Reconnect YouTube before syncing.", ok: false };
  }

  const secrets = createSecretsService({
    encryptionKey: env.SECRETS_ENCRYPTION_KEY,
  });

  try {
    const channels = await createYouTubeOAuthClient().listChannels({
      accessToken: secrets.decrypt(connection.encrypted_access_token),
      expiryDate: connection.token_expires_at
        ? new Date(connection.token_expires_at).getTime()
        : undefined,
      providerAccountEmail: "",
      refreshToken: secrets.decrypt(connection.encrypted_refresh_token),
      scopes: [],
    });

    await syncYoutubeChannels({
      channels,
      connectionId: connection.id,
      repository: createYoutubeRepository(admin),
      workspaceId,
    });

    await admin
      .from("youtube_connections")
      .update({ status: "connected" })
      .eq("workspace_id", workspaceId)
      .eq("id", connection.id);

    await audit({
      action: "channels.youtube_synced",
      entityId: connection.id,
      entityType: "youtube_connection",
      supabase,
      userId,
      workspaceId,
    });

    revalidatePath("/dashboard/channels");

    return { message: "Channels synced.", ok: true };
  } catch (syncError) {
    await admin
      .from("youtube_connections")
      .update({ status: "error" })
      .eq("workspace_id", workspaceId)
      .eq("id", connection.id);

    revalidatePath("/dashboard/channels");

    return {
      message:
        syncError instanceof Error ? syncError.message : "YouTube sync failed.",
      ok: false,
    };
  }
}

export async function testSunoConnectionAction(): Promise<ChannelsActionResult> {
  if (isMockMode) {
    return { message: "Mock Suno connection looks healthy.", ok: true };
  }

  const { role, workspaceId } = await requireWorkspace();

  if (!canManageIntegrations(role)) {
    return { message: "Workspace admin access required.", ok: false };
  }

  const admin = createAdminClient();
  const { data: connection, error } = await admin
    .from("suno_connections")
    .select("id, encrypted_api_url, encrypted_cookie")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { message: error.message, ok: false };
  }

  if (!connection?.encrypted_api_url || !connection.encrypted_cookie) {
    return { message: "Connect Suno before testing.", ok: false };
  }

  const secrets = createSecretsService({
    encryptionKey: env.SECRETS_ENCRYPTION_KEY,
  });
  const actions = createSunoConnectionActions({
    repository: createSunoRepository(admin),
    secrets,
  });

  try {
    await actions.syncLimits({
      apiUrl: secrets.decrypt(connection.encrypted_api_url),
      connectionId: connection.id,
      credential: secrets.decrypt(connection.encrypted_cookie),
      workspaceId,
    });

    revalidatePath("/dashboard/channels");

    return { message: "Suno connection is healthy.", ok: true };
  } catch (testError) {
    await admin
      .from("suno_connections")
      .update({
        last_checked_at: new Date().toISOString(),
        last_error:
          testError instanceof Error ? testError.message : "suno_test_failed",
        status: "error",
      })
      .eq("workspace_id", workspaceId)
      .eq("id", connection.id);

    revalidatePath("/dashboard/channels");

    return {
      message:
        testError instanceof Error
          ? testError.message
          : "Suno connection test failed.",
      ok: false,
    };
  }
}

async function requireWorkspace(): Promise<WorkspaceContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    redirect("/onboarding");
  }

  return {
    role: data.role,
    supabase,
    userId: user.id,
    workspaceId: String(data.workspace_id),
  };
}

function canManageIntegrations(role: string | null | undefined) {
  return role === "owner" || role === "admin";
}

function createYoutubeRepository(
  admin: ReturnType<typeof createAdminClient>,
): Pick<YoutubeConnectionRepository, "getDefaultChannelId" | "upsertChannel"> {
  return {
    async getDefaultChannelId(workspaceId) {
      const { data, error } = await admin
        .from("youtube_channels")
        .select("youtube_channel_id")
        .eq("workspace_id", workspaceId)
        .eq("is_default", true)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data?.youtube_channel_id ?? null;
    },
    async upsertChannel(input) {
      const { data, error } = await admin
        .from("youtube_channels")
        .upsert(input, { onConflict: "workspace_id,youtube_channel_id" })
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  };
}

function createSunoRepository(
  admin: ReturnType<typeof createAdminClient>,
): SunoConnectionRepository {
  return {
    async createConnection() {
      throw new Error("Creating Suno connections is not available here.");
    },
    async listConnections(workspaceId) {
      const { data, error } = await admin
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
      const { data, error } = await admin
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

async function audit(input: {
  action: string;
  entityId: string;
  entityType: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  workspaceId: string;
}) {
  await input.supabase.from("audit_logs").insert({
    action: input.action,
    entity_id: input.entityId,
    entity_type: input.entityType,
    metadata: {},
    user_id: input.userId,
    workspace_id: input.workspaceId,
  });
}
