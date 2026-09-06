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
        "You own 24 legal commanders, but none of them are white-red.",
      ),
    ).toBeTruthy();
  });

  it("names the mono color for a single-color filter", () => {
    renderFilteredEmpty(["R"]);
    expect(screen.getByRole("heading").textContent).toBe("No generals in Red.");
    expect(
      screen.getByText(
        "You own 24 legal commanders, but none of them are red.",
      ),
    ).toBeTruthy();
  });

  it("keeps the 'Showing 0 of N' diagnostic", () => {
    renderFilteredEmpty(["W", "R"], 7);
    expect(screen.getByText("Showing 0 of 7")).toBeTruthy();
  });

  // The button is styled differently with a second affordance beside it, but
  // that is a layout branch, not two different buttons: a caller's label has to
  // survive it either way, or the prop reads as ignored.
  it("takes the caller's button label with or without a second affordance", () => {
    const { unmount } = render(
      <FilteredEmpty colors={["R"]} total={24} onClear={vi.fn()} cta="Clear the pips" />,
    );
    expect(screen.getByRole("button", { name: "Clear the pips" })).toBeTruthy();
    unmount();

    render(
      <FilteredEmpty
        colors={["R"]}
        total={24}
        onClear={vi.fn()}
        cta="Clear the pips"
        secondary={<span>or something else</span>}
      />,
    );
    expect(screen.getByRole("button", { name: "Clear the pips" })).toBeTruthy();
  });
});
