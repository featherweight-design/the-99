import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WantStepper } from "./want-stepper";

const labels = { fewerLabel: "Want one fewer", moreLabel: "Want one more", countLabel: "want" };

describe("WantStepper", () => {
  it("steps by one either way, handing the next count to the caller", () => {
    const onChange = vi.fn();
    render(<WantStepper value={3} onChange={onChange} {...labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Want one more" }));
    fireEvent.click(screen.getByRole("button", { name: "Want one fewer" }));
    expect(onChange.mock.calls).toEqual([[4], [2]]);
  });

  it("does nothing below 1 or above 99, and says so without dropping focus", () => {
    const onChange = vi.fn();
    const { rerender } = render(<WantStepper value={1} onChange={onChange} {...labels} />);
    const fewer = screen.getByRole("button", { name: "Want one fewer" });
    expect(fewer.getAttribute("aria-disabled")).toBe("true");
    expect(fewer.hasAttribute("disabled")).toBe(false);
    fireEvent.click(fewer);
    rerender(<WantStepper value={99} onChange={onChange} {...labels} />);
    const more = screen.getByRole("button", { name: "Want one more" });
    expect(more.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(more);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Want one fewer" }).hasAttribute("aria-disabled")).toBe(false);
  });

  it("reads the count out as it moves", () => {
    render(<WantStepper value={2} onChange={() => {}} {...labels} />);
    const count = screen.getByLabelText("want");
    expect(count.textContent).toBe("2");
    expect(count.getAttribute("aria-live")).toBe("polite");
  });

  it("takes focus on its first draw only when asked", () => {
    const { unmount } = render(<WantStepper value={1} onChange={() => {}} {...labels} />);
    expect(document.activeElement).toBe(document.body);
    unmount();
    render(<WantStepper value={1} onChange={() => {}} {...labels} focusOnMount />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Want one more" }));
  });
});
