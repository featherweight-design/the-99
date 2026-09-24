import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { chipAnswer } from "../../lib/bracket/chip-answer";
import { BracketChip, SpineBracketChip } from "./bracket-chip";

describe("SpineBracketChip", () => {
  it("draws nothing for an unread deck", () => {
    const { container } = render(<SpineBracketChip bracket={null} onOpen={() => {}} />);
    expect(container.innerHTML).toBe("");
  });

  // Round 0 §5: tapping the chip lands on the Analysis tab.
  it("opens the analysis when pressed, and says so", () => {
    const onOpen = vi.fn();
    render(<SpineBracketChip bracket={{ permits: [1, 2], answered: null }} onOpen={onOpen} />);
    const button = screen.getByRole("button", { name: /Bracket: .*Open the analysis/ });
    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe("chipAnswer", () => {
  it("answers a range only with a declaration inside it", () => {
    expect(chipAnswer([1, 2], 2)).toBe(2);
    expect(chipAnswer([1, 2], null)).toBeNull();
    // Drift keeps the range's own face rather than asserting a bracket the cards contradict.
    expect(chipAnswer([1, 2], 4)).toBeNull();
    // A single bracket is not a question.
    expect(chipAnswer([3], 3)).toBeNull();
  });
});

// The Home addendum's marks-only form (R1). `face` is additive: every mount that does not pass it
// must draw exactly what it drew before the prop existed, so the default's class is pinned as the
// literal string it shipped with rather than derived from the component.
describe("BracketChip face", () => {
  const SHIPPED =
    "inline-flex h-[22px] flex-none items-center gap-[5px] whitespace-nowrap rounded-[6px] border pl-[2px] pr-[8px] md:h-[24px]";

  it("draws the name by default, with the shipped classes", () => {
    render(<BracketChip permits={[4, 5]} />);
    const chip = screen.getByTestId("bracket-chip");
    expect(chip.className).toBe(SHIPPED);
    expect(chip.textContent).toContain("Optimized or cEDH");
  });

  it("face={false} keeps the plate and both marks and drops the name", () => {
    const { container } = render(<BracketChip permits={[4, 5]} face={false} />);
    const chip = screen.getByTestId("bracket-chip");
    expect(chip.className).toBe(SHIPPED.replace("pr-[8px]", "pr-[2px]"));
    expect(chip.textContent).not.toContain("Optimized");
    expect(chip.textContent).not.toContain("cEDH");
    expect(chip.getAttribute("data-bracket")).toBe("4-5");
    expect(container.querySelectorAll('[data-testid="bracket-mark"]')).toHaveLength(2);
  });
});
