import type { SafeSunoConnection } from "@/modules/integrations/suno/suno-connection.queries";
import type { YoutubeChannelRecord } from "@/modules/integrations/youtube/youtube-channel.actions";

export type OnboardingWorkspace = {
  id: string;
  name: string;
  onboarding_completed: boolean;
};

export type OnboardingYoutubeConnection = {
  id: string;
  status: string;
  workspace_id: string;
};

export type WorkspaceDefaults = {
  defaultChannelId: string;
  imageBehavior: "auto" | "manual";
  privacyStatus: "public" | "private" | "unlisted";
  timezone: string;
};

export type OnboardingData = {
  sunoConnections: SafeSunoConnection[];
  workspace: OnboardingWorkspace | null;
  workspaceDefaults: WorkspaceDefaults;
  youtubeChannels: YoutubeChannelRecord[];
  youtubeConnections: OnboardingYoutubeConnection[];
};
