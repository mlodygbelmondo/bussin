import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardKpiCard } from "@/modules/dashboard/kpi-card";
import type { DashboardKpi } from "@/modules/dashboard/dashboard.types";

describe("DashboardKpiCard", () => {
  it("renders the KPI label, value, and trend", () => {
    const kpi: DashboardKpi = {
      icon: "tracks",
      label: "Generated tracks",
      tone: "violet",
      trendLabel: "+ 12%",
      trendTone: "positive",
      value: "128",
    };

    render(<DashboardKpiCard kpi={kpi} />);

    expect(screen.getByTestId("kpi-card-tracks")).toBeInTheDocument();
    expect(screen.getByText("Generated tracks")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText("+ 12%")).toBeInTheDocument();
  });
});
