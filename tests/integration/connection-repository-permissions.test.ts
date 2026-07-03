// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("connection repository permissions", () => {
  it("does not request encrypted Suno columns through the onboarding user client", async () => {
    const source = await readFile(
      join(process.cwd(), "src/modules/onboarding/onboarding.actions.ts"),
      "utf8",
    );

    expect(source).not.toMatch(
      /\.from\("suno_connections"\)[\s\S]{0,120}\.select\("\*"\)/,
    );
    expect(source).toContain("SAFE_SUNO_CONNECTION_SELECT");
  });

  it("does not request encrypted YouTube columns through the OAuth callback user client", async () => {
    const source = await readFile(
      join(process.cwd(), "src/app/api/youtube/oauth/callback/route.ts"),
      "utf8",
    );

    expect(source).not.toMatch(
      /\.from\("youtube_connections"\)[\s\S]{0,120}\.select\("\*"\)/,
    );
    expect(source).toContain("SAFE_YOUTUBE_CONNECTION_SELECT");
  });
});
