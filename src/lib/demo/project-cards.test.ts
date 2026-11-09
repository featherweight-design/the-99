import { describe, expect, it } from "vitest";
import type { BrowseCard } from "../collection/browse";
import { CARD_CHUNKS, cardDetailBytes, cardSetDrift, chunkCardIds, deckComboOverrides, demoDeckCardIds, TOP_OFF_OPENABLE, deckIdsIn, demoCardIds, detailsDisagree, failedReads, projectCardDetails, utf8Bytes, type DemoCardDetails } from "./project-cards";

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

  it("opens every played-deck row, in the decklist's order, and the commander once", () => {
    const cards = [row("land1", "Lands"), row("land2", "Lands"), row("art1", "Artifacts"), row("art2", "Artifacts")];
    // The decklist's order is the siblings', not the rows'; the commander leads the siblings and is not a row.
    const siblings = ["ash", "art2", "art1", "land1", "land2"].map((oracleId) => ({ oracleId }));
    const ids = demoCardIds(steps({ decks: { played: deck("ash", { cards, siblings }), over: deck("gia"), under: deck("zim") } }));
    expect(ids).toEqual(["col", "pick", "ash", "gia", "zim", "art2", "art1", "land1", "land2", "swords"]);
  });

  it("opens the cards Which deck's panel names, in the binder's chunk", () => {
    const fits = { card: { oracleId: "swords" }, panel: { names: { swords: "Swords", austere: "Austere Command" }, commanderIds: { deck1: ["giada"] } } };
    expect(demoCardIds(steps({ fits }))).toEqual(expect.arrayContaining(["austere", "giada"]));
    expect(chunkCardIds(steps({ fits })).binder).toEqual(expect.arrayContaining(["austere", "giada"]));
  });

  it("opens the shopping rows that bill each deck's commanders", () => {
    const ids = demoCardIds(steps({ decks: { played: deck("ash", { commanderShopping: [{ oracleId: "bill" }] }), over: deck("gia"), under: deck("zim") } }));
    expect(ids).toContain("bill");
  });

  it("opens the cards each step's lines name, and only Top off's first TOP_OFF_OPENABLE candidates", () => {
    const candidates = Array.from({ length: TOP_OFF_OPENABLE + 2 }, (_, i) => ({ oracleId: `top${i}` }));
    const ids = demoCardIds(steps({
      suggested: { state: { items: [{ side: "add", cardOracleId: "add1" }, { side: "cut", cardOracleId: "cut1" }, { addOracleId: "pa", cutOracleId: "pc" }] } },
      cuts: { items: [{ cutOracleId: "giada-cut" }] },
      topOff: { candidates },
      mana: { ids: { Counterspell: "cs" } },
    }));
    expect(ids).toEqual(expect.arrayContaining(["add1", "cut1", "pa", "pc", "giada-cut", "cs", "top0", `top${TOP_OFF_OPENABLE - 1}`]));
    expect(ids).not.toContain(`top${TOP_OFF_OPENABLE}`);
  });

  it("reads no Help me choose rows or Suggested lines from a file exported without the paid run", () => {
    expect(demoCardIds(steps({ choose: null, suggested: null }))).toEqual(["col", "ash", "gia", "gia2", "zim", "swords"]);
  });
});

describe("demoDeckCardIds", () => {
  const deck = (commander: string, extra: object = {}) => ({
    commander: { oracleId: commander }, partner: null, commanderShopping: [], cards: [], siblings: [], ...extra,
  });
  const steps = {
    collection: { cards: [{ oracleId: "col" }] },
    choose: { page: { rows: [{ oracleId: "pick" }] } },
    decks: {
      played: deck("ash", { cards: [{ oracleId: "land", cardTypeGroup: "Lands", owned: true, proxied: false, availability: null }], siblings: [{ oracleId: "land" }] }),
      over: deck("gia", { partner: { oracleId: "gia2" }, commanderShopping: [{ oracleId: "bill" }] }),
      under: deck("zim"),
    },
    suggested: { state: { items: [{ side: "add", cardOracleId: "add1" }, { addOracleId: "pa", cutOracleId: "pc" }] } },
    cuts: { items: [{ cutOracleId: "giada-cut" }] },
    topOff: { candidates: Array.from({ length: TOP_OFF_OPENABLE + 2 }, (_, i) => ({ oracleId: `top${i}` })) },
    mana: { ids: { Counterspell: "cs" } },
    fits: { card: { oracleId: "swords" } },
  } as unknown as Parameters<typeof demoDeckCardIds>[0];

  it("files each deck step's cards under the deck its modal opens in, and the off-deck steps under none", () => {
    const byRole = demoDeckCardIds(steps);
    expect(byRole.played).toEqual(["ash", "land", "add1", "pa", "pc"]);
    expect(byRole.over).toEqual(["gia", "gia2", "bill", "giada-cut"]);
    expect(byRole.under).toEqual(["zim", ...Array.from({ length: TOP_OFF_OPENABLE }, (_, i) => `top${i}`), "cs"]);
    const all = Object.values(byRole).flat();
    for (const offDeck of ["col", "pick", "swords"]) expect(all).not.toContain(offDeck);
    // Every one is a card the demo opens, so each has details to lay the override on.
    for (const id of all) expect(demoCardIds(steps)).toContain(id);
  });
});

describe("chunkCardIds", () => {
  const deck = (commander: string, extra: object = {}) => ({
    commander: { oracleId: commander }, partner: null, commanderShopping: [], cards: [], siblings: [], ...extra,
  });
  const steps = {
    collection: { cards: [{ oracleId: "col" }, { oracleId: "mountain" }] },
    choose: { page: { rows: [{ oracleId: "pick" }] } },
    decks: {
      played: deck("ash", {
        cards: [{ oracleId: "mountain", cardTypeGroup: "Lands" }, { oracleId: "bolt", cardTypeGroup: "Instants" }],
        siblings: [{ oracleId: "ash" }, { oracleId: "mountain" }, { oracleId: "bolt" }],
      }),
      over: deck("gia"),
      under: deck("zim"),
    },
    suggested: null,
    cuts: { items: [{ cutOracleId: "bolt" }] },
    topOff: { candidates: [{ oracleId: "top" }] },
    mana: { ids: {} },
    fits: { card: { oracleId: "swords" } },
  } as unknown as Parameters<typeof chunkCardIds>[0];

  it("puts a card one step opens in that step's chunk and a card two steps open in shared, each card once", () => {
    const ids = chunkCardIds(steps);
    expect(ids.binder).toEqual(["col", "pick", "swords"]);
    expect(ids.played).toEqual(["ash"]);
    expect(ids.over).toEqual(["gia"]);
    expect(ids.under).toEqual(["zim", "top"]);
    expect(ids.shared.sort()).toEqual(["bolt", "mountain"]);
    // Every card the demo opens is in exactly one chunk.
    const all = CARD_CHUNKS.flatMap((c) => ids[c]);
    expect(all.length).toBe(new Set(all).size);
    expect(new Set(all)).toEqual(new Set(demoCardIds(steps)));
  });
});

describe("deckComboOverrides", () => {
  const combo = (inScope: boolean) => ({ combos: [{ others: [] }], inScope }) as never;
  const details = { a: { cardCombos: combo(false) }, b: {}, c: { cardCombos: combo(false) } } as unknown as DemoCardDetails;
  const scoped = (played: [string, unknown][]) => ({ played: new Map(played), over: new Map(), under: new Map() }) as never;

  it("keeps only the deck reads that differ from the card's own, null where the deck's read finds none", () => {
    const out = deckComboOverrides(details, scoped([["a", combo(true)], ["b", null], ["c", null]]));
    expect(out.played).toEqual({ a: combo(true), c: null });
    expect(out.over).toEqual({});
  });

  it("refuses a deck read for a card with no details to lay it on", () => {
    expect(() => deckComboOverrides(details, scoped([["z", null]]))).toThrow(/z has no card details/);
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

  it("says where the bytes go: each field across every card, largest first, and the largest cards", () => {
    const encoded = { a: { name: "Sol Ring", prices: "x".repeat(40), oracleId: "a" }, b: { prices: "y".repeat(10), oracleId: "b" } };
    const where = cardDetailBytes(encoded, 1);
    expect(where.fields[0]).toEqual(["prices", 2 * '"prices":""'.length + 50]);
    expect(where.fields.map(([k]) => k)).toEqual(["prices", "oracleId", "name"]);
    expect(where.cards).toEqual([["Sol Ring (a)", utf8Bytes(encoded.a)]]);
  });
});

describe("cardSetDrift", () => {
  const committed = {
    collection: { cards: [{ oracleId: "a" }, { oracleId: "b" }] },
    decks: {
      played: { commander: { oracleId: "ash" }, partner: null, cards: [{ oracleId: "r1", quantity: 1 }, { oracleId: "r2", quantity: 3 }] },
      over: { commander: { oracleId: "gia" }, partner: { oracleId: "gia2" }, cards: [] },
      under: { commander: { oracleId: "zim" }, partner: null, cards: [] },
    },
  } as unknown as Parameters<typeof cardSetDrift>[0];
  const fresh = (extra: Partial<Parameters<typeof cardSetDrift>[1]> = {}) => ({
    collectionIds: ["a", "b"],
    commanders: { played: { commander: "ash", partner: null }, over: { commander: "gia", partner: "gia2" }, under: { commander: "zim", partner: null } },
    // The database's order, not the decklist's: compared as a set.
    deckRows: { played: [{ oracleId: "r2", quantity: 3 }, { oracleId: "r1", quantity: 1 }], over: [], under: [] },
    ...extra,
  });

  it("finds nothing when the fixture is the one the file was exported from", () => {
    expect(cardSetDrift(committed, fresh())).toEqual([]);
  });

  it("names a collection window in another order, longer or shorter", () => {
    expect(cardSetDrift(committed, fresh({ collectionIds: ["b", "a"] }))).toHaveLength(1);
    expect(cardSetDrift(committed, fresh({ collectionIds: ["a", "b", "c"] }))).toHaveLength(1);
    expect(cardSetDrift(committed, fresh({ collectionIds: ["a"] }))).toHaveLength(1);
  });

  it("names a deck whose rows changed: a card added, gone, or at another count", () => {
    const rows = (played: { oracleId: string; quantity: number }[]) => fresh({ deckRows: { played, over: [], under: [] } });
    expect(cardSetDrift(committed, rows([{ oracleId: "r1", quantity: 1 }]))).toEqual(["the played deck's cards are not the committed ones"]);
    expect(cardSetDrift(committed, rows([{ oracleId: "r1", quantity: 1 }, { oracleId: "r2", quantity: 2 }]))).toHaveLength(1);
    expect(cardSetDrift(committed, rows([{ oracleId: "r1", quantity: 1 }, { oracleId: "r2", quantity: 3 }, { oracleId: "r3", quantity: 1 }]))).toHaveLength(1);
  });

  it("names each deck whose commander or partner moved", () => {
    const moved = fresh({ commanders: { played: { commander: "other", partner: null }, over: { commander: "gia", partner: null }, under: { commander: "zim", partner: null } } });
    expect(cardSetDrift(committed, moved)).toEqual([
      "the played deck's commanders are not the committed ones",
      "the over deck's commanders are not the committed ones",
    ]);
  });
});

describe("detailsDisagree", () => {
  const avail = (extra: object = {}) => ({ owned: 2, hard: 1, soft: 0, free: 1, claims: [{ id: "d1", name: "Giada", quantity: 1 }], ...extra });
  const committed = {
    collection: { cards: [{ oracleId: "a", quantity: 2 }] },
    decks: {
      played: { id: "p", cards: [{ oracleId: "a", availability: avail() }, { oracleId: "forest", availability: null }] },
      over: { id: "o", cards: [] },
      under: { id: "u", cards: [] },
    },
  } as unknown as Parameters<typeof detailsDisagree>[0];
  const details = (extra: object = {}) => ({ a: { oracleId: "a", quantity: 2, availability: avail(), ...extra } }) as unknown as DemoCardDetails;

  it("passes details that say what the file draws beside them", () => {
    expect(detailsDisagree(committed, details())).toEqual([]);
  });

  it("names a card whose copies, or a deck row whose claims, the fixture no longer agrees with", () => {
    expect(detailsDisagree(committed, details({ quantity: 3 }))).toHaveLength(1);
    expect(detailsDisagree(committed, details({ availability: avail({ owned: 3 }) }))).toHaveLength(1);
    expect(detailsDisagree(committed, details({ availability: avail({ claims: [{ id: "d9", name: "Giada", quantity: 1 }] }) }))).toHaveLength(1);
    expect(detailsDisagree(committed, details({ availability: avail({ claims: [{ id: "d1", name: "Giada", quantity: 2 }] }) }))).toHaveLength(1);
  });

  it("reads the row from its own deck's vantage: the detail's claim by that deck, and the figures it moves, are not a disagreement", () => {
    // The played deck's row excludes the played deck (`excludeDeckId`); the detail, read with no vantage, counts it.
    const withOwn = avail({ hard: 2, free: 0, claims: [{ id: "d1", name: "Giada", quantity: 1 }, { id: "p", name: "Played", quantity: 1 }] });
    expect(detailsDisagree(committed, details({ availability: withOwn }))).toEqual([]);
    // Another deck's claim is still compared.
    const withOther = avail({ claims: [{ id: "d1", name: "Giada", quantity: 1 }, { id: "o", name: "Over", quantity: 1 }] });
    expect(detailsDisagree(committed, details({ availability: withOther }))).toHaveLength(1);
  });
});
