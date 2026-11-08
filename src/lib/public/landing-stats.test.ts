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
// The featured list has its own tests (`precon-overview.test.ts`); here it is only the count's source.
const list = vi.hoisted(() => ({ load: vi.fn(), read: vi.fn() }));
vi.mock("./precon-overview", () => ({ loadPreconsWithOverview: list.load, readPreconsWithOverview: list.read }));

import {
  LANDING_STAT_QUERIES, completeStats, landingStatKey, loadLandingStats, proseShownWhere, readLandingStats, statValue, type LandingCountKey,
} from "./landing-stats";
import { commanderSupport } from "../../db/schema";
import { db } from "../../db";

const KEYS = Object.keys(LANDING_STAT_QUERIES) as LandingCountKey[];
const at = (key: LandingCountKey) => KEYS.indexOf(key);
const rendered = (key: LandingCountKey) => (LANDING_STAT_QUERIES[key]() as unknown as { toSQL(): { sql: string; params: unknown[] } }).toSQL();
const TWO = [{ fileName: "A", name: "A" }, { fileName: "B", name: "B" }];

beforeEach(() => {
  fake.state.on = false;
  fake.state.calls = 0;
  fake.state.answer = () => [{ n: 7 }];
  keys.length = 0;
  store.clear();
  generation.mockResolvedValue("1000");
  list.load.mockReset().mockResolvedValue(TWO);
  list.read.mockReset().mockResolvedValue(TWO);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("the landing's counts", () => {
  it("counts every figure the plan names but the Overviews, which are the featured list's length", () => {
    expect([...KEYS].sort()).toEqual(["cards", "combos", "commanders", "commandersWithProse", "plainPrecons", "precons", "printings"]);
  });

  it("counts whole catalog tables with count(*)", () => {
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

  it("leaves a suppressed commander out of the prose count, as the commander page drops its sentence", () => {
    const q = db.select().from(commanderSupport).where(proseShownWhere(new Set(["0b3f2c9e-6a41-4d8e-9c53-1f0a7e2d4b68"]))).toSQL();
    expect(q.sql).toMatch(/"commander_support"\."commander_oracle_id" not in \(\$2\)/);
    expect(q.params).toEqual(["ok", "0b3f2c9e-6a41-4d8e-9c53-1f0a7e2d4b68"]);
  });

  it("counts plain precons as the ones that are no one's twin", () => {
    expect(rendered("plainPrecons").sql).toMatch(/from "precons" where "precons"\."twin_of" is null/);
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
  it("answers every figure, the Overview count as the featured list's length", async () => {
    fake.state.on = true;
    const stats = await loadLandingStats();
    expect(completeStats(stats)).toBe(true);
    expect(stats.cards).toBe(7);
    expect(stats.preconOverviews).toBe(2);
  });

  it("leaves out a count that fails, or comes back unusable, and never shows it as zero", async () => {
    fake.state.on = true;
    fake.state.answer = (i) => {
      if (i === at("combos")) throw new Error("db down");
      if (i === at("printings")) return [];
      if (i === at("precons")) return [{ n: "not a number" }];
      return [{ n: 7 }];
    };
    list.load.mockRejectedValue(new Error("db down"));
    const stats = await loadLandingStats();
    for (const k of ["combos", "printings", "precons", "preconOverviews"]) expect(stats).not.toHaveProperty(k);
    expect(stats.commanders).toBe(7);
    expect(completeStats(stats)).toBe(false);
  });
});

describe("the landing stats cache", () => {
  it("keys each count on its figure, the catalog generation and the deployment", () => {
    expect(landingStatKey("cards", "1000", "dpl_1")).toEqual(["public-landing-stat", "stat:cards", "gen:1000", "dep:dpl_1"]);
    expect(landingStatKey("cards", "1001", "dpl_1")).not.toEqual(landingStatKey("cards", "1000", "dpl_1"));
  });

  it("serves the counts from the store until the catalog moves, then reads again", async () => {
    fake.state.on = true;
    await readLandingStats();
    expect(fake.state.calls).toBe(KEYS.length);
    await readLandingStats();
    expect(fake.state.calls).toBe(KEYS.length);
    generation.mockResolvedValue("2000");
    expect((await readLandingStats()).preconOverviews).toBe(2);
    expect(fake.state.calls).toBe(KEYS.length * 2);
    expect(keys.at(-1)).toContain("gen:2000");
  });

  it("keeps the healthy counts stored when one fails, and retries only the failed one", async () => {
    fake.state.on = true;
    fake.state.answer = (i) => {
      if (i === at("combos")) throw new Error("db down");
      return [{ n: 7 }];
    };
    const stats = await readLandingStats();
    expect(stats).not.toHaveProperty("combos");
    expect(stats.cards).toBe(7);
    expect(store.size).toBe(KEYS.length - 1);
    await readLandingStats();
    expect(fake.state.calls).toBe(KEYS.length + 1);
  });

  it("leaves out a figure whose read throws through the cache, and reads nothing again", async () => {
    list.read.mockRejectedValue(new Error("no incremental cache"));
    fake.state.on = true;
    const stats = await readLandingStats();
    expect(stats).not.toHaveProperty("preconOverviews");
    expect(list.load).not.toHaveBeenCalled();
    expect(stats.cards).toBe(7);
  });
});
