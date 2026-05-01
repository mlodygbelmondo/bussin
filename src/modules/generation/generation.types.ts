import type { Enums } from "@/lib/database.types";

export type GenerateChannel = {
  handle: string | null;
  id: string;
  isDefault: boolean;
  status: string;
  title: string;
};

export type GenerateImageAsset = {
  fileName: string | null;
  id: string;
  publicUrl: string | null;
  source: Enums<"asset_source">;
  storagePath: string;
};

export type GenerateDefaults = {
  durationSeconds: number;
  mood: string;
  style: string;
  trackCount: number;
};

export type GeneratePlan = {
  availableCredits: number;
  currentUsage: number;
  limit: number;
  name: string;
  planLimitReached: boolean;
};

export type GenerateScreenData = {
  channels: GenerateChannel[];
  defaults: GenerateDefaults;
  hasSunoConnection: boolean;
  images: GenerateImageAsset[];
  plan: GeneratePlan;
  workspaceId: string;
};

export type CreateGenerationActionState = {
  errors?: Partial<
    Record<
      | "duration_seconds"
      | "form"
      | "image_asset_id"
      | "mood"
      | "publish_mode"
      | "scheduled_at"
      | "style"
      | "target_youtube_channel_id"
      | "track_count",
      string
    >
  >;
  ok: false;
};
