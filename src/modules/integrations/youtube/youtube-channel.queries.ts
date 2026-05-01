import type {
  YoutubeChannelRecord,
  YoutubeChannelRepository,
} from "@/modules/integrations/youtube/youtube-channel.actions";

export async function listYoutubeChannels(input: {
  repository: Pick<YoutubeChannelRepository, "listChannels">;
  workspaceId: string;
}): Promise<YoutubeChannelRecord[]> {
  return input.repository.listChannels(input.workspaceId);
}
