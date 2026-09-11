import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ColourPips } from "./colour-pips";

describe("ColourPips", () => {
  it("draws five pips in WUBRG order", () => {
    render(<ColourPips value={[]} onToggle={() => {}} form="wide" />);
    const pips = screen.getAllByRole("switch");
    expect(pips).toHaveLength(5);
    expect(pips.map((p) => p.getAttribute("aria-label"))).toEqual([
      "White", "Blue", "Black", "Red", "Green",
    ]);
  });

  it("names the colour, never the hue letter", () => {
    // `color-pip.tsx` shipped `Filter by B`, which reads as a letter.
    render(<ColourPips value={[]} onToggle={() => {}} form="wide" />);
    expect(screen.queryByLabelText(/filter by [wubrg]$/i)).toBeNull();
  });

  it("speaks the lit state, because the ring that carries it is not announced", () => {
    render(<ColourPips value={["u"]} onToggle={() => {}} form="wide" />);
    expect(screen.getByRole("switch", { name: "Blue, on" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "White" })).toHaveAttribute("aria-checked", "false");
  });

  it("carries no opacity on either state — decision 7, and the shipped defect", () => {
    // The rack dimmed unlit pips to 0.34 and collection to 0.40, flooring at
    // 1.37:1 and 1.49:1 against their own grounds. Both fail the 3:1 non-text
    // floor. Nothing here may reintroduce a dimmed state.
    const { container } = render(<ColourPips value={["r"]} onToggle={() => {}} form="wide" />);
    for (const pip of container.querySelectorAll("button")) {
      expect(pip.className).not.toMatch(/opacity/);
      expect(pip.getAttribute("style") ?? "").not.toMatch(/opacity/);
    }
  });

  it("lights with a 2px accent ring and nothing else", () => {
    render(<ColourPips value={["g"]} onToggle={() => {}} form="wide" />);
    expect(screen.getByRole("switch", { name: "Green, on" }).className)
      .toContain("shadow-[0_0_0_2px_var(--accent)]");
  });

  it("gives the phone a real 44px target and the desktop 22px", () => {
    const { rerender } = render(<ColourPips value={[]} onToggle={() => {}} form="wide" />);
    expect(screen.getAllByRole("switch")[0].style.width).toBe("22px");
    rerender(<ColourPips value={[]} onToggle={() => {}} form="sheet" />);
    expect(screen.getAllByRole("switch")[0].style.width).toBe("44px");
  });

  it("never shrinks below its promised size in a compressed row", () => {
    // The pips are flex items in a control row that is allowed to compress.
    // Default `flex-shrink: 1` would take the phone form under its 44px target.
    render(<ColourPips value={[]} onToggle={() => {}} form="sheet" />);
    for (const pip of screen.getAllByRole("switch")) {
      expect(pip.className).toContain("shrink-0");
    }
  });

  it("toggles by hue code", () => {
    const onToggle = vi.fn();
    render(<ColourPips value={[]} onToggle={onToggle} form="wide" />);
    fireEvent.click(screen.getByRole("switch", { name: "Black" }));
    expect(onToggle).toHaveBeenCalledWith("b");
  });

  it("reads an uppercase value, since routes store identity either way", () => {
    render(<ColourPips value={["W", "R"]} onToggle={() => {}} form="wide" />);
    expect(screen.getByRole("switch", { name: "White, on" })).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Red, on" })).toBeTruthy();
  });
});
