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

  it("emits canonical uppercase whatever case it was given", () => {
    const onToggle = vi.fn();
    render(<ColourPips value={["g"]} onToggle={onToggle} form="wide" />);
    fireEvent.click(screen.getByRole("switch", { name: "Green" }));
    expect(onToggle).toHaveBeenCalledWith("G");
  });

  it("names the colour, never the hue letter", () => {
    // `color-pip.tsx` shipped `Filter by B`, which reads as a letter.
    render(<ColourPips value={[]} onToggle={() => {}} form="wide" />);
    expect(screen.queryByLabelText(/filter by [wubrg]$/i)).toBeNull();
  });

  it("leaves the lit state to aria-checked rather than saying it twice", () => {
    // The handoff specified `Blue, on` when lit. A `role="switch"` already
    // announces `aria-checked`, so that read "Blue, on … on" while an unlit pip
    // relied on the ARIA state alone.
    render(<ColourPips value={["u"]} onToggle={() => {}} form="wide" />);
    expect(screen.getByRole("switch", { name: "Blue" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "White" })).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("switch", { name: /, on$/ })).toBeNull();
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
    expect(screen.getByRole("switch", { name: "Green" }).className)
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
    // Uppercase is canonical: /decks and /collection both store colour that
    // way, so emitting "b" against a stored "B" would append a duplicate
    // instead of removing the selection.
    expect(onToggle).toHaveBeenCalledWith("B");
  });

  it("reads a lowercase value too, so the commander rack can mount it unchanged", () => {
    // Asserting existence alone would pass with the normalisation removed —
    // the pips render either way. The lit state is what depends on it.
    render(<ColourPips value={["w", "r"]} onToggle={() => {}} form="wide" />);
    expect(screen.getByRole("switch", { name: "White" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "Red" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "Blue" })).toHaveAttribute("aria-checked", "false");
  });
});

describe("chassisCopy.colour", () => {
  it("singularises the exact-colour chip", async () => {
    const { chassisCopy } = await import("../../lib/copy/filter-chassis");
    // `Exactly` can be on with one pip lit, so this branch reaches count 1 —
    // unlike `collapsed`, which only ever draws past one.
    expect(chassisCopy.colour.collapsedExactly(1)).toBe("Exactly 1 color");
    expect(chassisCopy.colour.collapsedExactly(3)).toBe("Exactly 3 colors");
  });

  it("refuses a hue no surviving card carries, and says why", () => {
    // `collection/color-filter.ts` states the contract: a colour with no
    // matches stays listed and disabled. The row it replaces dropped nothing,
    // because the vocabulary is fixed and losing one pip would move the rest.
    const onToggle = vi.fn();
    render(<ColourPips form="wide" value={[]} onToggle={onToggle} unavailable={["B"]} />);
    const black = screen.getByRole("switch", { name: "Black, no matches" });
    expect(black).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(black);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("keeps a lit hue interactive even with nothing left to match", () => {
    // Otherwise the filter that emptied the list is the one filter the reader
    // cannot turn off.
    const onToggle = vi.fn();
    render(<ColourPips form="wide" value={["B"]} onToggle={onToggle} unavailable={["B"]} />);
    const black = screen.getByRole("switch", { name: "Black" });
    expect(black).not.toHaveAttribute("aria-disabled");
    fireEvent.click(black);
    expect(onToggle).toHaveBeenCalledWith("B");
  });

});
