import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  QueueProgress,
  QueueStatusChip,
} from "@/modules/queue/queue-components";

describe("queue components", () => {
  it("renders a status chip for the queue state", () => {
    render(<QueueStatusChip label="Generating" status="generating" />);

    expect(screen.getByTestId("status-chip-generating")).toHaveTextContent(
      "Generating",
    );
  });

  it("renders progress with the current percentage", () => {
    render(<QueueProgress progress={72} status="generating" />);

    expect(screen.getByTestId("queue-progress")).toHaveTextContent(
      "72% complete",
    );
  });
});
