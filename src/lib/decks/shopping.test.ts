import { describe, expect, it } from "vitest";
import { isShoppingCard, isSpokenFor } from "./shopping";
import type { DeckDetailCard } from "./grouping";

function card(over: Partial<DeckDetailCard>): DeckDetailCard {
  return {
    oracleId: "o1",
    name: "Sol Ring",
    typeLine: "Artifact",
    quantity: 1,
    owned: false,
    ...over,
  } as DeckDetailCard;
}

/** `free < 0` is what `availabilityState` reads as `over`. */
const spokenFor = { owned: 1, hard: 2, soft: 0, free: -1, claims: [] };
const yours = { owned: 1, hard: 0, soft: 0, free: 1, claims: [] };

describe("isShoppingCard", () => {
  it("takes a card you do not own", () => {
    expect(isShoppingCard(card({ owned: false }))).toBe(true);
  });

  it("takes a card you own whose copies are all spoken for elsewhere", () => {
    expect(isShoppingCard(card({ owned: true, availability: spokenFor }))).toBe(true);
  });

  it("leaves a card you own and can actually sleeve", () => {
    expect(isShoppingCard(card({ owned: true, availability: yours }))).toBe(false);
  });

  // The list is only ever a list of things to go and buy, and nobody buys a
  // Forest. Asserted here rather than at the filter so a future change to the
  // fill fails loudly.
  it("never takes a basic land, owned or not", () => {
    const forest = { name: "Forest", typeLine: "Basic Land — Forest" };
    expect(isShoppingCard(card({ ...forest, owned: false }))).toBe(false);
    expect(isShoppingCard(card({ ...forest, owned: true, availability: spokenFor }))).toBe(false);
  });

  // A failed availability read degrades to the free rendering, as the builder
  // always has: the contested rows are simply absent and the list is today's.
  it("leaves an owned card whose availability could not be read", () => {
    expect(isShoppingCard(card({ owned: true, availability: null }))).toBe(false);
  });
});

describe("isSpokenFor", () => {
  it("is the owned half of the shopping list, and only that half", () => {
    expect(isSpokenFor(card({ owned: true, availability: spokenFor }))).toBe(true);
    expect(isSpokenFor(card({ owned: false }))).toBe(false);
    expect(isSpokenFor(card({ owned: true, availability: yours }))).toBe(false);
  });
});

// The bug this module exists to close: the export dialog composed its own
// `!owned` list, which carried unowned basics the filter refuses to show and
// dropped the spoken-for cards the filter puts front and centre. One predicate
// is what makes the strip's link and the export dialog's link one promise.
describe("the shopping list against a bare !owned filter", () => {
  const deck = [
    card({ oracleId: "a", name: "Sol Ring", owned: false }),
    card({ oracleId: "b", name: "Forest", typeLine: "Basic Land — Forest", owned: false }),
    card({ oracleId: "c", name: "Cultivate", owned: true, availability: spokenFor }),
    card({ oracleId: "d", name: "Swamp", typeLine: "Basic Land — Swamp", owned: true, availability: yours }),
  ];

  it("drops the basics the bare filter carried and keeps the cards it dropped", () => {
    const shopping = deck.filter(isShoppingCard).map((c) => c.name);
    const bare = deck.filter((c) => !c.owned).map((c) => c.name);

    expect(shopping).toEqual(["Sol Ring", "Cultivate"]);
    expect(bare).toEqual(["Sol Ring", "Forest"]);
  });
});
