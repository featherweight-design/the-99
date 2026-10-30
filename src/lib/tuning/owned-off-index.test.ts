import { beforeEach, describe, expect, it, vi } from "vitest";

const availability = vi.hoisted(() => ({ map: new Map<string, { free: number }>(), calls: [] as string[][] }));
const prices = vi.hoisted(() => ({ map: new Map<string, number>() }));
vi.mock("../decks/availability-query", () => ({
  loadAvailability: vi.fn(async (_u: string, opts: { oracleIds: string[] }) => { availability.calls.push(opts.oracleIds); return availability.map; }),
}));
vi.mock("../decks/price-query", () => ({
  loadPrices: vi.fn(async () => {
    const asOf = new Date(0);
    return { prices: new Map([...prices.map].map(([id, cents]) => [id, { cents, foilCents: null, etchedCents: null, asOf }])), newestAsOf: asOf };
  }),
}));

import { db } from "../../db";
import { ENV_VIEW } from "@/test/env-view";
import { loadOwnedOffIndex, NEIGHBOUR_COMMANDERS, neighbourQuery, offIndexQuery, rankOffIndex, readOwnedOffIndex } from "./owned-candidates";
import { OWNED_OFF_INDEX_MAX } from "./limits";

const args = {
  userId: "u1", deckId: "deck", commanderOracleIds: ["cmd"], colorIdentity: ["W", "U"], inDeck: new Set(["d1", "d2"]),
  limits: { capCents: null as number | null, sets: [] as string[] }, env: ENV_VIEW,
};

describe("offIndexQuery", () => {
  it("aliases and qualifies every correlated subquery on the single-table select (AGENTS.md)", () => {
    const { sql } = offIndexQuery(db, { ...args, neighbours: ["n1"] }).toSQL();
    // Both ranking sums name the outer card explicitly; a bare "oracle_id" would compare csc with itself.
    expect(sql).toContain('(select sum(csc.inclusion)::float8 from "commander_support_cards" csc where csc.oracle_id = "cards".oracle_id and csc.commander_oracle_id = any(');
    expect(sql).toContain('join "cards" cc on cc.oracle_id = csc.commander_oracle_id where csc.oracle_id = "cards".oracle_id and cc.color_identity <@');
    expect(sql).toContain('ci.oracle_id = "cards".oracle_id');
    expect(sql).toContain('twin.name = "cards".name and twin.oracle_id <> "cards".oracle_id');
    expect(sql).not.toMatch(/= "oracle_id"/);
  });

  it("keeps the card off this commander's index, out of the deck, not a commander, and owned", () => {
    const { sql, params } = offIndexQuery(db, { ...args, neighbours: [] }).toSQL();
    expect(sql).toContain('not exists (select 1 from "commander_support_cards" csc where csc.oracle_id = "cards".oracle_id and csc.commander_oracle_id = any(');
    // Two exclusions by id: the deck's cards, and its commanders (a commander need not sit in deck_cards).
    expect(sql.match(/"cards"\.oracle_id <> all\(/g)).toHaveLength(2);
    expect(sql).toContain("collection_items");
    expect(params).toContainEqual(["cmd"]);
    expect(params).toContainEqual(["d1", "d2"]);
    expect(params).toContain("u1");
  });
});

describe("neighbourQuery", () => {
  it("reads commanders inside the identity, not the deck's own, by overlap with the deck's cards, at most twenty", () => {
    const { sql, params } = neighbourQuery(db, args).toSQL();
    expect(sql).toContain('"cards"."color_identity" <@');
    expect(sql).toContain('"commander_support_cards"."commander_oracle_id" <> all(');
    expect(sql).toContain('"commander_support_cards"."oracle_id" = any(');
    expect(sql).toMatch(/order by count\(\*\) desc/);
    expect(params).toContain(NEIGHBOUR_COMMANDERS);
    expect(NEIGHBOUR_COMMANDERS).toBe(20);
  });
});

describe("rankOffIndex", () => {
  const row = (name: string, neighbourInclusion: number | null, identityInclusion: number | null) => ({ oracleId: name, name, neighbourInclusion, identityInclusion });
  it("orders by neighbour inclusion, then identity-wide inclusion, then the name, and drops a card scoring nothing on both", () => {
    const ranked = rankOffIndex([
      row("Z low", 5, 900), row("Identity only", null, 50), row("B high", 40, 10), row("A high", 40, 10), row("A tie", 40, 30),
      row("Nothing", null, null), row("Zero", 0, 0),
    ]);
    expect(ranked.map((r) => r.name)).toEqual(["A tie", "A high", "B high", "Z low", "Identity only"]);
  });
});

describe("loadOwnedOffIndex", () => {
  type Row = { oracleId: string; name: string; typeLine: string; neighbourInclusion: number | null; identityInclusion: number | null };
  const row = (i: number, n: number | null = 100 - i, id: number | null = null): Row => ({ oracleId: `id${i}`, name: `Card ${i}`, typeLine: "Artifact", neighbourInclusion: n, identityInclusion: id });
  // The first select is the neighbours' read, the second the candidates'.
  const reader = (neighbours: string[], rows: Row[]) => {
    let call = 0;
    const seen = { neighbourReads: 0 };
    const r = {
      select: () => {
        const mine = call++;
        const result = mine === 0 && neighbours !== null ? neighbours.map((commanderOracleId) => ({ commanderOracleId, overlap: 1 })) : rows;
        if (mine === 0) seen.neighbourReads++;
        const chain: Record<string, unknown> = {};
        for (const m of ["from", "innerJoin", "where", "groupBy", "orderBy", "limit"]) chain[m] = () => chain;
        chain.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej);
        return chain;
      },
    };
    return { read: r as unknown as Parameters<typeof loadOwnedOffIndex>[1], seen };
  };

  beforeEach(() => {
    availability.map = new Map();
    availability.calls = [];
    prices.map = new Map();
  });

  it("returns the ranked cards, skipping one with no free copy, one over the cap, one already offered, and one scoring nothing", async () => {
    availability.map = new Map([["id1", { free: 0 }], ["id2", { free: 1 }]]);
    prices.map = new Map([["id3", 900], ["id4", 100]]);
    const { read } = reader(["n1"], [row(4), row(1), row(2), row(3), row(5), row(6, null, null)]);
    const out = await loadOwnedOffIndex({ ...args, limits: { capCents: 300, sets: [] }, exclude: new Set(["id5"]) }, read);
    expect(out.map((c) => c.oracleId)).toEqual(["id2", "id4"]);
    expect(out[0]).toEqual({ oracleId: "id2", name: "Card 2", typeLine: "Artifact" });
  });

  it("stops at its room, never past OWNED_OFF_INDEX_MAX, and reads nothing with no room or no commander", async () => {
    const rows = Array.from({ length: 120 }, (_, i) => row(i, 1000 - i));
    expect(await loadOwnedOffIndex({ ...args, max: 3 }, reader(["n1"], rows).read)).toHaveLength(3);
    expect(await loadOwnedOffIndex({ ...args, max: 500 }, reader(["n1"], rows).read)).toHaveLength(OWNED_OFF_INDEX_MAX);
    const none = reader(["n1"], rows);
    expect(await loadOwnedOffIndex({ ...args, max: 0 }, none.read)).toEqual([]);
    expect(none.seen.neighbourReads).toBe(0);
    expect(await loadOwnedOffIndex({ ...args, commanderOracleIds: [] }, reader(["n1"], rows).read)).toEqual([]);
  });

  // Only a tier that ran out of ranked cards below its room is complete: one that filled its room is the top of a longer
  // list, and one given no room was never read.
  it("reports the tier complete only when it ran out of cards below its room", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => row(i, 100 - i));
    expect(await readOwnedOffIndex({ ...args, max: 10 }, reader(["n1"], rows).read)).toMatchObject({ complete: true });
    expect((await readOwnedOffIndex({ ...args, max: 5 }, reader(["n1"], rows).read)).complete).toBe(false);
    expect((await readOwnedOffIndex({ ...args, max: 3 }, reader(["n1"], rows).read)).complete).toBe(false);
    expect(await readOwnedOffIndex({ ...args, max: 0 }, reader(["n1"], rows).read)).toEqual({ cards: [], complete: false });
    availability.map = new Map([["id0", { free: 0 }]]);
    expect(await readOwnedOffIndex({ ...args, max: 5 }, reader(["n1"], rows).read)).toMatchObject({ complete: true });
  });

  it("reads past a slice whose every card is claimed elsewhere instead of coming back short", async () => {
    const rows = Array.from({ length: 20 }, (_, i) => row(i, 1000 - i));
    availability.map = new Map(rows.slice(0, 6).map((r) => [r.oracleId, { free: 0 }]));
    const out = await loadOwnedOffIndex({ ...args, max: 2 }, reader(["n1"], rows).read);
    expect(out.map((c) => c.oracleId)).toEqual(["id6", "id7"]);
    expect(availability.calls).toHaveLength(2);
  });
});
