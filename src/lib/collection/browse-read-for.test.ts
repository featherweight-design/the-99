// `loadBrowseCardsFor`: the fields route's bounded read. Same passes as the whole list, over the
// rows of the named cards only, and nothing of another reader's.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { RawCollectionRow } from "./browse";
import type { CardBracketFlags } from "../bracket/flags-read";
import type { PairRow } from "../combos/near-miss";
import { indexPriceRows } from "../cards/price-lookup";

const rowsByUser: Record<string, RawCollectionRow[]> = {};
const asked: { userId: string; ids: string | string[] | undefined; sql: string; params: unknown[] }[] = [];
vi.mock("./browse-rows-query", () => ({
  // The rows are a JS stand-in for the WHERE (the reader's rows, narrowed by the ids), but the SQL
  // that would run is the REAL builder's, rendered and recorded so the tests can pin its predicates.
  collectionRowsQuery: async (_db: unknown, userId: string, ids?: string | string[]) => {
    const real = await vi.importActual<typeof import("./browse-rows-query")>("./browse-rows-query");
    const { db: realDb } = await vi.importActual<typeof import("../../db")>("../../db");
    const q = real.collectionRowsQuery(realDb, userId, ids).toSQL();
    asked.push({ userId, ids, sql: q.sql, params: q.params });
    const want = ids === undefined ? null : new Set(Array.isArray(ids) ? ids : [ids]);
    return (rowsByUser[userId] ?? []).filter((r) => !want || want.has(r.oracleId));
  },
}));
vi.mock("../../db", () => ({ db: {} }));
const flagsByOracle = new Map<string, CardBracketFlags>();
// Honors the ids the way the real read does: only the cards asked about come back.
const flagsRead = vi.fn(async (ids: string[]) => new Map([...flagsByOracle].filter(([id]) => ids.includes(id))));
vi.mock("../bracket/flags-read", () => ({ loadBracketFlags: (ids: string[]) => flagsRead(ids) }));
const partnersRead = vi.fn();
vi.mock("../combos/near-miss", async () => {
  const actual = await vi.importActual<typeof import("../combos/near-miss")>("../combos/near-miss");
  return { ...actual, loadOwnBothPartners: (a: unknown) => partnersRead(a) };
});
const pricesRead = vi.fn();
vi.mock("../cards/prices", () => ({ loadOwnedPrintingPrices: (ids: string[]) => pricesRead(ids) }));

const { loadBrowseCards, loadBrowseCardsFor } = await import("./browse-read");
const { collectionDrawFieldsFor } = await import("./list-wire");
const { bestPartnerPerCard, ownBothQuery } = await vi.importActual<typeof import("../combos/near-miss")>("../combos/near-miss");

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const D = "44444444-4444-4444-8444-444444444444";
const E = "55555555-5555-4555-8555-555555555555";
const F = "66666666-6666-4666-8666-666666666666";
const Z = "77777777-7777-4777-8777-777777777777"; // never owned by u1
const NAMES: Record<string, string> = { [A]: "Aye", [B]: "Bee", [C]: "Cee", [D]: "Dee", [E]: "Eee", [F]: "Eff", [Z]: "Zed" };
const row = (oracleId: string, over: Partial<RawCollectionRow> = {}): RawCollectionRow => ({
  oracleId, quantity: 1, setCode: "c21", collectorNumber: "1", finish: "nonfoil", name: NAMES[oracleId] ?? oracleId, typeLine: "Instant",
  manaCost: "{U}", cmc: 1, oracleText: null, keywords: [], rarity: "rare", colorIdentity: ["U"], gameChanger: false,
  layout: "normal", backImageUri: null, setName: "Commander 2021", releasedAt: "2021-04-23",
  preferredSetCode: null, preferredCollectorNumber: null, scryfallId: null, exactImageUri: `https://x/${oracleId}-e.jpg`,
  representativeImageUri: null, cardImageUri: null, exactArtCropUri: null, representativeArtCropUri: null,
  cardArtCropUri: null, flavorName: null, representativeFlavorName: null, exactBackImageUri: null,
  representativeBackImageUri: null, ...over,
});

// Two-card combos (variant, the pair, popularity). Shaped so the partner choice and the count both
// depend on pieces OUTSIDE any batch window:
//   A pairs with B, C (twice, v2 and v7: one partner), E: best is C (pop 9), otherPartners 2.
//   A-E and B-E reach E, which a batch of [A, B] does not contain.
//   C-Z reaches a card u1 does not own: never a pair.
const PAIRS: { variant: string; x: string; y: string; popularity: number }[] = [
  { variant: "v1", x: A, y: B, popularity: 5 },
  { variant: "v2", x: A, y: C, popularity: 9 },
  { variant: "v3", x: A, y: E, popularity: 1 },
  { variant: "v4", x: B, y: E, popularity: 3 },
  { variant: "v5", x: D, y: F, popularity: 7 },
  { variant: "v6", x: C, y: Z, popularity: 8 },
  { variant: "v7", x: A, y: C, popularity: 2 },
];

/**
 * The rows `ownBothQuery` returns, in JS: a row per (present, missing) direction of every pair, kept
 * when BOTH pieces are in `owned` (the reader's WHOLE collection, never the window) and, when a window
 * is given, only when the PRESENT side is in it (`a.oracle_id = any(window)`). The other side comes
 * from `owned` regardless of the window.
 */
function pairRows(owned: ReadonlySet<string>, window: ReadonlySet<string> | null): PairRow[] {
  const out: PairRow[] = [];
  for (const p of PAIRS) {
    for (const [a, b] of [[p.x, p.y], [p.y, p.x]] as const) {
      if (!owned.has(a) || !owned.has(b)) continue;
      if (window && !window.has(a)) continue;
      out.push({
        variant_id: p.variant, produces: ["Infinite mana"], popularity: p.popularity, present_id: a, missing_id: b,
        missing_name: NAMES[b], missing_must_be_commander: false,
      });
    }
  }
  return out;
}

const ownedBy = (userId: string) => new Set((rowsByUser[userId] ?? []).map((r) => r.oracleId));

const NO_FLAGS: CardBracketFlags = { massLandDenial: false, massLandDenialSources: [], extraTurn: false, extraTurnSources: [], tutor: false };

beforeEach(() => {
  for (const k of Object.keys(rowsByUser)) delete rowsByUser[k];
  asked.length = 0;
  flagsRead.mockClear();
  partnersRead.mockReset();
  pricesRead.mockReset();
  flagsByOracle.clear();
  flagsByOracle.set(D, { ...NO_FLAGS, tutor: true });
  flagsByOracle.set(E, { ...NO_FLAGS, extraTurn: true });
  // Price for every fixture card, so a price read that came back would put a `price` on a card.
  pricesRead.mockImplementation(async (ids: string[]) => {
    const prices = indexPriceRows([
      { newest_as_of: new Date("2026-11-01"), scryfall_id: "p-c21-1", set_code: "c21", collector_number: "1", price_cents: 150,
        price_cents_foil: 300, price_cents_etched: null, as_of: new Date("2026-11-01") },
    ]);
    return new Map(ids.map((id) => [id, prices]));
  });
  rowsByUser.u1 = [
    row(A), row(B, { gameChanger: true }), row(C, { finish: "foil" }), row(C, { setCode: "lea", collectorNumber: "9" }),
    row(D), row(E), row(F),
  ];
  rowsByUser.u2 = [row(A, { exactImageUri: "https://x/other-reader.jpg" })];
  // The real SQL's semantics: owned = the reader's whole collection (NOT the ids); the window narrows
  // only the present side. The real chooser (`bestPartnerPerCard`) shapes the rows.
  partnersRead.mockImplementation(async ({ userId, oracleIds }: { userId: string; oracleIds?: string[] }) =>
    bestPartnerPerCard(pairRows(ownedBy(userId), oracleIds ? new Set(oracleIds) : null)),
  );
});

/** Every field the fields route draws that a combo or a bracket pass sets, for one card. */
const drawn = (cards: { oracleId: string; comboPartner?: { oracleId?: string; name: string }; comboOtherPartners?: number; facts?: string[] }[], id: string) => {
  const c = cards.find((x) => x.oracleId === id);
  return { partner: c?.comboPartner, other: c?.comboOtherPartners, facts: c?.facts };
};

describe("bestPartnerPerCard: windowing the pairs", () => {
  const owned = ownedBy0();
  function ownedBy0() {
    return new Set([A, B, C, D, E, F]);
  }
  // Guards the window's contract with the chooser: choosing over only the pairs that touch the window
  // (present side in it, other side from the whole owned set) answers exactly what choosing over every
  // pair answers, for the windowed cards, partner AND otherPartners.
  it("answers a windowed card as the whole read does", () => {
    const window = new Set([A, B]);
    const all = bestPartnerPerCard(pairRows(owned, null));
    const windowed = bestPartnerPerCard(pairRows(owned, window));
    expect([...windowed.keys()].sort()).toEqual([A, B]);
    for (const id of window) expect(windowed.get(id)).toEqual(all.get(id));
    expect(windowed.get(A)).toMatchObject({ partnerOracleId: C, otherPartners: 2 });
    expect(windowed.get(B)).toMatchObject({ partnerOracleId: A, otherPartners: 1 });
  });

  // Guards "the owned set is the whole collection": narrowing it to the window drops E (and C), so A's
  // count falls from 2 to 0 and its best partner changes. The equivalence above would fail the same way.
  it("would answer differently if the other piece had to be inside the window", () => {
    const narrowed = bestPartnerPerCard(pairRows(new Set([A, B]), new Set([A, B])));
    expect(narrowed.get(A)).toMatchObject({ partnerOracleId: B, otherPartners: 0 });
  });
});

describe("ownBothQuery: the owned set is the collection, the window is the present side", () => {
  const show = (ids: string[] | null) => new PgDialect().sqlToQuery(ownBothQuery("u-1", ids)).sql.replace(/\s+/g, " ");
  // Guards narrowing `owned` to the batch: the CTE that names the reader's cards must carry the user
  // predicate and no id array, while the window lands on `a.oracle_id` after it.
  it("keeps the id window out of the owned set", () => {
    const sql = show([A, B]);
    const owned = sql.slice(sql.indexOf("with owned as ("), sql.indexOf("pair as ("));
    expect(owned).toMatch(/from collection_items where user_id = \$\d+/);
    expect(owned).not.toContain("any(");
    expect(sql).toMatch(/and a\.oracle_id = any\(\$\d+::uuid\[\]\)/);
    expect(sql).toContain("b.oracle_id in (select oracle_id from owned)");
  });
});

describe("loadBrowseCardsFor", () => {
  const BATCHES = [[A, B], [E], [C, F], [A, B, C, D, E, F]];

  it("answers every draw field the whole list would, for each batch", async () => {
    const whole = await loadBrowseCards("u1", async () => new Map());
    for (const batch of BATCHES) {
      partnersRead.mockClear();
      const bounded = await loadBrowseCardsFor("u1", batch);
      const ids = new Set(batch);
      // Guards the toListCards/draw-field wiring: same fields, id for id.
      expect(collectionDrawFieldsFor(bounded, ids)).toEqual(collectionDrawFieldsFor(whole.cards, ids));
      for (const id of batch) {
        // Partner id and name, otherPartners, and the facts, each against the whole-list card.
        expect(drawn(bounded, id), `card ${NAMES[id]} in batch ${batch.map((b) => NAMES[b])}`).toEqual(drawn(whole.cards, id));
      }
      // Guards dropping `scoped`: the batch's ids must reach the combo read as its window. (The
      // answers alone cannot tell, since the window changes cost, not results.)
      expect(partnersRead).toHaveBeenCalledTimes(1);
      expect(partnersRead).toHaveBeenLastCalledWith({ userId: "u1", oracleIds: batch });
    }
  });

  it("is not vacuous: partners, counts and facts are real, and reach outside the batch", async () => {
    const [a, b] = await loadBrowseCardsFor("u1", [A, B]);
    // A's best partner is C and A has two others, B and E: C and E are not in the batch, so a read
    // that took its owned set from the batch alone would name B with no others (guards narrowing).
    expect(a.comboPartner).toEqual({ oracleId: C, name: "Cee" });
    expect(a.comboOtherPartners).toBe(2);
    expect(b.comboPartner).toEqual({ oracleId: A, name: "Aye" });
    expect(b.comboOtherPartners).toBe(1);
    expect(b.facts).toEqual(["gameChanger"]);
    // Facts from the flags read come through, and only for the batch's cards.
    const [d, f] = await loadBrowseCardsFor("u1", [D, F]);
    expect(d.facts).toEqual(["tutor"]);
    expect(f.facts).toBeUndefined();
    expect(flagsRead).toHaveBeenLastCalledWith([D, F]);
    expect(a.imageUri).toBe(`https://x/${A}-e.jpg`);
  });

  it("matches the whole list for a subset too, reading only that subset", async () => {
    const whole = await loadBrowseCards("u1", async () => new Map());
    const bounded = await loadBrowseCardsFor("u1", [C]);
    expect(collectionDrawFieldsFor(bounded, new Set([C]))).toEqual(collectionDrawFieldsFor(whole.cards, new Set([C])));
    expect(bounded.map((c) => c.oracleId)).toEqual([C]);
    // The batch's ids reach the three reads, and the rows read are the reader's, narrowed.
    expect(asked.at(-1)).toMatchObject({ userId: "u1", ids: [C] });
    expect(flagsRead).toHaveBeenLastCalledWith([C]);
    expect(partnersRead).toHaveBeenLastCalledWith({ userId: "u1", oracleIds: [C] });
  });

  // The rows come from a JS stand-in for the WHERE, so the JS result pins the cross-reader fixture and
  // the SQL the real builder renders pins the predicate that would do it in the database.
  it("never reads another reader's rows: the user id is the session's, and a shared id answers with the reader's own copy", async () => {
    const [mine] = await loadBrowseCardsFor("u1", [A]);
    const [theirs] = await loadBrowseCardsFor("u2", [A]);
    expect(mine.imageUri).toBe(`https://x/${A}-e.jpg`);
    expect(theirs.imageUri).toBe("https://x/other-reader.jpg");
    expect(asked.map((a) => a.userId)).toEqual(["u1", "u2"]);
    // Guards dropping or loosening the `user_id` predicate, and the ids as a bound parameter.
    for (const call of asked) {
      expect(call.sql).toMatch(/"collection_items"\."user_id" = \$\d+/);
      expect(call.sql).toMatch(/"collection_items"\."oracle_id" in \(\$\d+\)/);
      expect(call.params).toEqual(expect.arrayContaining([call.userId, A]));
      expect(call.sql).not.toContain(A);
    }
    expect(asked[0].params).not.toContain("u2");
    expect(asked[1].params).not.toContain("u1");
  });

  it("omits an id the reader does not hold", async () => {
    expect(await loadBrowseCardsFor("u2", [B, C])).toEqual([]);
    expect((await loadBrowseCardsFor("u2", [A, B])).map((c) => c.oracleId)).toEqual([A]);
  });

  it("reads nothing for no ids", async () => {
    expect(await loadBrowseCardsFor("u1", [])).toEqual([]);
    expect(asked).toEqual([]);
  });

  it("reads no prices: a price is not a draw field", async () => {
    // Control: the whole-list path reads the same mock and puts a price on the card, so the mock works.
    const whole = await loadBrowseCards("u1");
    expect(pricesRead).toHaveBeenCalledTimes(1);
    expect(whole.cards.find((c) => c.oracleId === A)?.price).toBeDefined();
    pricesRead.mockClear();
    // Guards re-adding the price read (or `attachPrices`) to the bounded path.
    const cards = await loadBrowseCardsFor("u1", [A, B, C, D, E, F]);
    expect(pricesRead).not.toHaveBeenCalled();
    for (const card of cards) expect(Object.hasOwn(card, "price")).toBe(false);
  });
});
