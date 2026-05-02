export type SunoErrorCode =
  | "unauthorized"
  | "expired_cookie"
  | "api_unreachable"
  | "quota_exceeded"
  | "invalid_response"
  | "generation_failed"
  | "unsafe_url"
  | "timeout"
  | "unknown";

export type SunoLimits = {
  creditsLeft: number | null;
  monthlyLimit: number | null;
  monthlyUsage: number | null;
};

export type SunoGenerationInput = {
  finalPrompt: string;
  makeInstrumental: boolean;
  style: string;
  title: string;
  waitAudio: boolean;
  callbackUrl?: string;
};

export type SunoGenerationResult = {
  sunoTrackId: string;
};

export type SunoTrack = {
  id: string;
  audioUrl?: string | null;
  durationSeconds?: number | null;
  imageUrl?: string | null;
  status: "processing" | "ready" | "failed";
  title?: string | null;
};

export type SunoTrackStatus =
  | { status: "processing"; raw?: unknown }
  | { status: "failed"; failureReason: string; raw?: unknown }
  | {
      audioUrl: string;
      raw?: unknown;
      status: "ready";
      track: SunoTrack;
    };

export type SunoAdapter = {
  createCustomGeneration(
    input: SunoGenerationInput,
  ): Promise<SunoGenerationResult>;
  getLimits(): Promise<SunoLimits>;
  getTrackById(sunoTrackId: string): Promise<SunoTrack>;
  getTrackStatus(input: { sunoTrackId: string }): Promise<SunoTrackStatus>;
  testConnection(): Promise<{ ok: true; limits: SunoLimits }>;
};
