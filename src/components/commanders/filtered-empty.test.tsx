import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilteredEmpty } from "./filtered-empty";

// Forced-state coverage for the richness pass's filtered-to-zero re-skin. The
// state is only reachable in the running app behind auth, so the rendered
// strings and the retained diagnostic are pinned here instead.

function renderFilteredEmpty(colors: string[], total = 24) {
  return render(<FilteredEmpty colors={colors} total={total} onClear={vi.fn()} />);
}

describe("FilteredEmpty", () => {
  it("reproduces the Surfaces v2 heading and caption", () => {
    renderFilteredEmpty(["W", "R"]);
    expect(screen.getByRole("heading").textContent).toBe("No generals in Boros.");
    expect(
      screen.getByText(
        "Your collection has opinions about white-red. All 24 candidates are one filter away.",
      ),
    ).toBeTruthy();
  });

  it("names the mono color for a single-color filter", () => {
    renderFilteredEmpty(["R"]);
    expect(screen.getByRole("heading").textContent).toBe("No generals in Red.");
    expect(
      screen.getByText(
        "Your collection has opinions about red. All 24 candidates are one filter away.",
      ),
    ).toBeTruthy();
  });

  it("keeps the 'Showing 0 of N' diagnostic", () => {
    renderFilteredEmpty(["W", "R"], 7);
    expect(screen.getByText("Showing 0 of 7")).toBeTruthy();
  });
});
