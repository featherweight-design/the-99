import { render, screen } from "@testing-library/react";
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

  it("speaks each fact once, straight after the card's name and BEFORE its type", () => {
    // The glyphs are aria-hidden precisely so the clause can sit in the reading order the
    // sentence wants: the card, then what it IS, then what this player's copies do.
    //
    // "after the name" alone does not test that — every position in the string is after
    // the name, including the end, which is the placement this one was chosen over. The
    // load-bearing assertion is that it precedes the TYPE LINE and the copy count.
    render(
      <RowsView cards={[card({ facts: ["massLandDenial"], quantity: 2 })]} {...props} />,
    );
    const label = screen.getByRole("button", { name: /Armageddon/ }).getAttribute("aria-label")!;
    const at = (needle: string) => label.indexOf(needle);
    expect(at(cardMarkCopy.massLandDenial)).toBeGreaterThan(at("Armageddon"));
    expect(at(cardMarkCopy.massLandDenial)).toBeLessThan(at("Sorcery"));
    expect(at(cardMarkCopy.massLandDenial)).toBeLessThan(at("2 copies"));
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
      // GridView mounts TWO key instances since this round (one per breakpoint, collection
      // surfaces Call 3) — both carry the same facts and combo entries regardless of the
      // availability entries that distinguish them, so every one found must gloss all three.
      const keys = screen.getAllByRole("group", { name: cardMarkCopy.keyRegionAria });
      for (const key of keys) {
        for (const fact of ["gameChanger", "massLandDenial", "extraTurns"] as const) {
          expect(key.textContent).toContain(cardMarkCopy[fact]);
        }
      }
      unmount();
    }
  });
});
