import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DeckDescriptionField } from "./deck-description-field";

describe("DeckDescriptionField (STATES-deck-description.md §1)", () => {
  it("always draws the counter, at 0 / 240 when empty", () => {
    render(<DeckDescriptionField value="" onChange={() => {}} onBlur={() => {}} saving={false} refused={null} />);
    expect(screen.getByText("0 / 240")).toBeInTheDocument();
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
