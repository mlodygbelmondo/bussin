import type { BillingPlan } from "@/server/validators/billing.validator";

export type ChannelStatus = "connected" | "disconnected" | "error";
export type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "expired"
  | "error";

export type ChannelsActionResult = {
  message: string;
  ok: boolean;
};

export type ChannelsStatusTone = "amber" | "emerald" | "red" | "slate";

export type ChannelCardItem = {
  connectedAccount: string;
  handle: string | null;
  id: string;
  isDefault: boolean;
  lastSyncLabel: string;
  status: ChannelStatus;
  statusLabel: string;
  statusTone: ChannelsStatusTone;
  subscribersLabel: string;
  thumbnailUrl: string | null;
  title: string;
  youtubeConnectionId: string | null;
  youtubeChannelId: string;
};

export type SunoConnectionStatus = {
  checkedLabel: string;
  creditsLabel: string;
  emailLabel: string;
  id: string | null;
  label: string;
  status: string;
  statusLabel: string;
  statusTone: ChannelsStatusTone;
};

export type ChannelsScreenData = {
  channels: ChannelCardItem[];
  counts: {
    connected: number;
    healthy: number;
    issues: number;
  };
  defaultChannel: ChannelCardItem | null;
  hasPlanLimitReached: boolean;
  plan: {
    limit: number;
    name: BillingPlan;
    usage: number;
  };
  suno: SunoConnectionStatus;
  workspaceId: string;
};
