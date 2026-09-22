import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BrowseListCard } from "../../lib/collection/browse";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { COMBO_GLYPH_PX } from "../cards/combo-glyph";
import { CollectionMarkKey } from "./collection-mark-key";
import { GridView } from "./grid-view";
import { RowsView } from "./rows-view";

const card = (over: Partial<BrowseListCard> = {}): BrowseListCard =>
  ({
    oracleId: "o-1", name: "Thassa's Oracle", typeLine: "Creature — Merfolk Wizard",
    manaCost: "{U}{U}", cmc: 2, keywords: [], rarity: "rare", colorIdentity: ["U"],
    imageUri: null, printedName: null, quantity: 1, setCodes: [], setCounts: [],
    primarySetCode: "THB", preferredPrinting: null,
    ...over,
  }) as unknown as BrowseListCard;

const props = { totalCards: 1, onShowMore: () => {}, onOpen: () => {}, pendingOracleId: null };
const PARTNER = { oracleId: "o-2", name: "Demonic Consultation" };

/**
 * Marks drawn on CARDS, excluding the key's own sample.
 *
 * The key glosses the lemniscate unconditionally, so a document-wide query always finds one
 * and would pass with every card marker deleted — the same trap `collection-marks.test.tsx`
 * records for the three fact marks.
 */
const cardGlyphs = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-testid="combo-glyph"]')].filter(
    (el) => !el.closest('[role="group"]'),
  );

describe("combo awareness state 1 on /collection", () => {
  // A MARKER, NOT A SENTENCE. The revised handoff splits the feature by what a host is FOR:
  // a browse host gets the marker, a decision host gets the clause. `/collection` is where you
  // look at what you own, so the mark joins the cluster that already carries the Game Changer
  // bolt — and the partner's name moves to the tooltip and the modal.
  it("draws the marker on a row and no clause at all", () => {
    const { container } = render(
      <RowsView cards={[card({ comboPartner: PARTNER })]} {...props} />,
    );
    expect(cardGlyphs(container)).toHaveLength(1);
    expect(container.querySelector('[data-testid="combo-clause"]')).toBeNull();
    expect(container.textContent).not.toContain("Demonic Consultation");
  });

  // NOTHING YIELDS. The `SET · rarity` yield was invented to make room for a ~100px partner
  // name; a 16px glyph needs no room, so Round 1's rule is restored whole — and the row's type
  // line comes back with it.
  it("leaves the type line and the set line exactly where they were", () => {
    const { container: row } = render(
      <RowsView cards={[card({ comboPartner: PARTNER })]} {...props} />,
    );
    expect(row.textContent).toContain("Creature — Merfolk Wizard");

    const { container: tile } = render(
      <GridView cards={[card({ comboPartner: PARTNER })]} {...props} />,
    );
    expect(tile.textContent).toContain("THB");
    expect(cardGlyphs(tile)).toHaveLength(1);
  });

  // THE STATE IS IN THE ROW'S ACCESSIBLE NAME. The glyph is aria-hidden and there is no
  // tooltip on touch, so without this the fact reaches a screen reader nowhere at all.
  it("names the combo in the row's accessible name", () => {
    render(<RowsView cards={[card({ comboPartner: PARTNER })]} {...props} />);
    const row = screen.getAllByRole("button")[0];
    expect(row.getAttribute("aria-label") ?? "").toContain(
      comboAwarenessCopy.a11y.ownBoth("Demonic Consultation"),
    );
  });

  it("leaves a card with no combo exactly as it was", () => {
    const { container } = render(<RowsView cards={[card()]} {...props} />);
    expect(cardGlyphs(container)).toHaveLength(0);
    expect(container.textContent).toContain("Creature — Merfolk Wizard");
    const row = screen.getAllByRole("button")[0];
    expect(row.getAttribute("aria-label") ?? "").not.toContain("two-card combo");
  });

  // THE GLYPH IS GLOSSED ON THE SURFACE IT DEBUTS ON. The handoff says the key needs no
  // change because it already reads `∞ Two-card combo` — this is the case that keeps that
  // true.
  it("glosses the lemniscate in the key", () => {
    const { container } = render(<CollectionMarkKey />);
    expect(container.textContent).toContain(comboAwarenessCopy.keyWord);
    expect(container.querySelector('[data-testid="combo-glyph"]')).not.toBeNull();
  });
});
