import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardCommandPalette } from "@/components/common/dashboard-command-palette";
import { filterDashboardCommandItems } from "@/components/common/dashboard-command-data";

const router = vi.hoisted(() => ({
  prefetch: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => router,
}));

describe("dashboard command palette", () => {
  beforeEach(() => {
    router.prefetch.mockClear();
    router.push.mockClear();
  });

  it("filters command options by page, status, and unknown query", () => {
    expect(filterDashboardCommandItems("billing")[0]?.href).toBe(
      "/dashboard/billing",
    );
    expect(filterDashboardCommandItems("failed")[0]?.href).toBe(
      "/dashboard/queue?status=failed",
    );
    expect(filterDashboardCommandItems("not-a-real-option")).toHaveLength(0);
  });

  it("opens with the keyboard shortcut and navigates to the selected result", () => {
    render(<DashboardCommandPalette />);

    fireEvent.keyDown(window, { ctrlKey: true, key: "k" });

    const input = screen.getByLabelText("Search dashboard commands");

    fireEvent.change(input, { target: { value: "failed" } });
    expect(screen.getByText("Open failed jobs")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Enter" });

    expect(router.push).toHaveBeenCalledWith("/dashboard/queue?status=failed");
  });
});
