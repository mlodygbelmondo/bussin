import { describe, expect, it } from "vitest";
import { generationRequestSchema } from "@/lib/schemas/jobs";

describe("generationRequestSchema", () => {
  it("accepts a valid generation request", () => {
    expect(
      generationRequestSchema.safeParse({
        prompt: "Energetic synthwave track for a product launch",
        title: "Launch Loop",
      }).success,
    ).toBe(true);
  });

  it("rejects too-short prompts", () => {
    expect(
      generationRequestSchema.safeParse({
        prompt: "x",
        title: "Nope",
      }).success,
    ).toBe(false);
  });
});
