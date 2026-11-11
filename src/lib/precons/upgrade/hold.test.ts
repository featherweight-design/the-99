import { describe, expect, it } from "vitest";

import { holdBracket, holdOffenders, isBracketTarget, playsAt, shortfall, type BracketRead } from "./hold";
import type { UpgradePair } from "./validate";

const ref = (oracleId: string) => ({ oracleId, name: oracleId });
const pair = (addId: string, position = 0): UpgradePair => ({ cutId: `c-${addId}`, cut: `c-${addId}`, addId, add: addId, addCents: 100, reason: "r", position });
const brackets = (o: { gc?: string[]; mld?: string[]; combos?: { cards: string[]; produces?: string[] }[] }) => ({
  gameChangers: (o.gc ?? []).map(ref),
  massLandDenial: (o.mld ?? []).map((id) => ({ ...ref(id), sources: [] })),
  twoCardCombos: (o.combos ?? []).map((c, i) => ({ variantId: `v${i}`, cards: c.cards.map(ref), produces: c.produces ?? [], bracketTag: "", usesCommander: false }) as never),
});

describe("the bracket a deck plays at", () => {
  it("is the highest bracket it permits, kept to 2 through 4", () => {
    expect([[1, 2], [2], [3], [4], [4, 5], []].map((p) => playsAt(p))).toEqual([2, 2, 3, 4, 4, null]);
  });
  it("offers only 2, 3 and 4", () => {
    expect([1, 2, 3, 4, 5, "3", null].map(isBracketTarget)).toEqual([false, true, true, true, false, false, false]);
  });
});

const read = (plays: BracketRead["plays"], gc: string[] = []): BracketRead => ({ ...brackets({ gc }), plays });
describe("shortfall", () => {
  it("is null when the deck plays at the pick", () => {
    expect(shortfall(3, read(3, ["g1"]))).toBeNull();
    expect(shortfall(2, read(2))).toBeNull();
    expect(shortfall(4, read(4, ["a", "b", "c", "d"]))).toBeNull();
  });
  it("asks for one more game changer at 3, and for the four 4 needs, counting what the deck holds", () => {
    expect(shortfall(3, read(2))?.note).toContain("Add 1 more from the pool entries marked GAME CHANGER");
    expect(shortfall(4, read(3, ["a", "b"]))?.note).toContain("needs at least 4 game changers in the whole deck (it has 2). Add 2 more");
  });
  it("treats an unread bracket, and a deck that passes the pick, as short", () => {
    expect(shortfall(3, null)?.note).toContain("could not be read");
    expect(shortfall(2, read(3, ["g"]))?.note).toContain("above the bracket 2 the player chose");
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
    const out = await holdBracket(pairs, 2, async (applied) => { reads++; return { ...brackets({ gc: applied.map((p) => p.addId).filter((id) => id.startsWith("g")) }), plays: 2 as const }; });
    expect(out.kept.map((p) => p.addId)).toEqual(["n"]);
    expect(out.drops).toEqual([{ position: 0, rule: "bracket", name: "g1" }, { position: 1, rule: "bracket", name: "g2" }]);
    expect(reads).toBe(2);
  });
  it("keeps no pair when the read fails (a bracket it could not check is not promised), and reads nothing at 4", async () => {
    const pairs = [pair("g1")];
    const failed = await holdBracket(pairs, 3, async () => null);
    expect(failed.kept).toEqual([]);
    expect(failed.drops).toEqual([{ position: 0, rule: "bracket", name: "g1" }]);
    let reads = 0;
    await holdBracket(pairs, 4, async () => { reads++; return null; });
    expect(reads).toBe(0);
  });
});
