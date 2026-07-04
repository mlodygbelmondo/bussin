export type YoutubeErrorCode =
  | "invalid_grant"
  | "expired_token"
  | "quota_exceeded"
  | "upload_failed"
  | "invalid_metadata"
  | "file_too_large"
  | "forbidden"
  | "unknown";

export type YoutubePrivacyStatus = "private" | "unlisted" | "public";

export type YoutubeChannel = {
  handle?: string | null;
  thumbnailUrl?: string | null;
  title: string;
  youtubeChannelId: string;
};

export type YoutubeOAuthTokens = {
  accessToken: string;
  expiryDate?: number | null;
  providerAccountEmail: string;
  refreshToken: string;
  scopes: string[];
};

export type YoutubeUploadInput = {
  description?: string | null;
  madeForKids?: boolean;
  privacyStatus: YoutubePrivacyStatus;
  publishAt?: string | null;
  tags?: string[] | null;
  title: string;
  video: Blob | ArrayBuffer | Uint8Array;
};

export type YoutubeUploadResult = {
  youtubeVideoId: string;
};

export type YoutubeOAuthClient = {
  createAuthUrl(input: { scopes: string[]; state: string }): string;
  exchangeCodeForTokens(code: string): Promise<YoutubeOAuthTokens>;
  listChannels(tokens: YoutubeOAuthTokens): Promise<YoutubeChannel[]>;
};

export type YoutubeUploadAdapter = {
  refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    expiryDate?: number | null;
  }>;
  schedulePublish(input: { publishAt: string; videoId: string }): Promise<void>;
  setMetadata(input: {
    description?: string | null;
    privacyStatus?: YoutubePrivacyStatus;
    tags?: string[] | null;
    title: string;
    videoId: string;
  }): Promise<void>;
  uploadVideo(input: YoutubeUploadInput): Promise<YoutubeUploadResult>;
};
