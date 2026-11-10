import { describe, expect, it } from "vitest";

import { ceilingFor, holdBracket, holdOffenders, isBracketTarget } from "./hold";
import type { UpgradePair } from "./validate";

const ref = (oracleId: string) => ({ oracleId, name: oracleId });
const pair = (addId: string, position = 0): UpgradePair => ({ cutId: `c-${addId}`, cut: `c-${addId}`, addId, add: addId, addCents: 100, reason: "r", position });
const brackets = (o: { gc?: string[]; mld?: string[]; combos?: { cards: string[]; produces?: string[] }[] }) => ({
  gameChangers: (o.gc ?? []).map(ref),
  massLandDenial: (o.mld ?? []).map((id) => ({ ...ref(id), sources: [] })),
  twoCardCombos: (o.combos ?? []).map((c, i) => ({ variantId: `v${i}`, cards: c.cards.map(ref), produces: c.produces ?? [], bracketTag: "", usesCommander: false }) as never),
});

describe("the ceiling", () => {
  it("is the pick, or the box's own bracket when it already plays higher", () => {
    expect(ceilingFor(2, null)).toBe(2);
    expect(ceilingFor(2, 3)).toBe(3);
    expect(ceilingFor(3, 2)).toBe(3);
    expect(ceilingFor(4, 3)).toBe(4);
  });
  it("offers only 2, 3 and 4", () => {
    expect([1, 2, 3, 4, 5, "3", null].map(isBracketTarget)).toEqual([false, true, true, true, false, false, false]);
  });
});

describe("holdOffenders", () => {
  const adds = [pair("g1", 0), pair("g2", 1), pair("g3", 2), pair("g4", 3), pair("n", 4)];
  it("bracket 4 holds nothing", () => {
    expect([...holdOffenders(brackets({ gc: ["g1", "g2", "g3", "g4"], mld: ["n"] }), 4, adds)]).toEqual([]);
  });
  it("bracket 3 allows three game changers counting the box's own, dropping the last added", () => {
    expect([...holdOffenders(brackets({ gc: ["g1", "g2", "g3", "g4", "box"] }), 3, adds)]).toEqual(["g3", "g4"]);
    expect([...holdOffenders(brackets({ gc: ["g1", "g2", "g3", "g4"] }), 3, adds)]).toEqual(["g4"]);
  });
  it("below 3 no added game changer holds", () => {
    expect([...holdOffenders(brackets({ gc: ["g1", "g2"] }), 2, adds)].sort()).toEqual(["g1", "g2"]);
  });
  it("mass land denial among the adds always goes", () => {
    expect([...holdOffenders(brackets({ mld: ["n"] }), 3, adds)]).toEqual(["n"]);
  });
  it("a two-card combo goes below 3, and only an infinite-turn loop goes at 3", () => {
    const combo = brackets({ combos: [{ cards: ["g1", "box"] }] });
    expect([...holdOffenders(combo, 2, adds)]).toEqual(["g1"]);
    expect([...holdOffenders(combo, 3, adds)]).toEqual([]);
  });
  it("never blames a violation the box brought", () => {
    expect([...holdOffenders(brackets({ gc: ["box1", "box2"], combos: [{ cards: ["box1", "box2"] }] }), 2, adds)]).toEqual([]);
  });
});

describe("holdBracket", () => {
  it("rereads after a drop and stops when the list holds", async () => {
    const pairs = [pair("g1", 0), pair("g2", 1), pair("n", 2)];
    let reads = 0;
    const out = await holdBracket(pairs, 2, async (applied) => { reads++; return brackets({ gc: applied.map((p) => p.addId).filter((id) => id.startsWith("g")) }); });
    expect(out.kept.map((p) => p.addId)).toEqual(["n"]);
    expect(out.drops).toEqual([{ position: 0, rule: "bracket", name: "g1" }, { position: 1, rule: "bracket", name: "g2" }]);
    expect(reads).toBe(2);
  });
  it("keeps every pair when the read fails, and reads nothing at 4", async () => {
    const pairs = [pair("g1")];
    expect((await holdBracket(pairs, 3, async () => null)).kept).toEqual(pairs);
    let reads = 0;
    await holdBracket(pairs, 4, async () => { reads++; return null; });
    expect(reads).toBe(0);
  });
});
