import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

import type { PairRow } from "../../combos/near-miss";
import type { UpgradePair } from "./validate";

const exec = vi.hoisted(() => ({ rows: [] as PairRow[], calls: [] as SQL[] }));
vi.mock("../../../db", () => ({ db: { execute: vi.fn(async (q: SQL) => { exec.calls.push(q); return { rows: exec.rows }; }) } }));

const { partnersFromRows, readSwapPartners } = await import("./swap-partners");

// Stays: s1, s2. Cuts: c1 (for a1), c2 (for a2), c3 (for a3). Adds: a1, a2, a3. Commander: cmd.
const list = {
  commanderIds: ["cmd"],
  cards: [
    { oracleId: "cmd", quantity: 1, isCommander: true },
    ...["s1", "s2", "c1", "c2", "c3"].map((oracleId) => ({ oracleId, quantity: 1, isCommander: false })),
  ],
};
const pair = (cutId: string, addId: string, position: number): UpgradePair => ({ cutId, cut: cutId.toUpperCase(), addId, add: addId.toUpperCase(), addCents: 100, reason: "r", position });
const pairs = [pair("c1", "a1", 1), pair("c2", "a2", 2), pair("c3", "a3", 3)];

/** A two-card variant as `inDeckPairsQuery` returns it: one row per piece. */
const variant = (id: string, x: string, y: string, popularity: number | null = 10): PairRow[] => [
  { variant_id: id, produces: ["Infinite damage"], popularity, present_id: x, missing_id: y, missing_name: y.toUpperCase(), missing_must_be_commander: false },
  { variant_id: id, produces: ["Infinite damage"], popularity, present_id: y, missing_id: x, missing_name: x.toUpperCase(), missing_must_be_commander: false },
];
const byAdd = (out: ReturnType<typeof partnersFromRows>, addId: string) => out.find((p) => p.addId === addId)!;

beforeEach(() => { exec.rows = []; exec.calls.length = 0; });

describe("partnersFromRows (the deck row's rule, after the swaps)", () => {
  it("marks two adds that combo with each other", () => {
    const out = partnersFromRows(variant("v1", "a1", "a2"), list, pairs);
    expect(byAdd(out, "a1").addCombo).toEqual({ oracleId: "a2", name: "A2" });
    expect(byAdd(out, "a2").addCombo).toEqual({ oracleId: "a1", name: "A1" });
    expect(byAdd(out, "a3").addCombo).toBeNull();
  });

  it("marks an add that combos with a card that stays, and with the commander", () => {
    const out = partnersFromRows([...variant("v1", "a1", "s1"), ...variant("v2", "a2", "cmd")], list, pairs);
    expect(byAdd(out, "a1").addCombo).toEqual({ oracleId: "s1", name: "S1" });
    expect(byAdd(out, "a2").addCombo).toEqual({ oracleId: "cmd", name: "CMD" });
  });

  it("does not mark two cuts that combo with each other", () => {
    const out = partnersFromRows(variant("v1", "c1", "c2"), list, pairs);
    expect(out.every((p) => p.cutCombo === null && p.addCombo === null)).toBe(true);
  });

  it("marks a cut whose partner stays: cutting it breaks the combo", () => {
    const out = partnersFromRows(variant("v1", "c1", "s1"), list, pairs);
    expect(byAdd(out, "a1").cutCombo).toEqual({ oracleId: "s1", name: "S1" });
    expect(byAdd(out, "a2").cutCombo).toBeNull();
  });

  it("names the partner that stays when a cut's most popular partner is cut too, and counts only the staying ones", () => {
    const rows = [...variant("v1", "c1", "c2", 900), ...variant("v2", "c1", "s2", 5)];
    const out = partnersFromRows(rows, list, pairs);
    expect(byAdd(out, "a1").cutCombo).toEqual({ oracleId: "s2", name: "S2" });
    expect(byAdd(out, "a2").cutCombo).toBeNull();
  });

  it("does not mark a cut whose only partner is one of this run's adds, nor the add whose only partner is that cut", () => {
    const out = partnersFromRows(variant("v1", "c1", "a2"), list, pairs);
    expect(byAdd(out, "a1").cutCombo).toBeNull();
    expect(byAdd(out, "a2").addCombo).toBeNull();
  });

  it("marks that add once another partner stays, and still leaves the cut unmarked", () => {
    const out = partnersFromRows([...variant("v1", "c1", "a2", 900), ...variant("v2", "a2", "s1", 5)], list, pairs);
    expect(byAdd(out, "a1").cutCombo).toBeNull();
    expect(byAdd(out, "a2").addCombo).toEqual({ oracleId: "s1", name: "S1" });
  });

  it("a cut takes one copy: a card held twice still stays, so its partners count it", () => {
    const twice = { ...list, cards: list.cards.map((c) => (c.oracleId === "c2" ? { ...c, quantity: 2 } : c)) };
    const out = partnersFromRows(variant("v1", "c1", "c2"), twice, pairs);
    expect(byAdd(out, "a1").cutCombo).toEqual({ oracleId: "c2", name: "C2" });
    expect(byAdd(out, "a2").cutCombo).toBeNull();
    // Held once, the same cut+cut pair marks nothing.
    expect(partnersFromRows(variant("v1", "c1", "c2"), list, pairs).every((p) => p.cutCombo === null)).toBe(true);
  });

  it("carries the other partners' count, as the deck row's hover does", () => {
    const rows = [...variant("v1", "a1", "s1", 50), ...variant("v2", "a1", "s2", 10), ...variant("v3", "a1", "a2", 1)];
    expect(byAdd(partnersFromRows(rows, list, pairs), "a1").addCombo).toEqual({ oracleId: "s1", name: "S1", otherPartners: 2 });
  });

  it("ignores rows about a card that is neither a cut nor an add", () => {
    const out = partnersFromRows(variant("v1", "s1", "s2"), list, pairs);
    expect(out.every((p) => p.cutCombo === null && p.addCombo === null)).toBe(true);
  });

  it("keeps every pair field as the model gave it", () => {
    const [first] = partnersFromRows([], list, pairs);
    expect(first).toEqual({ ...pairs[0], cutCombo: null, addCombo: null });
  });
});

describe("readSwapPartners", () => {
  it("reads over the after-list, the cuts and the commanders, with the commanders as the command zone", async () => {
    exec.rows = variant("v1", "a1", "s1");
    const out = await readSwapPartners(list, pairs);
    expect(byAdd(out, "a1").addCombo).toEqual({ oracleId: "s1", name: "S1" });
    const { params } = new PgDialect().sqlToQuery(exec.calls[0]);
    const arrays = params.filter(Array.isArray) as string[][];
    // `present` (the prune and the both-held check) then `commanders`, as `inDeckPairsQuery` binds them.
    expect(new Set(arrays[0])).toEqual(new Set(["s1", "s2", "a1", "a2", "a3", "c1", "c2", "c3", "cmd"]));
    expect(arrays.some((a) => a.length === 1 && a[0] === "cmd")).toBe(true);
  });

  it("filters before the fold through the shared deck-row read: a cut+cut variant names nothing", async () => {
    exec.rows = [...variant("v1", "c1", "c2", 900), ...variant("v2", "c1", "s2", 5)];
    const out = await readSwapPartners(list, pairs);
    expect(byAdd(out, "a1").cutCombo).toEqual({ oracleId: "s2", name: "S2" });
    expect(byAdd(out, "a2").cutCombo).toBeNull();
  });

  it("makes no read for a run with no pairs", async () => {
    expect(await readSwapPartners(list, [])).toEqual([]);
    expect(exec.calls).toHaveLength(0);
  });
});
