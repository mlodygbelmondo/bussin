import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "@/components/common/empty-state";

describe("EmptyState", () => {
  it("renders the provided title and description", () => {
    render(
      <EmptyState
        description="Create your first generation to see it here."
        title="No generations yet"
      />,
    );

    expect(screen.getByText("No generations yet")).toBeInTheDocument();
    expect(
      screen.getByText("Create your first generation to see it here."),
    ).toBeInTheDocument();
  });
});
