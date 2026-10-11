import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BracketMark, DIM_OPACITY, bracketInk } from "./bracket-mark";

/**
 * WHAT THESE CAN AND CANNOT SAY. jsdom computes no styles and loads no font, so nothing here
 * proves the art resolved or that the numeral rendered in Cinzel — `probe:bracket-mark` reads
 * both in a real browser. What they pin is the set of decisions that are structural: which form
 * a size takes, that the ink is the token rather than `currentColor`, that the file's own
 * numeral is subtracted where an HTML one replaces it and kept where it does not, and that one
 * element cannot straddle two forms.
 */

const art = () => screen.getByTestId("bracket-mark-art");

describe("BracketMark", () => {
  it("draws the full mark with a subtracted numeral above 26px", () => {
    render(<BracketMark bracket={4} px={36} />);
    expect(screen.getByTestId("bracket-mark").dataset.form).toBe("full");
    // Drawn from the stylesheet's inline art, never a fetched url (a fetched mask paints a square
    // until it lands): the full form's rule subtracts the numeral disc.
    expect(art().dataset.art).toBe("bracket-4-optimized");
    expect(art().dataset.form).toBe("full");
    expect(art().getAttribute("style") ?? "").not.toContain("url(");
    expect(screen.getByTestId("bracket-mark-numeral").textContent).toBe("4");
  });

  // ASSETS.md: at 22px the chip's numeral renders at ~9px and is not legible, so "the silhouette
  // carries the rank there, and that is the design". An HTML numeral at 8.8px would replace an
  // unreadable digit with an unreadable one in another face, and subtracting the file's would
  // leave the chip's own drawing incomplete.
  it("keeps the chip's own numeral and draws none of its own", () => {
    render(<BracketMark bracket={2} px={22} />);
    expect(screen.getByTestId("bracket-mark").dataset.form).toBe("chip");
    expect(art().dataset.art).toBe("bracket-2-core-chip");
    expect(art().dataset.form).toBe("chip");
    expect(screen.queryByTestId("bracket-mark-numeral")).toBeNull();
  });

  it("draws the numeral alone and loads no file below 20px", () => {
    render(<BracketMark bracket={5} px={16} />);
    expect(screen.queryByTestId("bracket-mark-art")).toBeNull();
    expect(screen.getByTestId("bracket-mark-numeral").textContent).toBe("5");
  });

  // THE `<img>` TRAP, pinned at the level a unit test can reach. Every path in the ten files is
  // inked `currentColor`, which an external SVG resolves against its own root — so the ink has to
  // be painted by this element and masked, never carried by the file.
  it("paints the rank's own token and never loads the file as an image", () => {
    const { container } = render(<BracketMark bracket={1} px={36} />);
    expect(container.querySelector("img")).toBeNull();
    expect(art().getAttribute("style")).toContain("background-color: var(--bracket-1)");
  });

  it("sizes one element across the breakpoint rather than mounting two", () => {
    render(<BracketMark bracket={3} px={26} mdPx={36} />);
    const style = screen.getByTestId("bracket-mark").getAttribute("style") ?? "";
    expect(style).toContain("--bracket-mark-px: 26px");
    expect(style).toContain("--bracket-mark-px-md: 36px");
    expect(screen.getAllByTestId("bracket-mark")).toHaveLength(1);
  });

  // A CSS rule cannot swap a mask by width, so a breakpoint crossing a form boundary would draw
  // the chip file at 26px or the full file at 22px — one of the two widths silently wrong.
  it("refuses a breakpoint that crosses a form boundary", () => {
    expect(() => render(<BracketMark bracket={3} px={22} mdPx={26} />)).toThrow(/cannot serve both/);
  });

  it("hands every rank its own token", () => {
    expect([1, 2, 3, 4, 5].map((b) => bracketInk(b as 1))).toEqual([
      "var(--bracket-1)",
      "var(--bracket-2)",
      "var(--bracket-3)",
      "var(--bracket-4)",
      "var(--bracket-5)",
    ]);
  });
});

// The contract composites the dimmed range member at DIM_OPACITY. It imports the constant, so it
// cannot tell whether the mark still draws at it; this can.
describe("the dimmed member of a range", () => {
  it("draws at DIM_OPACITY, and a lit mark carries no opacity", () => {
    const { unmount } = render(<BracketMark bracket={2} px={36} dim />);
    expect(screen.getByTestId("bracket-mark").style.opacity).toBe(String(DIM_OPACITY));
    unmount();
    render(<BracketMark bracket={2} px={36} />);
    expect(screen.getByTestId("bracket-mark").style.opacity).toBe("");
  });
});
