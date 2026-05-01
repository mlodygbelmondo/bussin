import type { SupabaseClient } from "@supabase/supabase-js";
import { isMockMode } from "@/lib/app-config";
import type { Database } from "@/lib/database.types";
import { mockOnboardingData } from "@/modules/dev/mock-data";
import type { OnboardingData } from "@/modules/onboarding/onboarding.types";

export async function getOnboardingData(input: {
  supabase: SupabaseClient<Database>;
  userId: string;
}): Promise<OnboardingData> {
  if (isMockMode) {
    return mockOnboardingData;
  }

  const { data: membership, error: membershipError } = await input.supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(id, name, onboarding_completed)")
    .eq("user_id", input.userId)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const workspace = Array.isArray(membership?.workspaces)
    ? membership?.workspaces[0]
    : membership?.workspaces;

  if (!workspace) {
    return createEmptyOnboardingData();
  }

  const [sunoConnections, youtubeConnections, youtubeChannels] =
    await Promise.all([
      input.supabase
        .from("suno_connections")
        .select(
          "id, workspace_id, label, status, credits_left, monthly_limit, monthly_usage, last_checked_at, last_error, created_at, updated_at",
        )
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false }),
      input.supabase
        .from("youtube_connections")
        .select("id, workspace_id, status")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false }),
      input.supabase
        .from("youtube_channels")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("is_default", { ascending: false })
        .order("title", { ascending: true }),
    ]);

  if (sunoConnections.error) {
    throw new Error(sunoConnections.error.message);
  }

  if (youtubeConnections.error) {
    throw new Error(youtubeConnections.error.message);
  }

  if (youtubeChannels.error) {
    throw new Error(youtubeChannels.error.message);
  }

  const defaultChannel =
    youtubeChannels.data.find((channel) => channel.is_default) ??
    youtubeChannels.data[0];

  return {
    sunoConnections: sunoConnections.data.map((connection) => ({
      ...connection,
      maskedApiUrl: "Connected endpoint",
      maskedCookie: "Stored securely",
    })),
    workspace,
    workspaceDefaults: {
      defaultChannelId: defaultChannel?.id ?? "",
      imageBehavior: "auto",
      privacyStatus: "public",
      timezone: "America/Los_Angeles",
    },
    youtubeChannels: youtubeChannels.data,
    youtubeConnections: youtubeConnections.data,
  };
}

export function createEmptyOnboardingData(): OnboardingData {
  if (isMockMode) {
    return mockOnboardingData;
  }

  return {
    sunoConnections: [],
    workspace: null,
    workspaceDefaults: {
      defaultChannelId: "",
      imageBehavior: "auto",
      privacyStatus: "public",
      timezone: "America/Los_Angeles",
    },
    youtubeChannels: [],
    youtubeConnections: [],
  };
}
