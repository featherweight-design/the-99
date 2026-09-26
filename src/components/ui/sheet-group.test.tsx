import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SheetGroupHeading, SheetGroupToggle } from "./sheet-group";

// The markup the swap sheet's `StandInGroup` draws (addendum §1b). Both sheets read it from here, so a
// change to it is a change to both, and this pins what that is.
describe("SheetGroupHeading", () => {
  it("draws the heading as mono 9.5px caps over a `--border` rule, the note at the right", () => {
    render(<SheetGroupHeading label="Ramp · 12" note="by fit" />);
    const h = screen.getByRole("heading", { name: "Ramp · 12" });
    expect(h.tagName).toBe("H4");
    expect(h.className).toBe("m-0 font-mono font-normal text-[9.5px] tracking-[0.12em] uppercase");
    expect(h.getAttribute("style")).toContain("var(--fg-faint)");
    const row = h.parentElement!;
    expect(row.className).toBe("flex items-baseline justify-between gap-[10px] pb-[6px] border-b border-[color:var(--border)]");
    const note = screen.getByText("by fit");
    expect(note.className).toBe("font-mono text-[10px] whitespace-nowrap");
    expect(note.getAttribute("style")).toContain("var(--fg-locked)");
  });

  it("takes the heading level from its caller", () => {
    render(<SheetGroupHeading as="h3" label="Yours · 3" note="by figure" />);
    expect(screen.getByRole("heading", { name: "Yours · 3" }).tagName).toBe("H3");
  });
});

describe("SheetGroupToggle", () => {
  it("is 44px on a phone and 34px from md, with the label and a ▾ while folded", () => {
    const onToggle = vi.fn();
    render(<SheetGroupToggle all={false} onToggle={onToggle} label="Show all 12 cards" fewer="Show fewer" />);
    const b = screen.getByRole("button", { name: /Show all 12 cards/ });
    expect(b.getAttribute("aria-expanded")).toBe("false");
    expect(b.className).toContain("min-h-[44px] md:min-h-[34px]");
    expect(b.className).toContain("pl-[43px]");
    expect(b.className).toContain("text-[12.5px] font-medium text-[color:var(--accent)]");
    expect(b.textContent).toBe("Show all 12 cards▾");
    fireEvent.click(b);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("reads Show fewer and ▴ while expanded, and lets the caller move the indent", () => {
    render(<SheetGroupToggle all onToggle={() => {}} label="Show all 12" fewer="Show fewer" className="pl-[68px]" />);
    const b = screen.getByRole("button", { name: /Show fewer/ });
    expect(b.getAttribute("aria-expanded")).toBe("true");
    expect(b.textContent).toBe("Show fewer▴");
    expect(b.className).toContain("pl-[68px]");
    expect(b.className).not.toContain("pl-[43px]");
  });
});

describe("SheetGroupToggle busy", () => {
  it("is busy and not pressable while it fetches, and draws neither when not", () => {
    const onToggle = vi.fn();
    const { rerender } = render(<SheetGroupToggle all={false} busy onToggle={onToggle} label="Show all 12 cards" fewer="Show fewer" />);
    const b = screen.getByRole("button", { name: /Show all 12 cards/ });
    expect(b).toHaveAttribute("aria-busy", "true");
    expect(b).toBeDisabled();
    fireEvent.click(b);
    expect(onToggle).not.toHaveBeenCalled();
    rerender(<SheetGroupToggle all={false} onToggle={onToggle} label="Show all 12 cards" fewer="Show fewer" />);
    expect(b).not.toHaveAttribute("aria-busy");
    expect(b).not.toBeDisabled();
  });
});
