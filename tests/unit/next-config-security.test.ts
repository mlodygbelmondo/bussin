// @vitest-environment node

import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("Next.js security headers", () => {
  it("sets baseline browser security headers for all routes", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    expect(nextConfig.headers).toEqual(expect.any(Function));

    const routes = await nextConfig.headers!();
    const globalRoute = routes.find((route) => route.source === "/:path*");
    const headers = new Map(
      globalRoute?.headers.map((header) => [header.key, header.value]),
    );

    expect(headers.get("Content-Security-Policy-Report-Only")).toContain(
      "default-src 'self'",
    );
    expect(headers.get("Content-Security-Policy-Report-Only")).toContain(
      "frame-ancestors 'self'",
    );
    expect(headers.get("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
    expect(headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
  });
});
