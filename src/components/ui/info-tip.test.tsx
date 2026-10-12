import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InfoTip } from "./info-tip";

afterEach(cleanup);

const draw = (props: { phoneAbove?: boolean } = {}) =>
  render(<div className="relative"><InfoTip id="t" lines={["One."]} label="More" {...props} /></div>);
const button = () => screen.getByRole("button", { name: "More" });
const tip = () => screen.getByRole("tooltip", { hidden: true });

describe("InfoTip", () => {
  it("opens on a touch press, before the click that follows the lift", () => {
    draw();
    fireEvent.pointerDown(button(), { pointerType: "touch" });
    expect(tip().hidden).toBe(false);
    // The click that ends the same press is the press already handled, not a second toggle.
    fireEvent.click(button());
    expect(tip().hidden).toBe(false);
    fireEvent.pointerDown(button(), { pointerType: "touch" });
    fireEvent.click(button());
    expect(tip().hidden).toBe(true);
  });

  it("toggles on a click with no press before it (keyboard, assistive tech) and on a mouse click", () => {
    draw();
    fireEvent.click(button());
    expect(tip().hidden).toBe(false);
    fireEvent.pointerDown(button(), { pointerType: "mouse" });
    fireEvent.click(button());
    expect(tip().hidden).toBe(true);
  });

  it("does not take focus from the field it sits in when pressed", () => {
    draw();
    expect(fireEvent.mouseDown(button())).toBe(false);
  });

  it("opens above its anchor on a phone only when asked to", () => {
    draw({ phoneAbove: true });
    expect(tip().className).toContain("max-md:bottom-[calc(100%+6px)]");
    cleanup();
    draw();
    expect(tip().className).not.toContain("max-md:bottom-");
  });
});
