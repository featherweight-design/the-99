import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SteadyLabel } from "./steady-label";

describe("SteadyLabel", () => {
  it("draws the label once, with every word it can show held in data-hold and not in the markup", () => {
    const { container } = render(
      <button>
        <SteadyLabel hold={["Sending…", undefined, "Send the invite"]}>Send the invite</SteadyLabel>
      </button>,
    );
    expect(screen.getAllByText(/Send/)).toHaveLength(1);
    expect(screen.getByRole("button").textContent).toBe("Send the invite");
    expect(container.querySelector("[data-hold]")?.getAttribute("data-hold")).toBe("Sending…\nSend the invite");
  });
});
