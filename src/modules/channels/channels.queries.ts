import { createWorkspaceClient } from "@/lib/supabase";
import { isMockMode } from "@/lib/app-config";
import { mockChannelsScreenData } from "@/modules/dev/mock-data";
import { getPlanLimits } from "@/server/services/plan-limits.service";
import type { BillingPlan } from "@/server/validators/billing.validator";
import type {
  ChannelCardItem,
  ChannelsScreenData,
  ChannelsStatusTone,
  ChannelStatus,
  ConnectionStatus,
  SunoConnectionStatus,
} from "@/modules/channels/channels.types";

type YoutubeChannelRow = {
  created_at: string;
  handle: string | null;
  id: string;
  is_default: boolean;
  last_sync_at: string | null;
  status: string;
  thumbnail_url: string | null;
  title: string;
  youtube_channel_id: string;
  youtube_connection_id: string | null;
};

type YoutubeConnectionRow = {
  id: string;
  provider_account_email: string | null;
  status: string;
};

type SunoConnectionRow = {
  credits_left: number | null;
  id: string;
  label: string | null;
  last_checked_at: string | null;
  last_error: string | null;
  monthly_limit: number | null;
  monthly_usage: number | null;
  status: string;
  updated_at: string;
};

export async function getChannelsScreenData(
  userId: string,
): Promise<ChannelsScreenData | null> {
  if (isMockMode) {
    return mockChannelsScreenData;
  }

  const supabase = await createWorkspaceClient();
  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership) {
    return null;
  }

  const workspaceId = String(membership.workspace_id);
  const [
    channelsResult,
    connectionsResult,
    sunoResult,
    subscriptionResult,
    usageResult,
  ] = await Promise.all([
    supabase
      .from("youtube_channels")
      .select(
        "id, youtube_connection_id, youtube_channel_id, title, handle, thumbnail_url, is_default, status, last_sync_at, created_at",
      )
      .eq("workspace_id", workspaceId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("youtube_connections")
      .select("id, provider_account_email, status")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("suno_connections")
      .select(
        "id, label, status, credits_left, monthly_usage, monthly_limit, last_checked_at, last_error, updated_at",
      )
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("plan")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    supabase
      .from("usage_counters")
      .select("connected_channels_count")
      .eq("workspace_id", workspaceId)
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  for (const result of [
    channelsResult,
    connectionsResult,
    sunoResult,
    subscriptionResult,
    usageResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const subscription = subscriptionResult.data as { plan?: string } | null;
  const usageCounter = usageResult.data as {
    connected_channels_count?: number;
  } | null;
  const planName = toBillingPlan(subscription?.plan);
  const limit = getPlanLimits(planName).youtubeChannels;
  const connectionsById = new Map(
    ((connectionsResult.data ?? []) as YoutubeConnectionRow[]).map(
      (connection) => [connection.id, connection],
    ),
  );
  const channels = ((channelsResult.data ?? []) as YoutubeChannelRow[]).map(
    (channel, index) =>
      toChannelCardItem({
        channel,
        connection: channel.youtube_connection_id
          ? connectionsById.get(channel.youtube_connection_id)
          : undefined,
        index,
      }),
  );
  const connected = channels.filter(
    (channel) => channel.status === "connected",
  ).length;
  const issues = channels.filter(
    (channel) => channel.status !== "connected",
  ).length;
  const usage = usageCounter?.connected_channels_count ?? channels.length;

  return {
    channels,
    counts: {
      connected,
      healthy: channels.filter(
        (channel) =>
          channel.status === "connected" &&
          (channel.youtubeConnectionId
            ? connectionsById.get(channel.youtubeConnectionId)?.status
            : undefined) !== "error",
      ).length,
      issues,
    },
    defaultChannel: channels.find((channel) => channel.isDefault) ?? null,
    hasPlanLimitReached: usage >= limit,
    plan: {
      limit,
      name: planName,
      usage,
    },
    suno: toSunoStatus((sunoResult.data ?? null) as SunoConnectionRow | null),
    workspaceId,
  };
}

function toChannelCardItem(input: {
  channel: YoutubeChannelRow;
  connection?: YoutubeConnectionRow;
  index: number;
}): ChannelCardItem {
  const connectionStatus = toConnectionStatus(input.connection?.status);
  const status =
    connectionStatus === "expired" || connectionStatus === "error"
      ? "error"
      : toChannelStatus(input.channel.status);

  return {
    connectedAccount:
      input.connection?.provider_account_email ?? "Connected account",
    handle: input.channel.handle,
    id: input.channel.id,
    isDefault: input.channel.is_default,
    lastSyncLabel: formatRelativeTime(input.channel.last_sync_at),
    status,
    statusLabel:
      connectionStatus === "expired"
        ? "Expired"
        : status === "connected"
          ? "Connected"
          : status === "disconnected"
            ? "Disconnected"
            : "Sync issue",
    statusTone: statusTone(status),
    subscribersLabel: fakeSubscriberLabel(input.channel.youtube_channel_id),
    thumbnailUrl: input.channel.thumbnail_url,
    title: input.channel.title,
    youtubeConnectionId: input.channel.youtube_connection_id,
    youtubeChannelId: input.channel.youtube_channel_id,
  };
}

function toSunoStatus(row: SunoConnectionRow | null): SunoConnectionStatus {
  if (!row) {
    return {
      checkedLabel: "Not tested yet",
      creditsLabel: "No active usage",
      emailLabel: "Connect Suno to unlock generation credits",
      id: null,
      label: "Suno Account",
      status: "disconnected",
      statusLabel: "Disconnected",
      statusTone: "slate",
    };
  }

  const status = row.status === "connected" ? "connected" : "error";
  const monthlyLimit = row.monthly_limit ?? 0;
  const monthlyUsage = row.monthly_usage ?? 0;

  return {
    checkedLabel: row.last_checked_at
      ? `Checked ${formatRelativeTime(row.last_checked_at)}`
      : "Awaiting first test",
    creditsLabel:
      monthlyLimit > 0
        ? `${formatNumber(monthlyUsage)} / ${formatNumber(monthlyLimit)}`
        : row.credits_left === null
          ? "Usage unavailable"
          : `${formatNumber(row.credits_left)} credits left`,
    emailLabel: row.last_error
      ? `Last error: ${row.last_error}`
      : row.updated_at
        ? `Member since ${formatDate(row.updated_at)}`
        : "Connection saved",
    id: row.id,
    label: row.label ?? "Suno Account",
    status: row.status,
    statusLabel: status === "connected" ? "Connected" : "Needs attention",
    statusTone: status === "connected" ? "emerald" : "red",
  };
}

function toBillingPlan(plan: string | null | undefined): BillingPlan {
  return ["trial", "creator", "pro", "studio"].includes(plan ?? "")
    ? (plan as BillingPlan)
    : "trial";
}

function toChannelStatus(status: string): ChannelStatus {
  return status === "disconnected" || status === "error" ? status : "connected";
}

function toConnectionStatus(
  status: string | null | undefined,
): ConnectionStatus {
  return ["connected", "disconnected", "expired", "error"].includes(
    status ?? "",
  )
    ? (status as ConnectionStatus)
    : "connected";
}

function statusTone(status: ChannelStatus): ChannelsStatusTone {
  if (status === "connected") {
    return "emerald";
  }

  return status === "disconnected" ? "amber" : "red";
}

function formatRelativeTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.round(elapsed / 60000));

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);

  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return Intl.NumberFormat("en").format(value);
}

function fakeSubscriberLabel(seed: string) {
  const total = Array.from(seed).reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0,
  );
  const value = ((total % 92) + 18) / 10;

  return `${value.toFixed(1)}K subscribers`;
}
