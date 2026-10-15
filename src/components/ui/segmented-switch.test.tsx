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
    expect(screen.getByRole("tab", { name: "Beta" }).style.getPropertyValue("--seg-ink")).toBe("var(--warning)");
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
