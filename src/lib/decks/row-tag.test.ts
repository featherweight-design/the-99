import { describe, it, expect } from "vitest";
import { deckRowTag } from "./row-tag";
import type { DeckDetailCard } from "./grouping";

const card = (over: Partial<DeckDetailCard>): DeckDetailCard => ({
  oracleId: "a", name: "A", typeLine: "Artifact",
  cardTypeGroup: "Artifacts" as DeckDetailCard["cardTypeGroup"],
  role: "other", cmc: 2, owned: false, quantity: 1, auto: false,
  printedName: null, printedSetCode: null, printedCollectorNumber: null, ...over,
});

describe("one slot, one mark", () => {
  it("draws the proxy mark on a printed card", () => {
    expect(deckRowTag(card({ owned: false, proxied: true }))).toBe("proxy");
  });

  it("draws the buy mark on an unowned card that is not printed", () => {
    expect(deckRowTag(card({ owned: false }))).toBe("buy");
  });

  it("draws nothing on a card the player owns", () => {
    expect(deckRowTag(card({ owned: true }))).toBeNull();
  });

  it("never answers buy for a printed card, however unowned", () => {
    // The state the type exists to make unreachable. A row saying at once that
    // the player is printing this card and must buy it is the one combination
    // nobody drew — and `isShoppingCard` and the `list_claims` anti-join both
    // already treat it as no purchase, so `buy` here would contradict both.
    expect(deckRowTag(card({ owned: false, proxied: true }))).not.toBe("buy");
  });

  it("prefers the proxy even on an owned card", () => {
    // Reachable: a player who owns one copy and prints another for a second
    // deck. The deck's own statement about the slot wins.
    expect(deckRowTag(card({ owned: true, proxied: true }))).toBe("proxy");
  });
});
