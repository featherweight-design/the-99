import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { landingCopy } from "../../lib/copy/landing";
import { CostSheet } from "./cost-sheet";

const BUYING = { pack: { units: 40, priceCents: 500 }, plan: { units: 50, priceCents: 500 } };
const open = () => fireEvent.click(screen.getByRole("button", { name: landingCopy.credits.costLink }));

describe("CostSheet", () => {
  it("is closed until the link is pressed, and the link says it opens a dialog", () => {
    render(<CostSheet buying={BUYING} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: landingCopy.credits.costLink })).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("draws the pack and the plan from the figures it was handed", () => {
    render(<CostSheet buying={{ pack: { units: 80, priceCents: 900 }, plan: { units: 60, priceCents: 450 } }} />);
    open();
    const dialog = screen.getByRole("dialog", { name: landingCopy.sheet.title });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByText("$9")).toBeInTheDocument();
    expect(within(dialog).getByText("$4.50 a month")).toBeInTheDocument();
    expect(within(dialog).getByText("80 credits that never expire")).toBeInTheDocument();
    expect(within(dialog).getByText(landingCopy.sheet.foot)).toBeInTheDocument();
  });

  it("puts focus on the close control, and Escape closes it and returns focus to the link", () => {
    render(<CostSheet buying={BUYING} />);
    const link = screen.getByRole("button", { name: landingCopy.credits.costLink });
    link.focus();
    open();
    expect(screen.getByRole("button", { name: landingCopy.sheet.close })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(link).toHaveFocus();
  });

  it("holds Tab inside: with one stop, Tab and Shift+Tab are taken by the trap (wrapping from the dialog's other cases is `dialog.test.tsx`'s)", () => {
    render(<CostSheet buying={BUYING} />);
    open();
    const close = screen.getByRole("button", { name: landingCopy.sheet.close });
    for (const shiftKey of [false, true]) {
      const press = new KeyboardEvent("keydown", { key: "Tab", shiftKey, cancelable: true, bubbles: true });
      close.dispatchEvent(press);
      expect(press.defaultPrevented).toBe(true);
    }
  });

  it("is portalled out of the paragraph that holds its link", () => {
    render(<p><CostSheet buying={BUYING} /></p>);
    open();
    expect(screen.getByRole("dialog").closest("p")).toBeNull();
  });

  it("closes on the close press and on a press on the backdrop, but not on a press inside", () => {
    render(<CostSheet buying={BUYING} />);
    open();
    fireEvent.click(screen.getByText(landingCopy.sheet.foot));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: landingCopy.sheet.close }));
    expect(screen.queryByRole("dialog")).toBeNull();
    open();
    fireEvent.click(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks for no card or payment detail: no field of any kind", () => {
    render(<CostSheet buying={BUYING} />);
    open();
    expect(screen.getByRole("dialog").querySelector("input, select, textarea, form")).toBeNull();
  });
});
