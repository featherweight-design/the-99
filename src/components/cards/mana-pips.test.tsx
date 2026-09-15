// The large cost pip draws Scryfall's printed symbol. What is asserted is the
// FILE each pip asks for, not that art was used: a run that reached for
// `/mana/W.svg` where the cost says `{U}` would satisfy any check that only
// counted backgrounds, and so would one that drew every symbol as the same
// placeholder.
import { describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach } from "vitest";

import { spokenManaCost } from "../../lib/copy/card-surfaces";
import { ManaCost } from "./mana-pips";

afterEach(cleanup);

/** Every `url(...)` a pip asks for, in drawn order. */
function sources(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLElement>("span[style*='url(']")].map(
    (el) => el.style.background.match(/url\(([^)]+)\)/)?.[1]?.replace(/["']/g, "") ?? "",
  );
}

describe("ManaCost", () => {
  it("draws each symbol's own art, in cost order", () => {
    const { container } = render(<ManaCost cost="{2}{W}{U}" />);

    expect(sources(container)).toEqual(["/mana/2.svg", "/mana/W.svg", "/mana/U.svg"]);
  });

  // The symbols say nothing to a screen reader, where the retired discs at
  // least read out their own letters, so the cost is spoken alongside them.
  it("speaks the cost and hides the art from the reader", () => {
    const { container } = render(<ManaCost cost="{2}{W}" />);

    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
    expect(container.textContent).toContain(spokenManaCost("{2}{W}"));
  });

  // A hybrid, a twobrid and a Phyrexian are the symbols the disc could only
  // approximate — all three flattened to one letter-bearing disc — and each has
  // its own file rather than being composed from its halves.
  it("draws hybrid, twobrid and Phyrexian symbols whole", () => {
    const { container } = render(<ManaCost cost="{W/U}{2/R}{G/P}" />);

    expect(sources(container)).toEqual(["/mana/WU.svg", "/mana/2R.svg", "/mana/GP.svg"]);
  });

  // Scryfall's symbol list grows with the card pool and these files move only
  // when someone re-runs `pnpm fetch:mana`, so a symbol printed since the last
  // run has no art. It falls back to the lettered disc rather than drawing a
  // 26px hole — and only that symbol does.
  it("falls back to a lettered pip for a symbol with no committed art", () => {
    const { container } = render(<ManaCost cost="{W}{QQ}" />);

    expect(sources(container)).toEqual(["/mana/W.svg"]);
    expect(container.textContent).toContain("QQ");
  });

  // Both of `ManaCost`'s nothing-to-draw answers. A land has no cost at all; a
  // string with no symbols in it is what an unparseable cost reduces to, and
  // neither may leave an empty pip container behind.
  it("draws nothing for a card with no cost and for a cost with no symbols", () => {
    expect(render(<ManaCost cost={null} />).container.textContent).toBe("");
    cleanup();
    expect(render(<ManaCost cost="" />).container.textContent).toBe("");
  });

  // The front face only, the rule `parseManaCost` owns: an adventure or split
  // card stores both halves in one string and a pip run cannot say `//`.
  it("draws the front face of a two-part cost", () => {
    const { container } = render(<ManaCost cost="{3}{B} // {B}" />);

    expect(sources(container)).toEqual(["/mana/3.svg", "/mana/B.svg"]);
  });
});
