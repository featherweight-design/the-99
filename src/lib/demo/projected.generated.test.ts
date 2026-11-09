import { describe, expect, it } from "vitest";

import { demoScanRules } from "../../../scripts/lib/demo-scan-rules";
import { scanNames } from "./name-scan";
import { packCardDetails } from "./card-details-pack";
import { CARD_DETAILS_BUDGET, demoCardIds, demoDeckCardIds, failedReads, utf8Bytes } from "./project-cards";
import { encodeDemo } from "./wire";
import { committedProjected, projected } from "./projected";
import { projectedJson } from "./projected.generated";

// The committed file is shown to every visitor, so it is checked as committed. Until the export has run it is null and the
// shape checks have nothing to hold; the name scan always runs.
describe("the committed projected data", () => {
  it("names no real person, email, handle, account id or profile URL", () => {
    expect(scanNames(projectedJson, demoScanRules)).toEqual([]);
  });

  // The file as committed, in whichever format: format 1 until lane 02 regenerates it after PR 6b-2 merges (the deck,
  // cuts, Mana Balance, Top off and Which deck steps arrive with format 2). Steps 1 to 6 are checked in either.
  const file = committedProjected();
  const data = projected();

  it.skipIf(file === null)("is a format this code reads, and hands the deck steps out only on format 2", () => {
    expect([1, 2]).toContain(file!.format);
    if (file!.format === 2) expect(data).toBe(file);
    else expect(data).toBeNull();
  });

  it.skipIf(file === null)("holds steps 1 to 6, in the shapes the drawing halves take", () => {
    const steps = file!;
    expect(steps.collection.cards.length).toBeGreaterThan(0);
    expect(steps.collection.totalCards).toBeGreaterThanOrEqual(steps.collection.uniqueCards);
    expect(steps.commanders.rows.length).toBeGreaterThan(0);
    expect(steps.commanders.rankBySlug).toBeInstanceOf(Map);
    for (const r of steps.commanders.rows) expect(steps.commanders.rankBySlug.get(r.slug)).toBeGreaterThan(0);
    // `--write` refuses without the paid run, so a committed file holds every model-backed step.
    expect(steps.choose).not.toBeNull();
    expect(steps.overview).not.toBeNull();
    expect(steps.suggested).not.toBeNull();
    expect(steps.analysis.reading.profile).toBeTruthy();
  });

  // SKIPPED while the committed file is format 1: lane 02 regenerates it on format 2 after this merges, and then it holds.
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

  // Step 5l-c: absent from a file exported before it joined (a press there opens nothing); once present, every card a press
  // opens has its details, and they fit the budget.
  it.skipIf(data?.cardDetails === undefined)("holds card details for every card a press opens, inside the budget", () => {
    const details = data!.cardDetails!;
    for (const id of demoCardIds(data!)) expect(details[id]?.oracleId, id).toBe(id);
    // A deck step's combo override is for a card that step opens.
    const byRole = demoDeckCardIds(data!);
    for (const role of ["played", "over", "under"] as const) {
      for (const id of Object.keys(data!.deckCombos?.[role] ?? {})) expect(byRole[role], `${role} ${id}`).toContain(id);
    }
    // Counted as the file holds them (prices packed), deck combos included, as the export counts them.
    const bytes = utf8Bytes(encodeDemo(packCardDetails(details))) + (data!.deckCombos ? utf8Bytes(encodeDemo(data!.deckCombos)) : 0);
    expect(bytes).toBeLessThanOrEqual(CARD_DETAILS_BUDGET);
    expect(failedReads(details)).toEqual([]);
  });
});
