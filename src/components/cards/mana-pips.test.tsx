// The large cost pip draws Scryfall's printed symbol. What is asserted is the
// FILE each pip asks for, not that art was used: a run that reached for
// `/mana/W.svg` where the cost says `{U}` would satisfy any check that only
// counted backgrounds, and so would one that drew every symbol as the same
// placeholder.
import { describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach } from "vitest";

import { manaCopy, spokenFullManaCost, spokenManaCost } from "../../lib/copy/card-surfaces";
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

    expect(sources(container)).toEqual(["/mana/sprite.svg#m-2", "/mana/sprite.svg#m-W", "/mana/sprite.svg#m-U"]);
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

    expect(sources(container)).toEqual(["/mana/sprite.svg#m-WU", "/mana/sprite.svg#m-2R", "/mana/sprite.svg#m-GP"]);
  });

  // Scryfall's symbol list grows with the card pool and these files move only
  // when someone re-runs `pnpm fetch:mana`, so a symbol printed since the last
  // run has no art. It falls back to the lettered disc rather than drawing a
  // 26px hole — and only that symbol does.
  it("falls back to a lettered pip for a symbol with no committed art", () => {
    const { container } = render(<ManaCost cost="{W}{QQ}" />);

    expect(sources(container)).toEqual(["/mana/sprite.svg#m-W"]);
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

  // Both halves of a two-part cost, which is this surface's own rule — the runs
  // in a column keep `parseManaCost`'s front half. `{3}{B} // {B}` is an
  // Adventure: a three-mana creature and a one-mana spell on one card.
  it("draws both halves of a two-part cost", () => {
    const { container } = render(<ManaCost cost="{3}{B} // {B}" />);

    expect(sources(container)).toEqual(["/mana/sprite.svg#m-3", "/mana/sprite.svg#m-B", "/mana/sprite.svg#m-B"]);
  });
});

describe("ManaCost — a card with two printed costs", () => {
  // `split`, `adventure` and `prepare` print two real, castable costs on one
  // piece of stock. The modal has the room and draws both; the runs in a column
  // keep the front half alone.
  it("draws both halves, in printed order", () => {
    const { container } = render(<ManaCost cost="{G/U}{G/U} // {1}{G}{U}" />);

    expect(sources(container)).toEqual([
      "/mana/sprite.svg#m-GU",
      "/mana/sprite.svg#m-GU",
      "/mana/sprite.svg#m-1",
      "/mana/sprite.svg#m-G",
      "/mana/sprite.svg#m-U",
    ]);
  });

  it("separates them with the same mark the printed name carries", () => {
    const { container } = render(<ManaCost cost="{G/U}{G/U} // {1}{G}{U}" />);

    // Leaf spans only. The run that CONTAINS the separator has `//` as its
    // whole text too, because a printed pip carries no text of its own — so a
    // sweep of every span counts the wrapper as a second separator.
    //
    // The LITERAL `//`, not `manaCopy.costHalfSeparator`. Asserting the constant
    // against itself passes whatever that constant becomes — a `/`, or the word
    // `or` — so it would ratify a change to the mark rather than catch it. The
    // constant is still what the component draws from; this is the second place
    // a change to it has to be made, deliberately.
    expect(
      [...container.querySelectorAll("span")].filter(
        (el) => el.children.length === 0 && el.textContent === "//",
      ),
    ).toHaveLength(1);
    expect(manaCopy.costHalfSeparator).toBe("//");
  });

  it("draws no separator for a card with one cost", () => {
    const { container } = render(<ManaCost cost="{3}{W}" />);

    expect(container.textContent).not.toContain("//");
  });

  // The `//` cannot be read aloud, so the label names the second cost instead.
  it("speaks both halves", () => {
    const { container } = render(<ManaCost cost="{G/U}{G/U} // {1}{G}{U}" />);

    expect(container.textContent).toContain(spokenFullManaCost("{G/U}{G/U} // {1}{G}{U}"));
    expect(container.textContent).toContain("second cost 1 green blue");
  });

  // A half with no symbols in it draws nothing and earns no separator — the
  // shape a malformed cost reduces to.
  it("draws one run and no separator when a half is empty", () => {
    const { container } = render(<ManaCost cost="{B} // " />);

    expect(sources(container)).toEqual(["/mana/sprite.svg#m-B"]);
    expect(container.textContent).not.toContain("//");
  });
});
