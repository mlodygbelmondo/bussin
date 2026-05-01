import { describe, expect, it } from "vitest";
import { billingCheckoutSchema } from "@/server/validators/billing.validator";
import { createGenerationRequestSchema } from "@/server/validators/generation.validator";
import { createImageAssetSchema } from "@/server/validators/image-asset.validator";
import { createSunoConnectionSchema } from "@/server/validators/suno-connection.validator";
import { createYoutubeConnectionSchema } from "@/server/validators/youtube-connection.validator";
import { scheduleYoutubeUploadSchema } from "@/server/validators/youtube-upload.validator";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("backend validators", () => {
  it("validates generation request constraints", () => {
    expect(
      createGenerationRequestSchema.parse({
        style: "lofi house",
        mood: "focused",
        duration_seconds: 120,
        track_count: 3,
        publish_mode: "draft",
      }),
    ).toMatchObject({
      style: "lofi house",
      track_count: 3,
    });

    expect(() =>
      createGenerationRequestSchema.parse({
        style: "x",
        mood: "focused",
        duration_seconds: 20,
        track_count: 21,
        publish_mode: "schedule_later",
      }),
    ).toThrow();
  });

  it("validates asset, upload, connection, and billing inputs", () => {
    expect(
      createImageAssetSchema.parse({
        workspace_id: uuid,
        storage_path: `${uuid}/cover.png`,
        mime_type: "image/png",
        source: "uploaded",
      }),
    ).toMatchObject({ source: "uploaded" });

    expect(
      scheduleYoutubeUploadSchema.parse({
        track_id: uuid,
        video_render_id: uuid,
        youtube_channel_id: uuid,
        title: "Midnight Focus",
        privacy_status: "private",
        scheduled_at: "2026-06-01T10:00:00.000Z",
      }),
    ).toMatchObject({ status: "scheduled" });

    expect(
      createSunoConnectionSchema.parse({
        label: "Main Suno",
        cookie: "session=abc",
        api_url: "https://api.suno.example",
      }),
    ).toMatchObject({ label: "Main Suno" });

    expect(
      createYoutubeConnectionSchema.parse({
        provider_account_email: "creator@example.com",
        access_token: "access",
        refresh_token: "refresh",
        scopes: ["youtube.upload"],
      }),
    ).toMatchObject({ provider_account_email: "creator@example.com" });

    expect(
      billingCheckoutSchema.parse({
        workspace_id: uuid,
        plan: "creator",
      }),
    ).toMatchObject({ plan: "creator" });
  });
});
