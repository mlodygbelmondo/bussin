import type { Tables, TablesInsert } from "@/lib/database.types";

export type YoutubeChannelRecord = Partial<Tables<"youtube_channels">> & {
  id: string;
  workspace_id: string;
  youtube_channel_id: string;
};

export type YoutubeChannelRepository = {
  listChannels(workspaceId: string): Promise<YoutubeChannelRecord[]>;
  setDefaultChannel(input: {
    channelId: string;
    workspaceId: string;
  }): Promise<void>;
  upsertChannel(
    input: Pick<
      TablesInsert<"youtube_channels">,
      | "handle"
      | "is_default"
      | "last_sync_at"
      | "status"
      | "thumbnail_url"
      | "title"
      | "workspace_id"
      | "youtube_channel_id"
      | "youtube_connection_id"
    >,
  ): Promise<YoutubeChannelRecord>;
};

export function createYoutubeChannelActions(input: {
  repository: YoutubeChannelRepository;
}) {
  return {
    listChannels(workspaceId: string) {
      return input.repository.listChannels(workspaceId);
    },
    setDefaultChannel(params: { channelId: string; workspaceId: string }) {
      return input.repository.setDefaultChannel(params);
    },
  };
}
