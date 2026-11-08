import { beforeEach, describe, expect, it, vi } from "vitest";

// A query stand-in: every builder method returns the chain, and awaiting it answers `fake.answer(key index)`. The real db
// stays in place (so each query's SQL can be rendered) until a test turns `fake.on`.
const fake = vi.hoisted(() => {
  const state = { on: false, calls: 0, answer: (_i: number): unknown => [{ n: 7 }] };
  const chain = (): unknown => {
    const i = state.calls++;
    const p: unknown = new Proxy({}, {
      get: (_t, prop) => prop === "then"
        ? (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve().then(() => state.answer(i)).then(res, rej)
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
// `React.cache` memoizes per request; outside one it would hold across tests, so each call reads through here.
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));

import { LANDING_STAT_QUERIES, landingStatsKey, loadLandingStats, readLandingStats, statValue, type LandingStatKey } from "./landing-stats";

const KEYS = Object.keys(LANDING_STAT_QUERIES) as LandingStatKey[];
const at = (key: LandingStatKey) => KEYS.indexOf(key);
const rendered = (key: LandingStatKey) => (LANDING_STAT_QUERIES[key]() as unknown as { toSQL(): { sql: string; params: unknown[] } }).toSQL();

beforeEach(() => {
  fake.state.on = false;
  fake.state.calls = 0;
  fake.state.answer = () => [{ n: 7 }];
  keys.length = 0;
  store.clear();
  generation.mockResolvedValue("1000");
});

describe("the landing's counts", () => {
  it("reads every figure the plan names", () => {
    expect([...KEYS].sort()).toEqual(["cards", "combos", "commanders", "commandersWithProse", "plainPrecons", "preconOverviews", "precons", "printings"]);
  });

  it("counts whole catalog tables for the plain figures", () => {
    expect(rendered("commanders").sql).toMatch(/^select count\(\*\) from "commander_support"$/);
    expect(rendered("precons").sql).toMatch(/^select count\(\*\) from "precons"$/);
    expect(rendered("combos").sql).toMatch(/^select count\(\*\) from "spellbook_variants"$/);
    expect(rendered("cards").sql).toMatch(/^select count\(\*\) from "cards"$/);
    expect(rendered("printings").sql).toMatch(/^select count\(\*\) from "printings"$/);
  });

  it("counts only commanders whose page draws a sentence: an ok read and prose that is not blank", () => {
    const q = rendered("commandersWithProse");
    expect(q.sql).toMatch(/from "commander_support" where \("commander_support"\."synergy_state" = \$1 and btrim\(coalesce\("commander_support"\."prose", ''\)\) <> ''\)/);
    expect(q.params).toEqual(["ok"]);
  });

  it("counts plain precons as the ones that are no one's twin", () => {
    expect(rendered("plainPrecons").sql).toMatch(/from "precons" where "precons"\."twin_of" is null/);
  });

  it("counts plain precons with a shown Overview, once each, at the public contract and basis", () => {
    const q = rendered("preconOverviews");
    expect(q.sql).toMatch(/count\(distinct "precon_synopses"\."precon_file"\)/);
    expect(q.sql).toMatch(/inner join "precons" on "precons"\."file_name" = "precon_synopses"\."precon_file"/);
    expect(q.sql).toMatch(/"precon_synopses"\."current" = \$1/);
    expect(q.sql).toMatch(/"precons"\."twin_of" is null/);
    expect(q.sql).toMatch(/"precon_synopses"\."content"->>'overview' is not null/);
    expect(q.params).toEqual([true, 13, "labels"]);
  });
});

describe("statValue", () => {
  it("takes a whole count, as a number or the driver's string, and refuses anything else", () => {
    expect(statValue(42)).toBe(42);
    expect(statValue("42")).toBe(42);
    expect(statValue(0)).toBe(0);
    for (const bad of [null, undefined, "", " ", "x", 1.5, -1, Number.NaN, Infinity, {}]) expect(statValue(bad)).toBeNull();
  });
});

describe("loadLandingStats", () => {
  it("answers every figure that was read", async () => {
    fake.state.on = true;
    const stats = await loadLandingStats();
    expect(Object.keys(stats).sort()).toEqual([...KEYS].sort());
    expect(stats.cards).toBe(7);
  });

  it("leaves out a count that fails, or comes back unusable, and never shows it as zero", async () => {
    fake.state.on = true;
    fake.state.answer = (i) => {
      if (i === at("combos")) throw new Error("db down");
      if (i === at("printings")) return [];
      if (i === at("precons")) return [{ n: "not a number" }];
      return [{ n: 7 }];
    };
    const stats = await loadLandingStats();
    expect(stats).not.toHaveProperty("combos");
    expect(stats).not.toHaveProperty("printings");
    expect(stats).not.toHaveProperty("precons");
    expect(stats.commanders).toBe(7);
  });
});

describe("the landing stats cache", () => {
  it("keys on the catalog generation and the deployment", () => {
    expect(landingStatsKey("1000", "dpl_1")).toEqual(["public-landing-stats", "gen:1000", "dep:dpl_1"]);
    expect(landingStatsKey("1001", "dpl_1")).not.toEqual(landingStatsKey("1000", "dpl_1"));
  });

  it("serves a complete set from the store until the catalog moves, then reads again", async () => {
    fake.state.on = true;
    await readLandingStats();
    const after = fake.state.calls;
    await readLandingStats();
    expect(fake.state.calls).toBe(after);
    generation.mockResolvedValue("2000");
    await readLandingStats();
    expect(fake.state.calls).toBe(after * 2);
    expect(keys.at(-1)).toContain("gen:2000");
  });

  it("serves a set with a failed count but never stores it", async () => {
    fake.state.on = true;
    fake.state.answer = (i) => {
      if (i === at("combos")) throw new Error("db down");
      return [{ n: 7 }];
    };
    const stats = await readLandingStats();
    expect(stats).not.toHaveProperty("combos");
    expect(stats.cards).toBe(7);
    expect(store.size).toBe(0);
  });
});
