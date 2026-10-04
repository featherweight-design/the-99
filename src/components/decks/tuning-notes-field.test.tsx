import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TuningNotesField } from "./tuning-notes-field";

describe("TuningNotesField", () => {
  it("refuses to grow past 500 characters", () => {
    const onChange = vi.fn();
    render(<TuningNotesField value={"a".repeat(499)} onChange={onChange} />);
    const field = screen.getByLabelText("Additional notes");
    fireEvent.change(field, { target: { value: "a".repeat(500) } });
    expect(onChange).toHaveBeenCalledWith("a".repeat(500));
    onChange.mockClear();
    fireEvent.change(field, { target: { value: "a".repeat(501) } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows the counter at n / 500", () => {
    render(<TuningNotesField value="Nothing over $5" onChange={vi.fn()} />);
    expect(screen.getByText("15 / 500")).toBeInTheDocument();
  });

  it("clears the draft on Escape rather than committing it", () => {
    const onChange = vi.fn();
    render(<TuningNotesField value="more removal" onChange={onChange} />);
    fireEvent.keyDown(screen.getByLabelText("Additional notes"), { key: "Escape" });
    expect(onChange).toHaveBeenCalledWith("");
  });
});
