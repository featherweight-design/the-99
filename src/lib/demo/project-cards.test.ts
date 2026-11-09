import { describe, expect, it } from "vitest";
import type { BrowseCard } from "../collection/browse";
import { cardSetDrift, deckIdsIn, demoCardIds, failedReads, projectCardDetails, utf8Bytes, type DemoCardDetails } from "./project-cards";

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
  type Steps = Parameters<typeof demoCardIds>[0];
  const avail = (extra: object = {}) => ({ owned: 1, hard: 0, soft: 0, free: 1, claims: [], ...extra });
  const row = (oracleId: string, cardTypeGroup: string, extra: object = {}) => ({
    oracleId, cardTypeGroup, owned: true, proxied: false, availability: avail(), comboPartner: undefined, ...extra,
  });
  const deck = (commander: string, extra: object = {}) => ({
    commander: { oracleId: commander }, partner: null, commanderShopping: [], cards: [], siblings: [], ...extra,
  });
  const steps = (extra: Partial<Record<keyof Steps, unknown>> = {}) => ({
    collection: { cards: [{ oracleId: "col" }] },
    choose: { page: { rows: [{ oracleId: "pick" }] } },
    decks: { played: deck("ash"), over: deck("gia", { partner: { oracleId: "gia2" } }), under: deck("zim") },
    suggested: null,
    cuts: { items: [] },
    topOff: { candidates: [] },
    mana: { ids: {} },
    fits: { card: { oracleId: "swords" } },
    ...extra,
  }) as unknown as Steps;

  it("opens the collection window, Help me choose's rows, the decks' commanders and Which deck's card, once each", () => {
    expect(demoCardIds(steps())).toEqual(["col", "pick", "ash", "gia", "gia2", "zim", "swords"]);
  });

  it("opens a played-deck row only when it is first in its type group or carries a mark", () => {
    const cards = [
      row("land1", "Lands"), row("land2", "Lands"),
      row("proxy", "Lands", { proxied: true }),
      row("buy", "Lands", { owned: false }),
      row("held", "Lands", { availability: avail({ claims: [{ name: "Giada" }] }) }),
      row("short", "Lands", { availability: avail({ hard: 1, soft: 1 }) }),
      row("combo", "Lands", { comboPartner: { name: "x" } }),
      row("art1", "Artifacts"), row("art2", "Artifacts"),
    ];
    // The decklist's order is the siblings', not the rows': the first Artifact there is art2.
    const siblings = ["ash", "art2", "art1", "land1", "land2", "proxy", "buy", "held", "short", "combo"].map((oracleId) => ({ oracleId }));
    const ids = demoCardIds(steps({ decks: { played: deck("ash", { cards, siblings }), over: deck("gia"), under: deck("zim") } }));
    expect(ids).toEqual(["col", "pick", "ash", "gia", "zim", "art2", "land1", "proxy", "buy", "held", "short", "combo", "swords"]);
  });

  it("opens the shopping rows that bill each deck's commanders", () => {
    const ids = demoCardIds(steps({ decks: { played: deck("ash", { commanderShopping: [{ oracleId: "bill" }] }), over: deck("gia"), under: deck("zim") } }));
    expect(ids).toContain("bill");
  });

  it("opens the cards each step's lines name, and only Top off's first page", () => {
    const candidates = Array.from({ length: 10 }, (_, i) => ({ oracleId: `top${i}` }));
    const ids = demoCardIds(steps({
      suggested: { state: { items: [{ side: "add", cardOracleId: "add1" }, { side: "cut", cardOracleId: "cut1" }, { addOracleId: "pa", cutOracleId: "pc" }] } },
      cuts: { items: [{ cutOracleId: "giada-cut" }] },
      topOff: { candidates },
      mana: { ids: { Counterspell: "cs" } },
    }));
    expect(ids).toEqual(expect.arrayContaining(["add1", "cut1", "pa", "pc", "giada-cut", "cs", "top0", "top7"]));
    expect(ids).not.toContain("top8");
  });

  it("reads no Help me choose rows or Suggested lines from a file exported without the paid run", () => {
    expect(demoCardIds(steps({ choose: null, suggested: null }))).toEqual(["col", "ash", "gia", "gia2", "zim", "swords"]);
  });
});

describe("the exporter's checks on card details", () => {
  const owned = { owned: 1, hard: 0, soft: 0, free: 1, claims: [] };
  const detail = (extra: Partial<BrowseCard> = {}) =>
    projectCardDetails([ID], new Map([[ID, card({ prices: { ambiguousKeys: [], newestAsOf: null } as never, availability: owned as never, proxiedBy: [], ...extra })]]));

  it("names each side read that failed (null), and passes a card whose reads answered", () => {
    expect(failedReads(detail())).toEqual([]);
    expect(failedReads(detail({ prices: null, availability: null, proxiedBy: null }))).toEqual([
      `Swords to Plowshares (${ID}): prices, availability, proxiedBy`,
    ]);
    // A basic land has no availability row at all: null there is an answer, not a failure.
    expect(failedReads(detail({ typeLine: "Basic Land — Forest", availability: null }))).toEqual([]);
    expect(failedReads(detail({ quantity: 0, availability: undefined, unownedAvailability: null }))).toEqual([
      `Swords to Plowshares (${ID}): unownedAvailability`,
    ]);
  });

  it("lists every deck id the details name, from both claim lists and the proxies", () => {
    const claim = (id: string) => ({ id, name: "Giada", quantity: 1, mature: true, pending: false });
    const details: DemoCardDetails = detail({
      availability: { ...owned, claims: [claim("d1")] } as never,
      unownedAvailability: { ...owned, claims: [claim("d2")] } as never,
      proxiedBy: [{ id: "d3", name: "Zimone" }],
    });
    details[ID].cardCombos = { combos: [{ others: [{ decks: [{ id: "d4", name: "Ashling", committed: true }] }], where: { kind: "elsewhere", decks: [{ id: "d5", name: "Giada", committed: true }] } }] } as never;
    expect([...deckIdsIn(details)].sort()).toEqual(["d1", "d2", "d3", "d4", "d5"]);
  });

  it("counts UTF-8 bytes, not UTF-16 code units", () => {
    expect(utf8Bytes("Æther")).toBe(JSON.stringify("Æther").length + 1);
  });
});

describe("cardSetDrift", () => {
  const committed = {
    collection: { cards: [{ oracleId: "a" }, { oracleId: "b" }] },
    decks: {
      played: { commander: { oracleId: "ash" }, partner: null },
      over: { commander: { oracleId: "gia" }, partner: { oracleId: "gia2" } },
      under: { commander: { oracleId: "zim" }, partner: null },
    },
  } as unknown as Parameters<typeof cardSetDrift>[0];
  const fresh = (extra: Partial<Parameters<typeof cardSetDrift>[1]> = {}) => ({
    collectionIds: ["a", "b"],
    commanders: { played: { commander: "ash", partner: null }, over: { commander: "gia", partner: "gia2" }, under: { commander: "zim", partner: null } },
    ...extra,
  });

  it("finds nothing when the fixture is the one the file was exported from", () => {
    expect(cardSetDrift(committed, fresh())).toEqual([]);
  });

  it("names a collection window in another order, longer or shorter", () => {
    expect(cardSetDrift(committed, fresh({ collectionIds: ["b", "a"] }))).toHaveLength(1);
    expect(cardSetDrift(committed, fresh({ collectionIds: ["a", "b", "c"] }))).toHaveLength(1);
  });

  it("names each deck whose commander or partner moved", () => {
    const moved = fresh({ commanders: { played: { commander: "other", partner: null }, over: { commander: "gia", partner: null }, under: { commander: "zim", partner: null } } });
    expect(cardSetDrift(committed, moved)).toEqual([
      "the played deck's commanders are not the committed ones",
      "the over deck's commanders are not the committed ones",
    ]);
  });
});
