import { beforeEach, describe, expect, it, vi } from "vitest";

// The query's own SQL is proved against staging by `scripts/probe-tuning-owned.mts`; what is pinned
// here is the loop around it: paging past thinned pages, the free-copy and price tests, the cap, and
// an exhausted index. `calls.pages` is the rows each page of the (mocked) ranked query returns.
const calls = vi.hoisted(() => ({
  pages: [] as { oracleId: string; name: string; typeLine: string }[][],
  offsets: [] as number[],
  free: new Map<string, number>(),
  prices: new Map<string, number>(),
}));

vi.mock("../../db", () => {
  const chain = {
    from: () => chain, innerJoin: () => chain, where: () => chain, groupBy: () => chain, orderBy: () => chain,
    limit: () => chain,
    offset: async (n: number) => { calls.offsets.push(n); return calls.pages[n / 200] ?? []; },
  };
  return { db: { select: () => chain } };
});
vi.mock("../decks/availability-query", () => ({
  loadAvailability: async () => new Map([...calls.free].map(([id, free]) => [id, { free }])),
}));
vi.mock("../decks/price-query", () => ({
  loadPrices: async () => {
    const asOf = new Date(0);
    return { prices: new Map([...calls.prices].map(([id, cents]) => [id, { cents, foilCents: null, etchedCents: null, asOf }])), newestAsOf: asOf };
  },
}));

import { loadOwnedCandidates } from "./owned-candidates";
import { ENV_VIEW } from "@/test/env-view";

const row = (i: number) => ({ oracleId: `id${i}`, name: `Card ${i}`, typeLine: "Artifact" });
const page = (from: number, n: number) => Array.from({ length: n }, (_, i) => row(from + i));
const args = {
  userId: "u", deckId: "d", commanderOracleIds: ["cmd"], colorIdentity: ["W"], inDeck: new Set<string>(),
  limits: { capCents: null as number | null, sets: [] as string[] }, env: ENV_VIEW,
};

beforeEach(() => {
  calls.pages = [];
  calls.offsets = [];
  calls.free = new Map();
  calls.prices = new Map();
});

describe("loadOwnedCandidates", () => {
  it("returns the ranked rows in order, and nothing for a commander-less deck", async () => {
    calls.pages = [page(0, 3)];
    expect((await loadOwnedCandidates(args)).map((c) => c.name)).toEqual(["Card 0", "Card 1", "Card 2"]);
    expect(await loadOwnedCandidates({ ...args, commanderOracleIds: [] })).toEqual([]);
  });

  it("skips a card whose every copy is claimed by another deck, and keeps one with no availability row", async () => {
    calls.pages = [page(0, 3)];
    calls.free = new Map([["id0", 0], ["id1", 2]]);
    expect((await loadOwnedCandidates(args)).map((c) => c.oracleId)).toEqual(["id1", "id2"]);
  });

  it("drops a card over the cap, and keeps one with no usable price", async () => {
    calls.pages = [page(0, 3)];
    calls.prices = new Map([["id0", 900], ["id1", 100]]);
    const got = await loadOwnedCandidates({ ...args, limits: { capCents: 300, sets: [] } });
    expect(got.map((c) => c.oracleId)).toEqual(["id1", "id2"]);
  });

  // The review finding: one fixed read-ahead made a collection whose top cards are claimed elsewhere
  // come back EMPTY, which sends the run to cards to buy while the player owns fits.
  it("pages past a full page of claimed cards instead of coming back empty", async () => {
    calls.pages = [page(0, 200), page(200, 3)];
    calls.free = new Map(page(0, 200).map((r) => [r.oracleId, 0]));
    expect((await loadOwnedCandidates(args)).map((c) => c.oracleId)).toEqual(["id200", "id201", "id202"]);
    expect(calls.offsets).toEqual([0, 200]);
  });

  it("stops at the size cap without reading another page, and at an exhausted index", async () => {
    calls.pages = [page(0, 200), page(200, 200)];
    const got = await loadOwnedCandidates({ ...args, max: 5 });
    expect(got).toHaveLength(5);
    expect(calls.offsets).toEqual([0]);

    calls.offsets = [];
    calls.pages = [page(0, 200), []];
    calls.free = new Map(page(0, 200).map((r) => [r.oracleId, 0]));
    expect(await loadOwnedCandidates(args)).toEqual([]);
    expect(calls.offsets).toEqual([0, 200]);
  });
});
