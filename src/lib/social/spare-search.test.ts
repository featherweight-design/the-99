// Keep a card back's search pages past owned matches that decks claim in full (review round 1): the first page of
// owned matches can hold no spare at all, and the search must read on rather than answer "none match".
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ pages: [] as { oracleId: string; name: string }[][], offsets: [] as number[], availability: vi.fn() }));

// The query layer: a select chain whose `offset` picks the page; awaited, it answers that page's rows.
vi.mock("../../db", () => {
  const chain = (): Record<string, unknown> => {
    let offset = 0;
    const c: Record<string, unknown> = {};
    for (const k of ["select", "from", "leftJoin", "where", "orderBy", "limit"]) c[k] = () => c;
    c.offset = (n: number) => {
      offset = n;
      m.offsets.push(n);
      return c;
    };
    c.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(m.pages[offset / 48] ?? []).then(res, rej);
    return c;
  };
  return { db: { select: () => chain() } };
});
vi.mock("../decks/availability-query", () => ({ loadAvailability: m.availability }));
// The name match only shapes SQL, which the fake chain above ignores.
vi.mock("../cards/name-search", () => ({ nameSearch: () => ({ flavorHits: { oracleId: "flavor_hits.oracle_id" }, where: null, rank: null }) }));

import { searchSpareCards, SPARE_SEARCH_LIMIT, SPARE_SEARCH_MAX_PAGES, SPARE_SEARCH_PAGE } from "./spare-settings";

const ENV = {} as NodeJS.ProcessEnv;
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const rows = (from: number, count: number) => Array.from({ length: count }, (_, i) => ({ oracleId: id(from + i), name: `Card ${from + i}` }));
// Every card is owned twice; a card under `claimedBelow` is claimed in full by decks.
const availabilityFor = (claimedBelow: number) => async (_u: string, { oracleIds }: { oracleIds: string[] }) =>
  new Map(oracleIds.map((o) => {
    const n = Number(o.slice(-12));
    return [o, { owned: 2, hard: n < claimedBelow ? 2 : 0, soft: 0 }];
  }));

beforeEach(() => {
  m.pages = [];
  m.offsets = [];
  m.availability.mockReset();
});

describe("searchSpareCards", () => {
  it("reads past a first page of owned matches that decks claim in full", async () => {
    expect(SPARE_SEARCH_PAGE).toBe(48);
    m.pages = [rows(0, 48), rows(48, 48)];
    m.availability.mockImplementation(availabilityFor(48));
    const hits = await searchSpareCards("user_me", "card", ENV);
    expect(hits).toHaveLength(SPARE_SEARCH_LIMIT);
    expect(hits[0]).toEqual({ oracleId: id(48), name: "Card 48", spare: 2 });
    expect(m.offsets).toEqual([0, 48]);
  });

  it("stops once twelve spares are found, and when the matches run out", async () => {
    m.pages = [rows(0, 48), rows(48, 48)];
    m.availability.mockImplementation(availabilityFor(0));
    expect(await searchSpareCards("user_me", "card", ENV)).toHaveLength(SPARE_SEARCH_LIMIT);
    expect(m.offsets).toEqual([0]);

    m.offsets = [];
    m.pages = [rows(0, 48), rows(48, 5)];
    m.availability.mockImplementation(availabilityFor(50));
    expect((await searchSpareCards("user_me", "card", ENV)).map((h) => h.name)).toEqual(["Card 50", "Card 51", "Card 52"]);
    expect(m.offsets).toEqual([0, 48]);
  });

  it("reads at most the bounded number of pages", async () => {
    m.pages = Array.from({ length: SPARE_SEARCH_MAX_PAGES + 5 }, (_, p) => rows(p * 48, 48));
    m.availability.mockImplementation(availabilityFor(1e9));
    expect(await searchSpareCards("user_me", "card", ENV)).toEqual([]);
    expect(m.offsets).toHaveLength(SPARE_SEARCH_MAX_PAGES);
  });
});
