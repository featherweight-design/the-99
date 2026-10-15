import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SegmentedSwitch } from "./segmented-switch";

const SEGMENTS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta", ink: "var(--warning)" },
  { value: "c", label: "Gamma", divideBefore: true },
] as const;

describe("SegmentedSwitch", () => {
  it("is a tablist of tabs for a switch that swaps a panel, marking the chosen one selected", () => {
    render(<SegmentedSwitch kind="tabs" ariaLabel="Panels" segments={SEGMENTS} value="b" onChange={() => {}} />);
    expect(screen.getByRole("tablist", { name: "Panels" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((t) => t.getAttribute("aria-selected"))).toEqual(["false", "true", "false"]);
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("is a radiogroup of radios for a switch that changes a setting", () => {
    render(<SegmentedSwitch kind="radio" ariaLabel="Order" segments={SEGMENTS} value="a" onChange={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: "Order" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio").map((t) => t.getAttribute("aria-checked"))).toEqual(["true", "false", "false"]);
    // No aria-pressed anywhere: group + aria-pressed is retired (d9's ruling 2, 2026-10-15).
    expect(document.querySelector("[aria-pressed]")).toBeNull();
  });

  it("is one tab stop, on the chosen segment, or on the first when none is chosen", () => {
    const { rerender } = render(<SegmentedSwitch kind="tabs" ariaLabel="P" segments={SEGMENTS} value="c" onChange={() => {}} />);
    expect(screen.getAllByRole("tab").map((t) => t.tabIndex)).toEqual([-1, -1, 0]);
    rerender(<SegmentedSwitch kind="tabs" ariaLabel="P" segments={SEGMENTS} value={null} onChange={() => {}} />);
    expect(screen.getAllByRole("tab").map((t) => t.tabIndex)).toEqual([0, -1, -1]);
  });

  it("moves the choice and the focus with the arrow, Home and End keys, wrapping at the ends", () => {
    const onChange = vi.fn();
    render(<SegmentedSwitch kind="radio" ariaLabel="O" segments={SEGMENTS} value="a" onChange={onChange} />);
    const [a, , c] = screen.getAllByRole("radio");
    fireEvent.keyDown(a, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("b");
    fireEvent.keyDown(a, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("c");
    expect(document.activeElement).toBe(c);
    fireEvent.keyDown(a, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("c");
  });

  it("reports a press on another segment, and none on the chosen one", () => {
    const onChange = vi.fn();
    render(<SegmentedSwitch kind="tabs" ariaLabel="P" segments={SEGMENTS} value="a" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Alpha" }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("tab", { name: "Gamma" }));
    expect(onChange).toHaveBeenCalledWith("c");
  });

  it("lets a segment keep its own ink only under the accent tone; neutral draws every segment alike", () => {
    const { rerender } = render(<SegmentedSwitch kind="tabs" ariaLabel="P" tone="accent" segments={SEGMENTS} value="a" onChange={() => {}} />);
    const accented = screen.getByRole("tab", { name: "Beta" });
    expect(accented.style.getPropertyValue("--seg-ink")).toBe("var(--warning)");
    // The class that reads it, or the property is set and never drawn.
    expect(accented.className).toContain("text-[color:var(--seg-ink)]");
    rerender(<SegmentedSwitch kind="tabs" ariaLabel="P" tone="neutral" segments={SEGMENTS} value="a" onChange={() => {}} />);
    const beta = screen.getByRole("tab", { name: "Beta" });
    expect(beta.style.getPropertyValue("--seg-ink")).toBe("");
    expect(beta.className).toContain("text-[color:var(--fg-muted)]");
    expect(screen.getByRole("tab", { name: "Alpha" }).className).toContain("bg-[color:var(--elevated)]");
  });

  it("draws a hairline before a segment that asks for one, hidden from the accessibility tree", () => {
    const { container } = render(<SegmentedSwitch kind="tabs" ariaLabel="P" segments={SEGMENTS} value="a" onChange={() => {}} />);
    const list = screen.getByRole("tablist");
    const divider = container.querySelector("[data-switch-divider]")!;
    expect(divider.getAttribute("aria-hidden")).toBe("true");
    expect(list.children[2]).toBe(divider);
  });
});

describe("SegmentedSwitch, compact and pending", () => {
  const TWO = [{ value: "x", label: "Ex" }, { value: "y", label: "Why" }] as const;

  it("draws the compact segment: 40px at phone, 30px from md, a 2px well and normal weight at rest", () => {
    render(<SegmentedSwitch kind="radio" size="compact" ariaLabel="Two" segments={TWO} value="x" onChange={() => {}} />);
    const [x, y] = screen.getAllByRole("radio");
    expect(x).toHaveClass("h-[40px]", "md:h-[30px]", "font-semibold", "bg-[color:var(--elevated)]");
    expect(y).toHaveClass("font-normal");
    expect(y).not.toHaveClass("min-h-[44px]");
    expect(screen.getByRole("radiogroup")).toHaveClass("p-[2px]");
  });

  it("fills a segment it is told to draw before its value moves, while the selected state follows the value", () => {
    render(<SegmentedSwitch kind="tabs" size="compact" ariaLabel="Two" segments={TWO} value="x" drawn="y" onChange={() => {}} />);
    const [x, y] = screen.getAllByRole("tab");
    expect(y).toHaveClass("bg-[color:var(--elevated)]");
    expect(x).not.toHaveClass("bg-[color:var(--elevated)]");
    expect(x.getAttribute("aria-selected")).toBe("true");
    expect(x.tabIndex).toBe(0);
  });

  it("marks a busy segment and draws the pending pip on it alone", () => {
    render(<SegmentedSwitch kind="tabs" ariaLabel="Two" segments={[TWO[0], { ...TWO[1], busy: true }]} value="x" onChange={() => {}} />);
    const [x, y] = screen.getAllByRole("tab");
    expect(y.getAttribute("aria-busy")).toBe("true");
    expect(y.querySelector("[data-pending]")).not.toBeNull();
    expect(x.hasAttribute("aria-busy")).toBe(false);
    expect(x.querySelector("[data-pending]")).toBeNull();
  });

  it("names the chosen tab's panel only when a panel id is given, and keeps the stable tab ids either way", () => {
    const { unmount } = render(
      <SegmentedSwitch kind="tabs" ariaLabel="Two" segments={TWO} value="x" onChange={() => {}} ids={{ tab: (v) => `t-${v}` }} />,
    );
    expect(screen.getAllByRole("tab").map((t) => t.id)).toEqual(["t-x", "t-y"]);
    expect(screen.getAllByRole("tab")[0].hasAttribute("aria-controls")).toBe(false);
    unmount();
    render(<SegmentedSwitch kind="tabs" ariaLabel="Two" segments={TWO} value="x" onChange={() => {}} ids={{ tab: (v) => `t-${v}`, panel: (v) => `p-${v}` }} />);
    expect(screen.getAllByRole("tab")[0].getAttribute("aria-controls")).toBe("p-x");
  });
});
