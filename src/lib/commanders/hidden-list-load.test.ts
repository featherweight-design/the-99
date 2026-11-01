// `loadHiddenList` over a stubbed database: what each row is handed, and when the collection is read.
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ rows: [] as unknown[], collection: [] as unknown[], distinct: 0 }));

// A query builder whose every step returns itself and which awaits to the stubbed rows.
vi.mock("../../db", () => {
  const chain = (result: () => unknown[]) => {
    const q: Record<string, unknown> = {};
    for (const step of ["from", "innerJoin", "where", "orderBy"]) q[step] = () => q;
    q.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(result()).then(resolve, reject);
    return q;
  };
  return {
    db: {
      select: () => chain(() => store.rows),
      selectDistinct: () => {
        store.distinct += 1;
        return chain(() => store.collection);
      },
    },
  };
});
// The slug lookup reads the stored scores and the discovery population. By default every id has a slug and every
// id is ranked (a rankable stored score); a test narrows `unranked`.
const unranked = vi.hoisted(() => new Set<string>());
const loadHiddenPages = vi.hoisted(() =>
  vi.fn(async (_u: string, ids: string[], _collection: string[], _env: NodeJS.ProcessEnv) => ({
    slugs: new Map(ids.map((id) => [id, `${id}-slug`] as [string, string])),
    ranked: new Set(ids.filter((id) => !unranked.has(id))),
  })),
);
vi.mock("./hidden-matches", () => ({ loadHiddenPages }));

const { loadHiddenList } = await import("./hidden-list");

const ENV = {} as NodeJS.ProcessEnv;
const at = new Date("2026-10-31T15:00:00Z");
const raw = (over: Record<string, unknown>) => ({
  oracleId: "x",
  hiddenAt: at,
  name: "X",
  colorIdentity: ["G"],
  imageUri: null,
  legal: true,
  owned: true,
  candidate: true,
  deckId: null,
  ...over,
});

beforeEach(() => {
  store.rows = [];
  store.collection = [];
  store.distinct = 0;
  unranked.clear();
  loadHiddenPages.mockClear();
});

describe("loadHiddenList", () => {
  it("asks nothing more when nothing is hidden", async () => {
    expect(await loadHiddenList("u", ENV)).toEqual([]);
    expect(loadHiddenPages).not.toHaveBeenCalled();
    expect(store.distinct).toBe(0);
  });

  it("links a built commander's row to its deck and asks no slug for it", async () => {
    store.rows = [raw({ oracleId: "built", deckId: "deck-9" }), raw({ oracleId: "own" })];
    const rows = await loadHiddenList("u", ENV);
    expect(rows.map((r) => [r.oracleId, r.href, r.lane, r.built])).toEqual([
      ["built", "/decks/deck-9", null, true],
      ["own", "/commanders/own-slug", "foryou", false],
    ]);
    expect(loadHiddenPages.mock.calls[0][1]).toEqual(["own"]);
    expect(rows[0].hiddenAt).toBe("2026-10-31T15:00:00.000Z");
  });

  // The discovery slugs are assigned over the whole collection, so it is read only when they are needed.
  it("reads the collection only when an unbuilt hidden commander is unowned", async () => {
    store.rows = [raw({ oracleId: "own" })];
    await loadHiddenList("u", ENV);
    expect(store.distinct).toBe(0);
    expect(loadHiddenPages.mock.calls[0][2]).toEqual(["own"]);

    store.rows = [raw({ oracleId: "own" }), raw({ oracleId: "far", owned: false })];
    store.collection = [{ oracleId: "own" }, { oracleId: "other" }];
    const rows = await loadHiddenList("u", ENV);
    expect(store.distinct).toBe(1);
    expect(loadHiddenPages.mock.calls[1][2]).toEqual(["own", "other"]);
    expect(rows[1].lane).toBe("discover");
  });

  it("draws no link where no list resolves a slug", async () => {
    loadHiddenPages.mockResolvedValueOnce({ slugs: new Map(), ranked: new Set() });
    store.rows = [raw({ oracleId: "far", owned: false, candidate: false })];
    const [row] = await loadHiddenList("u", ENV);
    expect(row.href).toBeNull();
    expect(row.lane).toBeNull();
  });

  // For you draws its rankable stored scores: an owned commander without one is in neither list.
  it("says neither list of an owned commander For you has not ranked", async () => {
    unranked.add("own");
    store.rows = [raw({ oracleId: "own" })];
    const [row] = await loadHiddenList("u", ENV);
    expect(row.lane).toBeNull();
  });
});
