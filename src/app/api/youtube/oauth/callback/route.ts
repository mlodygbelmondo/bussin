import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isMockMode } from "@/lib/app-config";
import { env } from "@/lib/env";
import { createYouTubeOAuthClient } from "@/lib/integrations/youtube";
import { createWorkspaceClient } from "@/lib/supabase";
import {
  getSafeOAuthReturnPath,
  YOUTUBE_OAUTH_STATE_COOKIE,
  youtubeOAuthStateCookieOptions,
} from "@/modules/integrations/youtube/youtube-oauth.routes";
import { createSecretsService } from "@/server/services/secrets.service";
import {
  createYoutubeOAuthService,
  type YoutubeConnectionRepository,
} from "@/server/services/youtube/youtube-oauth.service";

const SAFE_YOUTUBE_CONNECTION_SELECT =
  "id, workspace_id, provider_account_email, token_expires_at, scopes, status, created_at, updated_at";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  if (isMockMode) {
    return NextResponse.redirect(new URL("/dashboard/channels", requestUrl));
  }

  const code = requestUrl.searchParams.get("code");
  const stateToken = requestUrl.searchParams.get("state");
  const providerError = requestUrl.searchParams.get("error");

  if (providerError) {
    return NextResponse.json({ error: providerError }, { status: 400 });
  }

  if (!code || !stateToken) {
    return NextResponse.json(
      { error: "Missing OAuth code or state" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get(YOUTUBE_OAUTH_STATE_COOKIE)?.value;

  if (!storedState || storedState !== stateToken) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  const supabase = await createWorkspaceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createYoutubeOAuthService({
    oauthClient: createYouTubeOAuthClient(),
    repository: createRouteYoutubeRepository(supabase),
    secrets: createSecretsService({
      encryptionKey: env.SECRETS_ENCRYPTION_KEY,
    }),
    stateSecret: env.SECRETS_ENCRYPTION_KEY,
  });
  let returnTo: string;

  try {
    const result = await service.completeOAuth({
      code,
      stateToken,
      userId: user.id,
    });
    returnTo = getSafeOAuthReturnPath(result.returnTo);
  } catch (error) {
    console.error("YouTube OAuth completion failed.", { error });

    const message =
      error instanceof Error ? error.message : "YouTube connection failed.";
    returnTo = `/dashboard/channels?youtube_error=${encodeURIComponent(message)}`;
  }

  const response = NextResponse.redirect(new URL(returnTo, requestUrl.origin));

  response.cookies.set(YOUTUBE_OAUTH_STATE_COOKIE, "", {
    ...youtubeOAuthStateCookieOptions,
    maxAge: 0,
  });

  return response;
}

function createRouteYoutubeRepository(
  supabase: Awaited<ReturnType<typeof createWorkspaceClient>>,
): YoutubeConnectionRepository {
  return {
    async createConnection(input) {
      const { data, error } = await supabase
        .from("youtube_connections")
        .insert(input)
        .select(SAFE_YOUTUBE_CONNECTION_SELECT)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    async getBillingPlan(workspaceId) {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    async getDefaultChannelId(workspaceId) {
      const { data, error } = await supabase
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
    async listChannelIds(workspaceId) {
      const { data, error } = await supabase
        .from("youtube_channels")
        .select("youtube_channel_id")
        .eq("workspace_id", workspaceId)
        .eq("status", "connected");

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map((row) => row.youtube_channel_id);
    },
    async updateConnectionStatus(input) {
      const { data, error } = await supabase
        .from("youtube_connections")
        .update({ status: input.status })
        .eq("workspace_id", input.workspaceId)
        .eq("id", input.connectionId)
        .select(SAFE_YOUTUBE_CONNECTION_SELECT)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    async upsertChannel(input) {
      const { data, error } = await supabase
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
