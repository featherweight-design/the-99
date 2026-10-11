import { describe, expect, it } from "vitest";

import { CARD_FACTS, cardMarkCopy } from "../../lib/copy/card-mark";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { buildMarkKeyEntries } from "./decklist";

/**
 * Tested against the SHIPPED builder, not a rebuilt copy of it. The first version of this
 * file constructed the three entries itself and handed them to `MarkKey`, so deleting the
 * rule under test left every assertion green — it proved `MarkKey` renders what it is
 * given, which was never in doubt.
 */
const card = (over: Partial<DeckDetailCard> = {}): DeckDetailCard =>
  ({
    oracleId: "o-1", name: "Sol Ring", typeLine: "Artifact", cardTypeGroup: "Artifacts",
    role: "ramp", cmc: 1, owned: true, proxied: false, quantity: 1, auto: false,
    manaCost: "{1}", imageUri: null, ...over,
  }) as DeckDetailCard;

const ids = (entries: { id: string }[]) => entries.map((e) => e.id);
const factIds = (entries: { id: string }[]) =>
  ids(entries).filter((id) => (CARD_FACTS as readonly string[]).includes(id));

describe("the key's composition rule", () => {
  it("names NO fact the deck does not hold", () => {
    // The reported defect, in one line: a deck carrying one extra-turns card advertised
    // all three. A deck is a closed set of 100 cards, so absence is knowable and total —
    // an entry for a fact no card holds stops being a decoder and becomes a claim.
    const entries = buildMarkKeyEntries({
      cards: [card({ facts: ["extraTurns"] })], filter: "all", inCardView: false,
    });
    expect(factIds(entries)).toEqual(["extraTurns"]);
  });

  it("names every fact the deck does hold, in the vocabulary's own order", () => {
    const entries = buildMarkKeyEntries({
      cards: CARD_FACTS.map((f, i) => card({ oracleId: `o-${i}`, facts: [f] })),
      filter: "all",
      inCardView: false,
    });
    expect(factIds(entries)).toEqual([...CARD_FACTS]);
  });

  it("draws no fact entry at all for a deck carrying none", () => {
    const entries = buildMarkKeyEntries({ cards: [card()], filter: "all", inCardView: false });
    expect(factIds(entries)).toEqual([]);
  });

  it("glosses the facts in CARD VIEW too, where the tiles draw the same marks", () => {
    // Card view suppressed these entries while its tiles drew no mark. The premise was
    // true and the conclusion backwards — the tile draws the mark now, so the surface
    // that shows cards is the last place to leave unglossed.
    const entries = buildMarkKeyEntries({
      cards: [card({ facts: ["gameChanger"] })], filter: "all", inCardView: true,
    });
    expect(factIds(entries)).toEqual(["gameChanger"]);
  });

  it("decides on the SHOWN rows, so a filtered-away fact is not glossed", () => {
    // `buy` and `proxy` are decided over the filtered set; the facts follow the same set,
    // so the key glosses the rows the reader is looking at. An owned, unproxied card is
    // not a shopping row, so the Shopping filter hides it and its fact with it.
    const cards = [card({ facts: ["massLandDenial"], owned: true, proxied: false })];
    expect(factIds(buildMarkKeyEntries({ cards, filter: "all", inCardView: false })))
      .toEqual(["massLandDenial"]);
    expect(factIds(buildMarkKeyEntries({ cards, filter: "shopping", inCardView: false })))
      .toEqual([]);
  });

  it("keeps proxy conditional — present only when a row is proxied", () => {
    const without = buildMarkKeyEntries({ cards: [card()], filter: "all", inCardView: false });
    expect(ids(without)).not.toContain("proxy");
    const with_ = buildMarkKeyEntries({
      cards: [card({ proxied: true })], filter: "all", inCardView: false,
    });
    expect(ids(with_)).toContain("proxy");
  });

  it("words each fact with the rules' own name", () => {
    const entries = buildMarkKeyEntries({
      cards: CARD_FACTS.map((f, i) => card({ oracleId: `o-${i}`, facts: [f] })),
      filter: "all",
      inCardView: false,
    });
    const words = entries.filter((e) => (CARD_FACTS as readonly string[]).includes(e.id));
    expect(words.map((e) => e.word)).toEqual(CARD_FACTS.map((f) => cardMarkCopy[f]));
  });

  it("says `to buy` under Shopping only when the Shopping key is not drawn", () => {
    // I got it on: `ShoppingKey` decodes the buy mark above the list, and every Shopping row
    // carries it, so this key stops repeating it (Hugh, 2026-10-11). Off, it is the only decoder.
    const cards = [card({ owned: false })];
    expect(ids(buildMarkKeyEntries({ cards, filter: "shopping", inCardView: false, shoppingKeyDraws: true }))).not.toContain("buy");
    expect(ids(buildMarkKeyEntries({ cards, filter: "shopping", inCardView: false }))).toContain("buy");
    // Outside Shopping the buy mark marks only some rows, so it is still glossed.
    expect(ids(buildMarkKeyEntries({ cards, filter: "all", inCardView: false, shoppingKeyDraws: true }))).toContain("buy");
  });
});
