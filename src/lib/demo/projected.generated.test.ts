import { describe, expect, it } from "vitest";

import { demoScanRules } from "../../../scripts/lib/demo-scan-rules";
import { scanNames } from "./name-scan";
import { projected } from "./projected";
import { projectedJson } from "./projected.generated";

// The committed file is shown to every visitor, so it is checked as committed. Until the export has run it is null and the
// shape checks have nothing to hold; the name scan always runs.
describe("the committed projected data", () => {
  it("names no real person, email, handle, account id or profile URL", () => {
    expect(scanNames(projectedJson, demoScanRules)).toEqual([]);
  });

  const data = projected();
  it.skipIf(data === null)("holds every step, in the shapes the drawing halves take", () => {
    expect(data!.format).toBe(2);
    expect(data!.collection.cards.length).toBeGreaterThan(0);
    expect(data!.collection.totalCards).toBeGreaterThanOrEqual(data!.collection.uniqueCards);
    expect(data!.commanders.rows.length).toBeGreaterThan(0);
    expect(data!.commanders.rankBySlug).toBeInstanceOf(Map);
    for (const r of data!.commanders.rows) expect(data!.commanders.rankBySlug.get(r.slug)).toBeGreaterThan(0);
    // `--write` refuses without the paid run, so a committed file holds every model-backed step.
    expect(data!.choose).not.toBeNull();
    expect(data!.overview).not.toBeNull();
    expect(data!.suggested).not.toBeNull();
    expect(data!.analysis.reading.profile).toBeTruthy();
  });

  it.skipIf(data === null)("holds the three decks and steps 7 and 8, on the fixture's own deck states", () => {
    for (const role of ["played", "over", "under"] as const) {
      const deck = data!.decks[role];
      expect(deck.cards.length).toBeGreaterThan(0);
      // Card details page from the commander on into the deck: every row is a sibling, after the commanders.
      expect(deck.siblings[0].oracleId).toBe(deck.commander.oracleId);
      expect(deck.siblings.length).toBe(deck.cards.length + (deck.partner ? 2 : 1));
    }
    expect(data!.cuts.over).toBeGreaterThan(0);
    expect(data!.topOff.openSlots).toBeGreaterThan(0);
    expect(data!.topOff.deckOracleIds).toBeInstanceOf(Set);
    expect(data!.mana.cards).toBeGreaterThan(0);
    // Step 8 opens the card the fixture shares between decks: its free list must have landed, about that card.
    expect(data!.fits.list.read?.card.oracleId).toBe(data!.fits.card.oracleId);
    expect(data!.fits.countsKnown).toBe(true);
  });
});
