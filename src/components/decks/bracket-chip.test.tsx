import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { chipAnswer } from "../../lib/bracket/chip-answer";
import { SpineBracketChip } from "./bracket-chip";

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
