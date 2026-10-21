import { describe, expect, it } from "vitest";

import { bracketReach, type ReachFacts } from "./bracket-reach";
import type { ComboEdge } from "./fill-gate";
import type { Bracket } from "./rank";

type Flags = Partial<{ gameChanger: boolean; massLandDenial: boolean; extraTurn: boolean }>;

/** A world of cards: flags, combo edges (stored both ways, as `loadComboEdges` stores them), which
 *  are free, prices, and which searcher reaches which piece. */
function world(w: {
  flags?: Record<string, Flags>;
  combos?: { a: string; b: string; loop?: boolean; bMustCommand?: boolean }[];
  free?: string[];
  prices?: Record<string, number>;
  reaches?: Record<string, string[]>;
}): ReachFacts {
  const edges = new Map<string, ComboEdge[]>();
  for (const [i, c] of (w.combos ?? []).entries()) {
    const id = `v${i}`;
    edges.set(c.a, [...(edges.get(c.a) ?? []), { variantId: id, partner: c.b, loop: !!c.loop, partnerMustBeCommander: !!c.bMustCommand }]);
    if (!c.bMustCommand) edges.set(c.b, [...(edges.get(c.b) ?? []), { variantId: id, partner: c.a, loop: !!c.loop, partnerMustBeCommander: false }]);
  }
  const free = new Set(w.free ?? []);
  return {
    flagsOf: (id) => ({ gameChanger: false, massLandDenial: false, extraTurn: false, ...w.flags?.[id] }),
    combosOf: (id) => edges.get(id) ?? [],
    searches: (id) => id in (w.reaches ?? {}),
    reaches: (s, p) => (w.reaches?.[s] ?? []).includes(p),
    free: (id) => free.has(id),
    priceOf: (id) => w.prices?.[id] ?? null,
  };
}

const reach = (target: Bracket, cards: string[], facts: ReachFacts, extra: { budgetCents?: number | null; ownedOnly?: boolean; fixedIds?: string[] } = {}) =>
  bracketReach({
    target, commanderIds: ["cmd"], fixedIds: extra.fixedIds ?? ["cmd"], cards, facts,
    budgetCents: extra.budgetCents ?? null, ownedOnly: extra.ownedOnly ?? false,
  });

describe("bracketReach", () => {
  it("needs nothing at 1 and 2: an empty 99 permits both", () => {
    expect(reach(1, [], world({}))).toEqual({ target: 1, kind: "fixed" });
    expect(reach(2, [], world({}))).toEqual({ target: 2, kind: "fixed" });
  });

  it("says when the fixed cards already sit above the target", () => {
    expect(reach(2, [], world({ flags: { cmd: { gameChanger: true } } }))).toEqual({ target: 2, kind: "above", permits: [3] });
  });

  it("reaches 3 with one free Game Changer, the first in the fill's order (HD - Horrors Test)", () => {
    const f = world({ flags: { agent: { gameChanger: true }, tutor: { gameChanger: true } }, free: ["agent", "tutor", "x"] });
    expect(reach(3, ["x", "tutor", "agent"], f)).toEqual({ target: 3, kind: "collection", raisers: ["tutor"] });
  });

  it("reaches 3 with a free counted combo, and with a combo piece in the command zone", () => {
    const f = world({ combos: [{ a: "drake", b: "navigator" }], free: ["drake", "navigator"] });
    expect(reach(3, ["drake", "navigator"], f)).toEqual({ target: 3, kind: "collection", raisers: ["drake", "navigator"] });
    const withCommander = world({ combos: [{ a: "piece", b: "cmd", bMustCommand: true }], free: ["piece"] });
    expect(reach(3, ["piece"], withCommander)).toEqual({ target: 3, kind: "collection", raisers: ["piece"] });
  });

  it("prefers one Game Changer over a two-card combo", () => {
    const f = world({ flags: { g: { gameChanger: true } }, combos: [{ a: "a", b: "b" }], free: ["a", "b", "g"] });
    expect(reach(3, ["a", "b", "g"], f)).toMatchObject({ kind: "collection", raisers: ["g"] });
  });

  it("never overshoots 3: a loop combo, or a combo the commander's tutor assembles, is a 4", () => {
    const loop = world({ combos: [{ a: "a", b: "b", loop: true }], free: ["a", "b"] });
    expect(reach(3, ["a", "b"], loop)).toMatchObject({ kind: "short", collectionPermits: [1, 2] });
    const assembled = world({ combos: [{ a: "a", b: "b" }], free: ["a", "b"], reaches: { cmd: ["a", "b"] } });
    expect(reach(3, ["a", "b"], assembled)).toMatchObject({ kind: "short" });
  });

  it("is short when the free copies are not there, and prices the cheapest way to buy it", () => {
    const f = world({
      flags: { rhystic: { gameChanger: true }, tomb: { gameChanger: true } },
      free: ["x"], prices: { rhystic: 3200, tomb: 1800 },
    });
    expect(reach(3, ["rhystic", "tomb", "x"], f, { budgetCents: 1500 })).toEqual({
      target: 3, kind: "short", collectionPermits: [1, 2], collectionRaisers: [],
      buy: { raisers: ["tomb"], buyCents: 1800, overBudget: true },
    });
  });

  it("buys the one missing piece of a combo the player half owns before a whole Game Changer costing more", () => {
    const f = world({
      flags: { g: { gameChanger: true } }, combos: [{ a: "owned", b: "missing" }],
      free: ["owned"], prices: { g: 900, missing: 400 },
    });
    expect(reach(3, ["g", "owned", "missing"], f)).toMatchObject({ kind: "short", buy: { raisers: ["owned", "missing"], buyCents: 400 } });
  });

  it("offers no buying under own-only, and none when nothing is stocked", () => {
    const f = world({ flags: { g: { gameChanger: true } } });
    expect(reach(3, ["g"], f)).toMatchObject({ kind: "short", buy: null });
    expect(reach(3, ["g"], world({ flags: { g: { gameChanger: true } }, prices: { g: 100 } }), { ownedOnly: true }))
      .toMatchObject({ kind: "short", buy: null });
  });

  it("reaches 4 with four Game Changers, counting one already fixed", () => {
    const gc = { gameChanger: true };
    const f = world({ flags: { cmd: gc, g1: gc, g2: gc, g3: gc, g4: gc }, free: ["g1", "g2", "g3", "g4"] });
    expect(reach(4, ["g1", "g2", "g3", "g4"], f)).toEqual({ target: 4, kind: "collection", raisers: ["g1", "g2", "g3"] });
  });

  it("never seeds mass land denial or a turn loop to reach 4 or 5", () => {
    expect(reach(4, ["armageddon"], world({ flags: { armageddon: { massLandDenial: true } }, free: ["armageddon"] })))
      .toMatchObject({ kind: "short", buy: null });
    expect(reach(5, ["a", "b"], world({ combos: [{ a: "a", b: "b", loop: true }], free: ["a", "b"] })))
      .toMatchObject({ kind: "short" });
  });

  it("reaches 5 with four Game Changers, and not with an assembled combo, which permits [4]", () => {
    const gc = { gameChanger: true };
    const f = world({ flags: { g1: gc, g2: gc, g3: gc, g4: gc }, free: ["g1", "g2", "g3", "g4"] });
    expect(reach(5, ["g1", "g2", "g3", "g4"], f)).toMatchObject({ kind: "collection", raisers: ["g1", "g2", "g3", "g4"] });
    const combo = world({ combos: [{ a: "a", b: "b" }], free: ["a", "b", "t"], reaches: { t: ["a", "b"] } });
    expect(reach(5, ["a", "b", "t"], combo)).toMatchObject({ kind: "short" });
  });

  it("reaches 4 with a combo and the tutors that find both pieces", () => {
    const f = world({ combos: [{ a: "a", b: "b" }], free: ["a", "b", "t1", "t2"], reaches: { t1: ["a"], t2: ["b"] } });
    expect(reach(4, ["a", "b", "t1", "t2"], f)).toMatchObject({ kind: "collection", raisers: ["a", "b", "t1", "t2"] });
  });

  it("lands a target-4 collection at 3 when it holds a Game Changer and nothing more", () => {
    const f = world({ flags: { g: { gameChanger: true } }, free: ["g"] });
    expect(reach(4, ["g"], f)).toEqual({
      target: 4, kind: "short", collectionPermits: [3], collectionRaisers: ["g"], buy: null,
    });
  });

  it("never chooses a set the remaining slots cannot hold", () => {
    const f = world({ combos: [{ a: "a", b: "b" }], free: ["a", "b"] });
    expect(bracketReach({ target: 3, commanderIds: ["cmd"], fixedIds: ["cmd"], cards: ["a", "b"], facts: f, budgetCents: null, ownedOnly: false, capacity: 1 }))
      .toMatchObject({ kind: "short" });
    expect(bracketReach({ target: 3, commanderIds: ["cmd"], fixedIds: ["cmd"], cards: ["a", "b"], facts: f, budgetCents: null, ownedOnly: false, capacity: 2 }))
      .toMatchObject({ kind: "collection", raisers: ["a", "b"] });
  });

  it("refuses a pair that also shares a turn-loop variant, and a Game Changer that denies lands", () => {
    const loopToo = world({ combos: [{ a: "a", b: "b" }, { a: "a", b: "b", loop: true }], free: ["a", "b", "t"], reaches: { t: ["a", "b"] } });
    expect(reach(4, ["a", "b", "t"], loopToo)).toMatchObject({ kind: "short" });
    const gc = { gameChanger: true };
    const mld = world({ flags: { g1: gc, g2: gc, g3: gc, g4: { gameChanger: true, massLandDenial: true }, g5: gc }, free: ["g1", "g2", "g3", "g4", "g5"] });
    expect(reach(4, ["g1", "g2", "g3", "g4", "g5"], mld)).toEqual({ target: 4, kind: "collection", raisers: ["g1", "g2", "g3", "g5"] });
  });

  it("counts a loop whose partner must be the commander only when it is", () => {
    const f = world({ flags: { g: { gameChanger: true } }, combos: [{ a: "g", b: "card", loop: true, bMustCommand: true }], free: ["g"] });
    expect(reach(3, ["g"], f, { fixedIds: ["cmd", "card"] })).toEqual({ target: 3, kind: "collection", raisers: ["g"] });
  });

  it("finds the tutor for a combo the fixed cards already hold, and counts a commander that tutors", () => {
    const fixedCombo = world({ combos: [{ a: "card", b: "cmd" }], free: ["t"], reaches: { t: ["card"] } });
    expect(reach(4, ["t"], fixedCombo, { fixedIds: ["cmd", "card"] })).toEqual({ target: 4, kind: "collection", raisers: ["t"] });
    const tutoringCommander = world({ combos: [{ a: "a", b: "b" }], free: ["a", "b"], reaches: { cmd: ["a", "b"] } });
    expect(reach(4, ["a", "b"], tutoringCommander)).toEqual({ target: 4, kind: "collection", raisers: ["a", "b"] });
  });

  it("buys the cheapest cover, not the first one found", () => {
    const f = world({ combos: [{ a: "a", b: "b" }], free: ["a", "b"], prices: { dear: 1000, cheap: 100 }, reaches: { dear: ["a", "b"], cheap: ["a", "b"] } });
    expect(reach(4, ["a", "b", "dear", "cheap"], f, { budgetCents: 500 }))
      .toMatchObject({ kind: "short", buy: { raisers: ["a", "b", "cheap"], buyCents: 100, overBudget: false } });
  });

  it("never places a fixed card again", () => {
    const f = world({ flags: { card: { gameChanger: true } }, free: ["card"] });
    expect(reach(3, ["card"], f, { fixedIds: ["cmd", "card"] })).toEqual({ target: 3, kind: "fixed" });
  });
});
