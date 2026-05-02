import { describe, expect, it } from "vitest";
import { getMockTrackPreviewData } from "@/modules/dev/mock-data";

describe("mock track preview data", () => {
  it("returns the requested mock track preview", () => {
    const data = getMockTrackPreviewData("mock-track-neon");

    expect(data?.trackId).toBe("mock-track-neon");
    expect(data?.title).toBe("Neon Skyline");
  });

  it("returns null for unknown tracks so preview routes can render not-found", () => {
    expect(getMockTrackPreviewData("not-real-track")).toBeNull();
  });
});
