import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BrowseListCard } from "../../lib/collection/browse";
import { cardMarkCopy } from "../../lib/copy/card-mark";
import { GridView } from "./grid-view";
import { RowsView } from "./rows-view";

const card = (over: Partial<BrowseListCard> = {}): BrowseListCard =>
  ({
    oracleId: "o-1", name: "Armageddon", typeLine: "Sorcery", manaCost: "{3}{W}", cmc: 4,
    keywords: [], rarity: "rare", colorIdentity: ["W"], imageUri: null, printedName: null,
    quantity: 1, setCodes: [], setCounts: [], primarySetCode: "4ED", preferredPrinting: null,
    ...over,
  }) as unknown as BrowseListCard;


/**
 * Marks drawn on CARDS, excluding the key's own samples.
 *
 * The key glosses all three glyphs unconditionally, so a document-wide count always reads
 * at least three and would pass with every card mark deleted — which is what the first
 * version of this file did.
 */
const cardMarks = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-testid^="card-fact-"]')].filter(
    (el) => !el.closest('[role="group"]'),
  );

const props = { totalCards: 1, onShowMore: () => {}, onOpen: () => {}, pendingOracleId: null };

describe("the card mark on /collection", () => {
  it("draws one mark per fact on a row", () => {
    const { container } = render(
      <RowsView cards={[card({ facts: ["gameChanger", "extraTurns"] })]} {...props} />,
    );
    expect(cardMarks(container)).toHaveLength(2);
  });

  it("draws nothing, and reserves nothing, for a card with no fact", () => {
    // Absence is the design. A drawn placeholder would read as a cleared check, and
    // detection on two of the three is measured and partial.
    const { container } = render(<RowsView cards={[card()]} {...props} />);
    expect(cardMarks(container)).toHaveLength(0);
  });

  it("speaks each fact once, in the row's own accessible name after the card's", () => {
    // The glyphs are aria-hidden precisely so the clause can sit in the reading order the
    // sentence wants — the card, then what it is, then what this player's copies do.
    render(<RowsView cards={[card({ facts: ["massLandDenial"] })]} {...props} />);
    const label = screen.getByRole("button", { name: /Armageddon/ }).getAttribute("aria-label")!;
    expect(label).toContain(cardMarkCopy.massLandDenial);
    expect(label.indexOf("Armageddon")).toBeLessThan(label.indexOf(cardMarkCopy.massLandDenial));
    expect(label.match(new RegExp(cardMarkCopy.massLandDenial, "g"))).toHaveLength(1);
  });

  it("draws the mark on a tile too", () => {
    const { container } = render(
      <GridView cards={[card({ facts: ["gameChanger"] })]} {...props} />,
    );
    expect(cardMarks(container)).toHaveLength(1);
  });

  it("glosses all three marks on BOTH views, whether or not a card carries one", () => {
    // THE RULE THE WORDLESS MARK RESTS ON: a glyph identifies and cannot teach. The key
    // was mounted on the deck surface alone, and /collection drew the same three glyphs
    // with no gloss at all. Unconditional, so a player scanning for Game Changers finds
    // the entry before they find a card.
    for (const View of [RowsView, GridView]) {
      const { unmount } = render(<View cards={[card()]} {...props} />);
      const key = screen.getByRole("group", { name: cardMarkCopy.keyRegionAria });
      for (const fact of ["gameChanger", "massLandDenial", "extraTurns"] as const) {
        expect(key.textContent).toContain(cardMarkCopy[fact]);
      }
      unmount();
    }
  });
});
