import { beforeEach, describe, expect, it, vi } from "vitest";

// A query stand-in: every builder method returns the chain, and awaiting it answers `fake.answer()`. The real db stays in
// place (so each query's SQL can be rendered) until a test turns `fake.on`.
const fake = vi.hoisted(() => {
  const state = { on: false, calls: 0, answer: (): unknown => [] };
  const chain = (): unknown => {
    state.calls++;
    const p: unknown = new Proxy({}, {
      get: (_t, prop) => prop === "then"
        ? (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve().then(() => state.answer()).then(res, rej)
        : () => p,
    });
    return p;
  };
  return { state, chain };
});
vi.mock("../../db", async (orig) => {
  const real = (await orig<typeof import("../../db")>()).db;
  return { db: { select: (...a: Parameters<typeof real.select>) => (fake.state.on ? fake.chain() : real.select(...a)) } };
});

const generation = vi.hoisted(() => vi.fn(async () => "1000"));
const keys = vi.hoisted(() => [] as string[][]);
const store = vi.hoisted(() => new Map<string, unknown>());
vi.mock("../cache/catalog-generation", () => ({ catalogGeneration: generation }));
// A stand-in for Next's data cache: stores what the function returns under its key, and nothing that throws.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>, key: string[]) => async () => {
    keys.push(key);
    const k = key.join("|");
    if (store.has(k)) return store.get(k);
    const value = await fn();
    store.set(k, value);
    return value;
  },
}));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));

import {
  PUBLIC_OVERVIEW_BASIS, PUBLIC_OVERVIEW_CONTRACT, loadPublicPreconOverview, preconOverviewQuery, preconsWithOverviewKey,
  preconsWithOverviewQuery, publicPreconOverviewKey, readPreconsWithOverview, readPublicPreconOverview,
} from "./precon-overview";

const FILE = "MirrorMastery_C19";
const ROW = { fileName: FILE, name: "Mirror Mastery", setCode: "C19", content: { overview: "Copies your best spells.", verdicts: [] } };

beforeEach(() => {
  fake.state.on = false;
  fake.state.calls = 0;
  fake.state.answer = () => [];
  keys.length = 0;
  store.clear();
  generation.mockResolvedValue("1000");
});

describe("which Overview a public page shows", () => {
  it("is the contract every precon Overview is written at, on the labels basis", () => {
    expect(PUBLIC_OVERVIEW_CONTRACT).toBe(13);
    expect(PUBLIC_OVERVIEW_BASIS).toBe("labels");
  });

  it("reads one precon's row: current, at that contract and basis, a plain precon, with an Overview, one row at most", () => {
    const q = preconOverviewQuery(FILE).toSQL();
    expect(q.sql).toMatch(/from "precon_synopses" inner join "precons" on "precons"\."file_name" = "precon_synopses"\."precon_file"/);
    expect(q.sql).toMatch(/"precon_synopses"\."precon_file" = \$1/);
    expect(q.sql).toMatch(/"precon_synopses"\."current" = \$2 and "precon_synopses"\."contract_version" = \$3 and "precon_synopses"\."role_basis" = \$4 and "precons"\."twin_of" is null/);
    expect(q.sql).toMatch(/"precon_synopses"\."content"->>'overview' is not null/);
    expect(q.sql).toMatch(/limit \$5$/);
    expect(q.params).toEqual([FILE, true, 13, "labels", 1]);
  });

  it("lists the precons it can feature by the same rule, by name then file", () => {
    const q = preconsWithOverviewQuery().toSQL();
    expect(q.sql).toMatch(/^select "precons"\."file_name", "precons"\."name" from "precon_synopses" inner join "precons"/);
    expect(q.sql).toMatch(/"precons"\."twin_of" is null/);
    expect(q.sql).toMatch(/order by "precons"\."name" asc, "precons"\."file_name" asc$/);
    expect(q.params).toEqual([true, 13, "labels"]);
  });
});

describe("loadPublicPreconOverview", () => {
  it("answers the row, or null when there is none or its Overview is missing", async () => {
    fake.state.on = true;
    fake.state.answer = () => [ROW];
    expect(await loadPublicPreconOverview(FILE)).toEqual(ROW);
    fake.state.answer = () => [];
    expect(await loadPublicPreconOverview(FILE)).toBeNull();
    fake.state.answer = () => [{ ...ROW, content: { ...ROW.content, overview: null } }];
    expect(await loadPublicPreconOverview(FILE)).toBeNull();
  });
});

describe("the public precon Overview cache", () => {
  it("keys on the catalog generation, the deployment and the file", () => {
    expect(publicPreconOverviewKey("1000", FILE, "dpl_1")).toEqual(["public-precon-overview", "gen:1000", "dep:dpl_1", `file:${FILE}`]);
    expect(preconsWithOverviewKey("1000", "dpl_1")).toEqual(["public-precons-with-overview", "gen:1000", "dep:dpl_1"]);
  });

  it("serves a found Overview from the store until the catalog moves, then reads again", async () => {
    fake.state.on = true;
    fake.state.answer = () => [ROW];
    await readPublicPreconOverview(FILE);
    await readPublicPreconOverview(FILE);
    expect(fake.state.calls).toBe(1);
    generation.mockResolvedValue("2000");
    expect(await readPublicPreconOverview(FILE)).toEqual(ROW);
    expect(fake.state.calls).toBe(2);
    expect(keys.at(-1)).toContain("gen:2000");
  });

  it("never stores a precon with no Overview, nor an empty list", async () => {
    fake.state.on = true;
    expect(await readPublicPreconOverview("Nobody_X")).toBeNull();
    expect(await readPreconsWithOverview()).toEqual([]);
    expect(store.size).toBe(0);
  });

  it("stores a list that names a precon", async () => {
    fake.state.on = true;
    fake.state.answer = () => [{ fileName: FILE, name: "Mirror Mastery" }];
    await readPreconsWithOverview();
    await readPreconsWithOverview();
    expect(fake.state.calls).toBe(1);
  });

  it("lets a failed read throw, and stores nothing", async () => {
    fake.state.on = true;
    fake.state.answer = () => { throw new Error("db down"); };
    await expect(readPublicPreconOverview(FILE)).rejects.toThrow("db down");
    expect(store.size).toBe(0);
  });
});
