import { describe, expect, it } from "vitest";
import { commanderShoppingRows, isShoppingCard, isSpokenFor } from "./shopping";
import type { DeckDetailCard } from "./grouping";
import type { DeckCommander } from "./read";

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

describe("a printed card is not shopping", () => {
  it("leaves the list even though the player owns no copy", () => {
    // The order inside the predicate is the whole test: `!c.owned` comes second,
    // so a proxied card the player owns none of — the commonest case there is —
    // would otherwise be added to Shopping the moment it was printed.
    expect(isShoppingCard(card({ owned: false, proxied: true }))).toBe(false);
  });

  it("leaves the list when the copies are all spoken for", () => {
    // The other half of `isShoppingCard`: an owned card whose copies are sleeved
    // senior elsewhere is `over` and normally a purchase. Printing one answers it.
    const over = card({
      owned: true,
      proxied: true,
      availability: { owned: 1, hard: 1, soft: 0, free: -1, claims: [] },
    });
    expect(isShoppingCard(over)).toBe(false);
  });

  it("still shops for the same card when it is not printed", () => {
    expect(isShoppingCard(card({ owned: false, proxied: false }))).toBe(true);
  });
});

// H28: a commander is not a `deck_cards` row, so the list never billed it while
// `loadDeckBuyRows` did. Its rows go through the same predicate as every list row.
describe("commanderShoppingRows", () => {
  function commander(over: Partial<DeckCommander>): DeckCommander {
    return {
      oracleId: "cmd",
      name: "Atraxa, Praetors' Voice",
      colorIdentity: ["W", "U", "B", "G"],
      manaCost: "{G}{W}{U}{B}",
      typeLine: "Legendary Creature — Phyrexian Angel Horror",
      oracleText: null,
      imageUri: null,
      artCropUri: null,
      ...over,
    };
  }

  it("bills an unowned commander, as a commander row of one copy", () => {
    const rows = commanderShoppingRows(commander({ owned: false }), null);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ oracleId: "cmd", quantity: 1, owned: false, commander: true });
  });

  it("bills nothing for an owned commander with a copy to spare", () => {
    expect(commanderShoppingRows(commander({ owned: true, availability: yours }), null)).toEqual([]);
  });

  it("bills nothing for a proxied commander the player does not own", () => {
    expect(commanderShoppingRows(commander({ owned: false, proxied: true }), null)).toEqual([]);
  });

  it("bills an owned commander whose copies are spoken for elsewhere, as spoken for", () => {
    const rows = commanderShoppingRows(commander({ owned: true, availability: spokenFor }), null);
    expect(rows).toHaveLength(1);
    expect(isSpokenFor(rows[0])).toBe(true);
  });

  // Absent means owned: a fixture with no collection behind it must bill nothing, which is
  // what every surface assumed before the deck page carried the flag.
  it("reads an absent ownership flag as owned", () => {
    expect(commanderShoppingRows(commander({}), null)).toEqual([]);
  });

  it("bills both of a pair in the pair's order, each on its own answer", () => {
    const rows = commanderShoppingRows(
      commander({ oracleId: "a", owned: false }),
      commander({ oracleId: "b", owned: false }),
    );
    expect(rows.map((r) => r.oracleId)).toEqual(["a", "b"]);
    expect(
      commanderShoppingRows(commander({ oracleId: "a", owned: true, availability: yours }), commander({ oracleId: "b", owned: false }))
        .map((r) => r.oracleId),
    ).toEqual(["b"]);
  });

  it("carries the price, so the strip totals the commander", () => {
    const price = { cents: 1234, foilCents: null, etchedCents: null, asOf: new Date("2026-10-01T00:00:00Z") };
    const [row] = commanderShoppingRows(commander({ owned: false, price }), null);
    expect(row.price).toBe(price);
  });
});
