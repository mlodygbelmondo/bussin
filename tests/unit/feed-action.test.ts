import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { runFeedAction } from "@/modules/feed/feed-action";

const state = { mockMode: false };

vi.mock("@/lib/app-config", () => ({
  get isMockMode() {
    return state.mockMode;
  },
}));

const requireWorkspace = vi.fn();

vi.mock("@/modules/feed/workspace-context", () => ({
  requireWorkspace: (...args: unknown[]) => requireWorkspace(...args),
}));

const revalidatePath = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

const ctx = {
  supabase: {},
  user: { id: "user-1" },
  userId: "user-1",
  workspaceId: "workspace-1",
};

const schema = z.object({
  trackId: z.string().min(1, "Missing track id."),
});

function makeFormData(entries: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.append(key, value);
  }

  return formData;
}

function baseOptions(overrides: Record<string, unknown> = {}) {
  return {
    errorFallback: "Could not do the thing.",
    formData: makeFormData({ trackId: "track-1" }),
    mockMessage: "Mock thing done.",
    run: vi.fn(async () => ({ message: "Thing done.", ok: true })),
    schema,
    values: (form: FormData) => ({
      trackId: String(form.get("trackId") ?? ""),
    }),
    ...overrides,
  };
}

beforeEach(() => {
  state.mockMode = false;
  requireWorkspace.mockReset().mockResolvedValue(ctx);
  revalidatePath.mockReset();
});

describe("runFeedAction", () => {
  it("short-circuits in mock mode before any work", async () => {
    state.mockMode = true;
    const options = baseOptions();

    const result = await runFeedAction(options);

    expect(result).toEqual({ message: "Mock thing done.", ok: true });
    expect(requireWorkspace).not.toHaveBeenCalled();
    expect(options.run).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns the first Zod issue message on invalid input", async () => {
    const options = baseOptions({ formData: makeFormData({}) });

    const result = await runFeedAction(options);

    expect(result).toEqual({ message: "Missing track id.", ok: false });
    expect(options.run).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("maps a thrown Error to its message", async () => {
    const options = baseOptions({
      run: vi.fn(async () => {
        throw new Error("Render exploded.");
      }),
    });

    const result = await runFeedAction(options);

    expect(result).toEqual({ message: "Render exploded.", ok: false });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("maps a thrown non-Error to the fallback message", async () => {
    const options = baseOptions({
      run: vi.fn(async () => {
        throw "nope";
      }),
    });

    const result = await runFeedAction(options);

    expect(result).toEqual({ message: "Could not do the thing.", ok: false });
  });

  it("revalidates the dashboard and passes context on success", async () => {
    const options = baseOptions();

    const result = await runFeedAction(options);

    expect(result).toEqual({ message: "Thing done.", ok: true });
    expect(options.run).toHaveBeenCalledWith({
      ctx,
      input: { trackId: "track-1" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("does not revalidate when run returns a domain failure", async () => {
    const options = baseOptions({
      run: vi.fn(async () => ({ message: "Already publishing.", ok: false })),
    });

    const result = await runFeedAction(options);

    expect(result).toEqual({ message: "Already publishing.", ok: false });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("lets requireWorkspace redirects propagate", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    requireWorkspace.mockRejectedValue(redirectError);

    await expect(runFeedAction(baseOptions())).rejects.toBe(redirectError);
  });
});
