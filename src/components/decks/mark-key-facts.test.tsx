import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CARD_FACTS, cardMarkCopy } from "../../lib/copy/card-mark";
import { CardFactMark } from "../cards/card-fact-mark";
import { MarkKey, type MarkKeyEntry } from "./mark-key";

/**
 * The key's composition rule, which is where the handoff and the shipped component
 * disagreed. Design asked for all five entries unconditionally; this component refuses an
 * empty legend and an unconditional `buy` entry prints `not owned` over rows the player
 * owns. The resolution is an asymmetry: facts unconditional, buy/proxy conditional.
 */
const factEntries = (): MarkKeyEntry[] =>
  CARD_FACTS.map((fact) => ({
    id: fact,
    sample: <CardFactMark fact={fact} size={14} silent />,
    word: cardMarkCopy[fact],
  }));

describe("the key's fact entries", () => {
  it("names all three facts with no marked card on screen", () => {
    // Design's stated reason, verbatim: a player scanning for Game Changers needs the
    // entry to be there BEFORE they find one. A fact entry defines a glyph and makes no
    // claim about any row, so it is true of an empty deck.
    render(<MarkKey marks={factEntries()} />);
    for (const fact of CARD_FACTS) {
      expect(screen.getByText(cardMarkCopy[fact])).toBeTruthy();
    }
  });

  it("still renders nothing at all when given no entries", () => {
    // The component's own ruling survives: an empty legend is furniture. Facts are
    // unconditional on a surface that CAN draw them, which is not the same as the key
    // rendering itself on a surface with no marks in its vocabulary.
    const { container } = render(<MarkKey marks={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("speaks each fact once — the sample is silent, the word carries it", () => {
    // The glyph goes silent in the key because the word beside it IS the accessible name.
    // A speaking sample would say "Game Changer Game Changer".
    render(<MarkKey marks={factEntries()} />);
    expect(screen.queryByRole("img", { name: cardMarkCopy.gameChanger })).toBeNull();
    expect(screen.getAllByText(cardMarkCopy.gameChanger)).toHaveLength(1);
  });
});
