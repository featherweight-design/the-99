import { describe, expect, it } from "vitest";
import type { BrowseCard } from "../collection/browse";
import { demoCardIds, projectCardDetails } from "./project-cards";
import type { Projected } from "./projected";

const ID = "11111111-1111-4111-8111-111111111111";

function card(extra: Partial<BrowseCard> = {}): BrowseCard {
  return {
    oracleId: ID,
    name: "Swords to Plowshares",
    typeLine: "Instant",
    manaCost: "{W}",
    cmc: 1,
    oracleText: "Exile target creature.",
    keywords: [],
    rarity: "uncommon",
    colorIdentity: ["W"],
    imageUri: "https://cards.scryfall.io/x.jpg",
    printedName: null,
    quantity: 1,
    printings: [],
    setCodes: ["sta"],
    primarySetCode: "sta",
    preferredPrinting: null,
    ...extra,
  };
}

describe("projectCardDetails", () => {
  it("keeps what the modal draws, the fixture's deck names with it", () => {
    const proxiedBy = [{ id: "d1", name: "Ashling's Kindling" }];
    const out = projectCardDetails([ID], new Map([[ID, card({ proxiedBy, prices: null })]]));
    expect(out[ID].name).toBe("Swords to Plowshares");
    expect(out[ID].proxiedBy).toEqual(proxiedBy);
    expect("prices" in out[ID]).toBe(true);
  });

  it("drops the account's own fields and the paid Find a deck door", () => {
    const out = projectCardDetails([ID], new Map([[ID, card({
      added: 1, since: 2, wishlist: { want: 2 }, draftWants: [], commanderLegal: true, hasDecks: true, fitsRead: true,
    })]]));
    for (const key of ["added", "since", "wishlist", "draftWants", "commanderLegal", "hasDecks", "fitsRead"]) {
      expect(key in out[ID], key).toBe(false);
    }
  });

  it("refuses a field neither list names", () => {
    const read = new Map([[ID, { ...card(), paidRead: "a model's sentence" } as BrowseCard]]);
    expect(() => projectCardDetails([ID], read)).toThrow(/"paidRead", which is neither kept nor dropped/);
  });

  it("refuses a card the demo can open with no details, or another card's", () => {
    expect(() => projectCardDetails([ID], new Map([[ID, null]]))).toThrow(/no details/);
    const other = "22222222-2222-4222-8222-222222222222";
    expect(() => projectCardDetails([other], new Map([[other, card()]]))).toThrow(/are 11111111/);
  });
});

describe("demoCardIds", () => {
  const deck = (commander: string, partner?: string) => ({ commander: { oracleId: commander }, partner: partner ? { oracleId: partner } : null });

  it("lists the collection window, Help me choose's rows and each deck's commanders, once each, in that order", () => {
    const steps = {
      collection: { cards: [{ oracleId: "a" }, { oracleId: "b" }] },
      choose: { page: { rows: [{ oracleId: "c" }, { oracleId: "a" }] } },
      decks: { played: deck("d"), over: deck("e", "f"), under: deck("b") },
    } as unknown as Pick<Projected, "collection" | "choose" | "decks">;
    expect(demoCardIds(steps)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("reads no choose rows from a file exported without the paid run", () => {
    const steps = {
      collection: { cards: [{ oracleId: "a" }] },
      choose: null,
      decks: { played: deck("d"), over: deck("e"), under: deck("g") },
    } as unknown as Pick<Projected, "collection" | "choose" | "decks">;
    expect(demoCardIds(steps)).toEqual(["a", "d", "e", "g"]);
  });
});
