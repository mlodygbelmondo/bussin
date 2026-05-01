import { describe, expect, it } from "vitest";
import { createGenerationRequestSchema } from "@/server/validators/generation.validator";

const validInput = {
  duration_seconds: 150,
  mood: "nostalgic, uplifting",
  publish_mode: "draft",
  style: "synthwave, retrowave",
  target_youtube_channel_id: "11111111-1111-4111-8111-111111111111",
  track_count: 1,
};

describe("create generation validation", () => {
  it("accepts the simple creator form inputs", () => {
    const parsed = createGenerationRequestSchema.parse(validInput);

    expect(parsed).toMatchObject({
      duration_seconds: 150,
      mood: "nostalgic, uplifting",
      publish_mode: "draft",
      style: "synthwave, retrowave",
      track_count: 1,
    });
  });

  it("requires a schedule date when schedule later is selected", () => {
    const parsed = createGenerationRequestSchema.safeParse({
      ...validInput,
      publish_mode: "schedule_later",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.path).toEqual(["scheduled_at"]);
  });

  it("rejects invalid duration and track counts", () => {
    const parsed = createGenerationRequestSchema.safeParse({
      ...validInput,
      duration_seconds: 10,
      track_count: 0,
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining(["duration_seconds", "track_count"]),
    );
  });
});
