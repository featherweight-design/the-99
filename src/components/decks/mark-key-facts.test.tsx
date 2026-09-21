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

describe("the key's composition rule", () => {
  it("names all three facts on a row list with no marked card present", () => {
    // Design's stated reason: a player scanning for Game Changers needs the entry to be
    // there BEFORE they find one. A fact entry defines a glyph and claims nothing about
    // any row, so it is true of a deck carrying none.
    const entries = buildMarkKeyEntries({ cards: [card()], filter: "all", inCardView: false });
    expect(ids(entries)).toEqual([...CARD_FACTS]);
  });

  it("draws NO fact entry in card view, where no tile carries a mark", () => {
    // The same rule rather than an exception: glossing a glyph that appears nowhere on
    // screen teaches the reader a mark they cannot find.
    const entries = buildMarkKeyEntries({ cards: [card()], filter: "all", inCardView: true });
    expect(ids(entries).filter((id) => (CARD_FACTS as readonly string[]).includes(id))).toEqual([]);
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
    const entries = buildMarkKeyEntries({ cards: [card()], filter: "all", inCardView: false });
    const words = entries.filter((e) => (CARD_FACTS as readonly string[]).includes(e.id));
    expect(words.map((e) => e.word)).toEqual(CARD_FACTS.map((f) => cardMarkCopy[f]));
  });
});
