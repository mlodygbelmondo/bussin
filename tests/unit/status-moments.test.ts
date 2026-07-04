import { describe, expect, it } from "vitest";
import { resolveStatusMoment } from "@/modules/feed/status-moments";

describe("resolveStatusMoment", () => {
  it("celebrates a track flipping from generating to ready", () => {
    expect(resolveStatusMoment("generating", "preview_ready")).toBe("ready");
  });

  it("celebrates any transition into published", () => {
    expect(resolveStatusMoment("uploading", "published")).toBe("published");
    expect(resolveStatusMoment("scheduled", "published")).toBe("published");
  });

  it("celebrates arming a schedule", () => {
    expect(resolveStatusMoment("preview_ready", "scheduled")).toBe("scheduled");
  });

  it("stays silent when the status does not change", () => {
    expect(resolveStatusMoment("published", "published")).toBeNull();
    expect(resolveStatusMoment("scheduled", "scheduled")).toBeNull();
  });

  it("stays silent on non-celebratory transitions", () => {
    expect(resolveStatusMoment("preview_ready", "rendering")).toBeNull();
    expect(resolveStatusMoment("rendering", "uploading")).toBeNull();
    expect(resolveStatusMoment("generating", "failed")).toBeNull();
    expect(resolveStatusMoment("preview_ready", "discarded")).toBeNull();
    // Ready is only celebrated when composing finishes, not on e.g. a
    // schedule cancel returning to preview_ready.
    expect(resolveStatusMoment("scheduled", "preview_ready")).toBeNull();
  });
});
