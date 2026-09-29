// The large cost pip draws Scryfall's printed symbol. What is asserted is the
// CELL each pip draws, not that art was used: every pip draws the same sprite,
// so a run that showed `{W}`'s cell where the cost says `{U}` would satisfy any
// check that only counted backgrounds or read the URL, and so would one that
// drew every symbol as the same placeholder.
import { manaSpriteBackground } from "../../lib/cards/mana-sprite";
import { describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach } from "vitest";

import { manaCopy, spokenFullManaCost, spokenManaCost } from "../../lib/copy/card-surfaces";
import { ManaCost } from "./mana-pips";

afterEach(cleanup);

/** The window each pip draws, in drawn order: the sprite cell it shows. */
function sources(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLElement>("span[style*='url(']")].map(
    (el) => `${el.style.backgroundImage} ${el.style.backgroundPosition} / ${el.style.backgroundSize}`,
  );
}

/** A symbol's sprite cell, read back from an element carrying its style the way the pips' are. */
function cell(slug: string): string {
  const probe = document.createElement("span");
  Object.assign(probe.style, manaSpriteBackground(slug));
  return `${probe.style.backgroundImage} ${probe.style.backgroundPosition} / ${probe.style.backgroundSize}`;
}

describe("ManaCost", () => {
  it("draws each symbol's own art, in cost order", () => {
    const { container } = render(<ManaCost cost="{2}{W}{U}" />);

    expect(sources(container)).toEqual([cell("2"), cell("W"), cell("U")]);
    // The cells read back apart, or every assertion in this file passes whichever cell is drawn.
    expect(new Set([cell("2"), cell("W"), cell("U")]).size).toBe(3);
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

    expect(sources(container)).toEqual([cell("WU"), cell("2R"), cell("GP")]);
  });

  // Scryfall's symbol list grows with the card pool and these files move only
  // when someone re-runs `pnpm fetch:mana`, so a symbol printed since the last
  // run has no art. It falls back to the lettered disc rather than drawing a
  // 26px hole — and only that symbol does.
  it("falls back to a lettered pip for a symbol with no committed art", () => {
    const { container } = render(<ManaCost cost="{W}{QQ}" />);

    expect(sources(container)).toEqual([cell("W")]);
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

    expect(sources(container)).toEqual([cell("3"), cell("B"), cell("B")]);
  });
});

describe("ManaCost — a card with two printed costs", () => {
  // `split`, `adventure` and `prepare` print two real, castable costs on one
  // piece of stock. The modal has the room and draws both; the runs in a column
  // keep the front half alone.
  it("draws both halves, in printed order", () => {
    const { container } = render(<ManaCost cost="{G/U}{G/U} // {1}{G}{U}" />);

    expect(sources(container)).toEqual([
      cell("GU"),
      cell("GU"),
      cell("1"),
      cell("G"),
      cell("U"),
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

    expect(sources(container)).toEqual([cell("B")]);
    expect(container.textContent).not.toContain("//");
  });
});
