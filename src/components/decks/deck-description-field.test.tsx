import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DeckDescriptionField } from "./deck-description-field";

describe("DeckDescriptionField (STATES-deck-description.md §1)", () => {
  it("always draws the counter, at 0 / 240 when empty", () => {
    render(<DeckDescriptionField value="" onChange={() => {}} onBlur={() => {}} saving={false} refused={null} />);
    expect(screen.getByText("0 / 240")).toBeInTheDocument();
  });

  it("reserves the counter's full width so the help text does not reflow as it grows a digit", () => {
    render(<DeckDescriptionField value="" onChange={() => {}} onBlur={() => {}} saving={false} refused={null} />);
    expect(screen.getByText("0 / 240")).toHaveStyle({ width: "9ch" });
  });

  // Round 5: an `aria-label` here used to override the visible `<label htmlFor>` with
  // different words ("Deck description" vs. "Describe your deck"), so a voice-control user
  // reading the label on screen could not target the field by it.
  it("takes its accessible name from the visible label, not a hidden override", () => {
    render(<DeckDescriptionField value="" onChange={() => {}} onBlur={() => {}} saving={false} refused={null} />);
    // `getByLabelText` alone does not catch this: it matches ANY association strategy
    // (an aria-label included), so the real test is the ARIA accessible-name computation,
    // which prefers aria-label over an associated <label> when both are present.
    expect(screen.getByRole("textbox")).toHaveAccessibleName("Describe your deck");
  });

  it("counts what is typed and calls onChange", () => {
    const onChange = vi.fn();
    render(<DeckDescriptionField value="" onChange={onChange} onBlur={() => {}} saving={false} refused={null} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Grind it out." } });
    expect(onChange).toHaveBeenCalledWith("Grind it out.");
  });

  it("refuses a change past the 240 cap", () => {
    const onChange = vi.fn();
    render(<DeckDescriptionField value="" onChange={onChange} onBlur={() => {}} saving={false} refused={null} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "a".repeat(241) } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("saves on blur", () => {
    const onBlur = vi.fn();
    render(<DeckDescriptionField value="x" onChange={() => {}} onBlur={onBlur} saving={false} refused={null} />);
    fireEvent.blur(screen.getByRole("textbox"));
    expect(onBlur).toHaveBeenCalledOnce();
  });

  it("draws the refusal when the save failed", () => {
    render(<DeckDescriptionField value="x" onChange={() => {}} onBlur={() => {}} saving={false} refused="That did not save. Try again." />);
    expect(screen.getByText("That did not save. Try again.")).toBeInTheDocument();
  });
});
