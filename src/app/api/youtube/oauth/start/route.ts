import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { isMockMode } from "@/lib/app-config";
import { env } from "@/lib/env";
import {
  createYouTubeOAuthClient,
  youtubeScopes,
} from "@/lib/integrations/youtube";
import { createClient } from "@/lib/supabase/server";
import {
  getSafeOAuthReturnPath,
  YOUTUBE_OAUTH_STATE_COOKIE,
  youtubeOAuthStateCookieOptions,
} from "@/modules/integrations/youtube/youtube-oauth.routes";
import { createOAuthStateToken } from "@/server/services/youtube/youtube-oauth.service";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  if (isMockMode) {
    return NextResponse.redirect(new URL("/dashboard/channels", requestUrl));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = await resolveWorkspaceId({
    requestedWorkspaceId: requestUrl.searchParams.get("workspaceId"),
    supabase,
    userId: user.id,
  });

  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace missing" }, { status: 409 });
  }

  const stateToken = createOAuthStateToken(
    {
      expiresAt: Date.now() + 10 * 60 * 1000,
      nonce: randomBytes(16).toString("base64url"),
      returnTo: getSafeOAuthReturnPath(requestUrl.searchParams.get("returnTo")),
      userId: user.id,
      workspaceId,
    },
    env.SECRETS_ENCRYPTION_KEY,
  );
  const url = createYouTubeOAuthClient().createAuthUrl({
    scopes: youtubeScopes,
    state: stateToken,
  });
  const response = NextResponse.redirect(url);

  response.cookies.set(
    YOUTUBE_OAUTH_STATE_COOKIE,
    stateToken,
    youtubeOAuthStateCookieOptions,
  );

  return response;
}

async function resolveWorkspaceId(input: {
  requestedWorkspaceId: string | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}) {
  let query = input.supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", input.userId)
    .limit(1);

  if (input.requestedWorkspaceId) {
    query = query.eq("workspace_id", input.requestedWorkspaceId);
  }

  const { data } = await query.maybeSingle();

  return data?.workspace_id ?? null;
}
