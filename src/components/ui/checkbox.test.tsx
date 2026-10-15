import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("is a native checkbox that reports the new state, with a box that is not read aloud", () => {
    const onChange = vi.fn();
    const { container } = render(<label><Checkbox checked={false} onChange={onChange} />Keep this frame</label>);
    const input = screen.getByLabelText("Keep this frame") as HTMLInputElement;
    fireEvent.click(input);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(container.querySelector("[aria-hidden]")).not.toBeNull();
    // The mark is a pseudo-element, so the label's text is only its own words.
    expect(container.querySelector("label")?.textContent).toBe("Keep this frame");
  });

  it("names itself when the label is not its name, and shows busy and disabled", () => {
    render(<Checkbox checked ariaLabel="Include Kinnan Ramp" busy disabled onChange={() => {}} />);
    const input = screen.getByRole("checkbox", { name: "Include Kinnan Ramp" });
    expect(input).toBeChecked();
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("aria-busy", "true");
  });
});
