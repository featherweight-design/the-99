import { describe, expect, it } from "vitest";

import { NO_BRACKET_FLAGS, type CardBracketFlags } from "../bracket/flags-read";
import type { BrowseCard } from "./browse";
import { attachBracketFacts } from "./browse-read";

const flags = (over: Partial<CardBracketFlags> = {}): CardBracketFlags => ({
  ...NO_BRACKET_FLAGS,
  ...over,
});

const card = (oracleId: string, gameChanger = false): BrowseCard =>
  ({
    oracleId, name: oracleId, typeLine: "Artifact", manaCost: null, cmc: 0,
    oracleText: null, keywords: [], rarity: "rare", colorIdentity: [],
    facts: gameChanger ? ["gameChanger"] : undefined,
    imageUri: null, printedName: null, quantity: 1, printings: [],
    setCodes: [], primarySetCode: "C21", preferredPrinting: null,
  }) as unknown as BrowseCard;

/**
 * The attachment path, which the browse tests cannot reach: those cover
 * `gameChanger`, and that rides the card row. Deleting every line that reads
 * `card_bracket_flags` would leave them green while mass land denial and extra
 * turns silently vanished from the list.
 */
describe("attachBracketFacts", () => {
  it("appends the two joined flags in the fixed order, after gameChanger", async () => {
    // gameChanger, massLandDenial, extraTurns — the order the key lists and every
    // surface draws. Asserted as a sequence, never a set.
    const [out] = await attachBracketFacts([card("o-1", true)], async () =>
      new Map([["o-1", flags({ massLandDenial: true, extraTurn: true })]]),
    );
    expect(out.facts).toEqual(["gameChanger", "massLandDenial", "extraTurns"]);
  });

  it("attaches a joined flag to a card that is not a Game Changer", async () => {
    const [out] = await attachBracketFacts([card("o-1")], async () =>
      new Map([["o-1", flags({ extraTurn: true })]]),
    );
    expect(out.facts).toEqual(["extraTurns"]);
  });

  it("leaves a card whose row is all-false carrying nothing", async () => {
    // A row that exists and is all-false is NOT a claim the card is clear; it is the
    // same silence as no row, and must not become an empty array in the payload.
    const [out] = await attachBracketFacts([card("o-1")], async () =>
      new Map([["o-1", flags()]]),
    );
    expect(out.facts).toBeUndefined();
    expect(JSON.stringify(out)).not.toContain("facts");
  });

  it("leaves a card with no row untouched", async () => {
    const [out] = await attachBracketFacts([card("o-1", true)], async () => new Map());
    expect(out.facts).toEqual(["gameChanger"]);
  });

  it("stays quiet when the read fails, and still returns every card", async () => {
    // The route is useful without the marks and useless without the cards, so a flags
    // outage costs the annotation and never the list.
    const out = await attachBracketFacts([card("o-1", true), card("o-2")], async () => {
      throw new Error("card_bracket_flags unreachable");
    });
    expect(out).toHaveLength(2);
    expect(out[0].facts).toEqual(["gameChanger"]);
    expect(out[1].facts).toBeUndefined();
  });
});
