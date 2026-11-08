import { beforeEach, describe, expect, it, vi } from "vitest";

// A query stand-in: every builder method returns the chain, and awaiting it answers `fake.answer()`. The real db stays in
// place (so each query's SQL can be rendered) until a test turns `fake.on`. A load makes two reads: the candidate rows
// (call 0), then their lists (call 1).
const fake = vi.hoisted(() => {
  const state = { on: false, calls: 0, answer: (_i: number): unknown => [] };
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
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));

import {
  PUBLIC_OVERVIEW_BASIS, PUBLIC_OVERVIEW_CONTRACT, linesFingerprint, loadPreconsWithOverview, loadPublicPreconOverview, overviewCandidatesQuery,
  preconListsQuery, preconsWithOverviewKey, publicPreconOverviewKey, readPreconsWithOverview, readPublicPreconOverview,
} from "./precon-overview";
import { renderedPreconList } from "../precons/overview-read";

const FILE = "MirrorMastery_C19";
const CMDR = "0b3f2c9e-6a41-4d8e-9c53-1f0a7e2d4b68";
const LINES = [
  { fileName: FILE, oracleId: CMDR, quantity: 1, isCommander: true },
  { fileName: FILE, oracleId: "9a1b2c3d-0000-4000-8000-000000000001", quantity: 1, isCommander: false },
  { fileName: FILE, oracleId: "9a1b2c3d-0000-4000-8000-000000000002", quantity: 30, isCommander: false },
];
const LIST = linesFingerprint(LINES);
const CONTENT = { overview: "Copies your best spells.", verdicts: [] };
const ROW = { fileName: FILE, name: "Mirror Mastery", setCode: "C19", content: CONTENT, current: true, listFingerprint: LIST };
const SHOWN = { fileName: FILE, name: "Mirror Mastery", setCode: "C19", content: CONTENT };
/** Answers the candidate rows on the first read and the lists on the second. */
const answers = (rows: unknown[], lines: unknown[] = LINES) => (i: number) => (i % 2 === 0 ? rows : lines);

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

  it("reads candidates that are current, at that contract and basis, for a plain precon, by name then file", () => {
    const one = overviewCandidatesQuery(FILE).toSQL();
    expect(one.sql).toMatch(/from "precon_synopses" inner join "precons" on "precons"\."file_name" = "precon_synopses"\."precon_file"/);
    expect(one.sql).toMatch(/"precon_synopses"\."precon_file" = \$1 and "precon_synopses"\."current" = \$2 and "precon_synopses"\."contract_version" = \$3 and "precon_synopses"\."role_basis" = \$4 and "precons"\."twin_of" is null/);
    expect(one.sql).toMatch(/order by "precons"\."name" asc, "precons"\."file_name" asc$/);
    expect(one.params).toEqual([FILE, true, 13, "labels"]);
    const all = overviewCandidatesQuery(null).toSQL();
    expect(all.sql).not.toMatch(/"precon_file" = /);
    expect(all.params).toEqual([true, 13, "labels"]);
  });

  it("reads the lists in the feed's order", () => {
    const q = preconListsQuery([FILE]).toSQL();
    expect(q.sql).toMatch(/from "precon_cards" where "precon_cards"\."file_name" in \(\$1\) order by "precon_cards"\."file_name" asc, "precon_cards"\."position" asc$/);
  });

  it("fingerprints a list as the precon page does: its commanders in order, then its body", () => {
    expect(LIST).toBe(renderedPreconList({ row: { commanders: [{ oracleId: CMDR }] }, cards: LINES }));
  });
});

describe("loadPublicPreconOverview", () => {
  it("answers the Overview written for the list the precon holds now", async () => {
    fake.state.on = true;
    fake.state.answer = answers([ROW]);
    expect(await loadPublicPreconOverview(FILE)).toEqual(SHOWN);
  });

  it("shows nothing when the list moved since the Overview was written, though the row is current", async () => {
    fake.state.on = true;
    fake.state.answer = answers([ROW], LINES.slice(0, 2));
    expect(await loadPublicPreconOverview(FILE)).toBeNull();
  });

  it("shows nothing for no row, an empty Overview or a refused one, and reads no list", async () => {
    fake.state.on = true;
    for (const rows of [[], [{ ...ROW, content: { ...CONTENT, overview: "" } }], [{ ...ROW, content: { ...CONTENT, overview: null } }]]) {
      fake.state.calls = 0;
      fake.state.answer = answers(rows);
      expect(await loadPublicPreconOverview(FILE)).toBeNull();
      expect(fake.state.calls).toBe(1);
    }
  });

  it("lists only the precons whose Overview passes the same rule", async () => {
    fake.state.on = true;
    const stale = { ...ROW, fileName: "Stale_X", name: "Stale", listFingerprint: "old" };
    fake.state.answer = answers([ROW, stale]);
    expect(await loadPreconsWithOverview()).toEqual([{ fileName: FILE, name: "Mirror Mastery" }]);
  });
});

describe("the public precon Overview cache", () => {
  it("keys on the catalog generation, the deployment and the file", () => {
    expect(publicPreconOverviewKey("1000", FILE, "dpl_1")).toEqual(["public-precon-overview", "gen:1000", "dep:dpl_1", `file:${FILE}`]);
    expect(preconsWithOverviewKey("1000", "dpl_1")).toEqual(["public-precons-with-overview", "gen:1000", "dep:dpl_1"]);
  });

  it("serves a found Overview from the store until the catalog moves, then reads again", async () => {
    fake.state.on = true;
    fake.state.answer = answers([ROW]);
    await readPublicPreconOverview(FILE);
    await readPublicPreconOverview(FILE);
    expect(fake.state.calls).toBe(2);
    generation.mockResolvedValue("2000");
    expect(await readPublicPreconOverview(FILE)).toEqual(SHOWN);
    expect(fake.state.calls).toBe(4);
    expect(keys.at(-1)).toContain("gen:2000");
  });

  it("never stores a precon with no Overview", async () => {
    fake.state.on = true;
    expect(await readPublicPreconOverview("Nobody_X")).toBeNull();
    expect(store.size).toBe(0);
  });

  it("stores the list whatever it holds, an empty one included", async () => {
    fake.state.on = true;
    expect(await readPreconsWithOverview()).toEqual([]);
    await readPreconsWithOverview();
    expect(fake.state.calls).toBe(1);
    expect(store.size).toBe(1);
  });

  it("lets a failed read throw, and stores nothing", async () => {
    fake.state.on = true;
    fake.state.answer = () => { throw new Error("db down"); };
    await expect(readPublicPreconOverview(FILE)).rejects.toThrow("db down");
    expect(store.size).toBe(0);
  });
});
