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

describe("the key's foil entry", () => {
  it("is named in Card view when a card in view is all foil over art, and not otherwise", () => {
    const foil = card({ foil: "foil", imageUri: "https://cards.example/a.jpg" });
    expect(ids(buildMarkKeyEntries({ cards: [foil], filter: "all", inCardView: true }))).toContain("foil");
    expect(ids(buildMarkKeyEntries({ cards: [card({ imageUri: "https://cards.example/a.jpg" })], filter: "all", inCardView: true }))).not.toContain("foil");
    // No art, so no film and no glint: the key does not claim a mark nothing draws.
    expect(ids(buildMarkKeyEntries({ cards: [card({ foil: "foil", imageUri: null })], filter: "all", inCardView: true }))).not.toContain("foil");
  });
  it("is named in List view and under Shopping too, now the two-line row draws the glint", () => {
    const foil = card({ foil: "foil", imageUri: "https://cards.example/a.jpg" });
    expect(ids(buildMarkKeyEntries({ cards: [foil], filter: "all", inCardView: false }))).toContain("foil");
    // An owned card is on Shopping when its copies are all spoken for elsewhere.
    const listed = { ...foil, availability: { owned: 1, hard: 2, soft: 0, free: -1, claims: [] } } as DeckDetailCard;
    expect(ids(buildMarkKeyEntries({ cards: [listed], filter: "shopping", inCardView: false }))).toContain("foil");
  });
  it("leaves a foil basic land out of the List view's key (its stepper row has no glint), and keeps it in Card view", () => {
    const basic = card({ foil: "foil", imageUri: "https://cards.example/a.jpg", typeLine: "Basic Land — Forest" });
    expect(ids(buildMarkKeyEntries({ cards: [basic], filter: "all", inCardView: false }))).not.toContain("foil");
    expect(ids(buildMarkKeyEntries({ cards: [basic], filter: "all", inCardView: true }))).toContain("foil");
  });
  it("is one entry for etched as for foil", () => {
    const entries = buildMarkKeyEntries({
      cards: [card({ foil: "etched", imageUri: "https://cards.example/a.jpg" }), card({ oracleId: "o-2", foil: "foil", imageUri: "https://cards.example/b.jpg" })],
      filter: "all", inCardView: true,
    });
    expect(ids(entries).filter((i) => i === "foil")).toHaveLength(1);
  });
});

// THE COMBO MARK (single-line row PR 2): a deck row names its in-deck partner, so the key glosses
// the glyph by the same closed-set rule as the facts, and only where a row draws it.
describe("the key's combo entry", () => {
  const partnered = card({ comboPartner: { oracleId: "o-2", name: "Isochron Scepter" } });

  it("names the combo mark when a row in view has an in-deck partner", () => {
    const entries = buildMarkKeyEntries({ cards: [partnered], filter: "all", inCardView: false });
    expect(ids(entries)).toContain("combo");
  });

  it("draws no combo entry for a deck with no in-deck combo", () => {
    const entries = buildMarkKeyEntries({
      cards: [card(), card({ oracleId: "o-3", comboPartner: null })], filter: "all", inCardView: false,
    });
    expect(ids(entries)).not.toContain("combo");
  });

  // A commander billed on Shopping is a row too: its mark is glossed even when no body row draws one.
  it("names the combo mark for a commander's Shopping row", () => {
    const entries = buildMarkKeyEntries({
      cards: [card({ owned: true })],
      commanderRows: [card({ oracleId: "cmd", owned: false, commander: true, comboPartner: { oracleId: "o-2", name: "Isochron Scepter" } } as Partial<DeckDetailCard>)],
      filter: "shopping",
      inCardView: false,
    });
    expect(ids(entries)).toContain("combo");
  });

  it("draws no combo entry in Card view, whose tiles draw no combo mark", () => {
    const entries = buildMarkKeyEntries({ cards: [partnered], filter: "all", inCardView: true });
    expect(ids(entries)).not.toContain("combo");
  });
});
