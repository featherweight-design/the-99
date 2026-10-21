import { describe, expect, it } from "vitest";
import { fromMineBracket, handOffReachOf } from "./hand-off-reach";

const chip = (oracleId: string) => ({ oracleId, name: oracleId, imageUri: null, owned: false, held: null, price: { kind: "priced", cents: 100 } as const });
const base = {
  target: 3 as const, placedRaisers: [] as string[], budgetCents: 5000, budgetLeftCents: 5000,
  chipOf: chip, isGameChanger: (id: string) => id === "gc",
};
const short = (buyCents: number) => ({
  target: 3 as const, kind: "short" as const, collectionPermits: [1, 2] as (1 | 2)[], collectionRaisers: [],
  buy: { raisers: ["rhystic"], buyCents, overBudget: false },
});

describe("handOffReachOf", () => {
  it("draws today's line under 3, with no reach, or with the fixed cards inside or above the target", () => {
    expect(handOffReachOf({ ...base, target: 2, permits: [1, 2], reach: { target: 2, kind: "fixed" } })).toBeNull();
    expect(handOffReachOf({ ...base, permits: [3], reach: null })).toBeNull();
    expect(handOffReachOf({ ...base, permits: [3], reach: { target: 3, kind: "fixed" } })).toBeNull();
    expect(handOffReachOf({ ...base, permits: [4], reach: { target: 3, kind: "above", permits: [4] } })).toBeNull();
  });

  it("reached: names the placed cards, a Game Changer marked; reached with none placed is today's line", () => {
    expect(handOffReachOf({ ...base, permits: [3], placedRaisers: ["gc"], reach: { target: 3, kind: "collection", raisers: ["gc"] } }))
      .toEqual({ target: 3, permits: [3], placed: [{ ...chip("gc"), gameChanger: true }], buy: null });
    expect(handOffReachOf({ ...base, permits: [3], reach: short(3200) })).toBeNull();
  });

  it("short: the buy within the budget LEFT, so the build-around card's cost counts (audit item 10)", () => {
    const within = handOffReachOf({ ...base, permits: [1, 2], reach: short(3200) })!;
    expect(within.buy).toEqual({ cards: [chip("rhystic")], cents: 3200, overBudget: false, overCents: 0, raisedBudgetCents: null, budgetLeftCents: 5000, selectedBuys: [] });
    // $50 budget, a $25 card placed first: $25 left, so a $32 set is $7 over and raises to $57.
    const over = handOffReachOf({ ...base, budgetLeftCents: 2500, permits: [1, 2], reach: short(3200) })!;
    expect(over.buy).toMatchObject({ overBudget: true, overCents: 700, raisedBudgetCents: 5700 });
    // Cents round up to whole dollars, as the deck stores its budget.
    expect(handOffReachOf({ ...base, budgetLeftCents: 2500, permits: [1, 2], reach: short(3250) })!.buy!.raisedBudgetCents).toBe(5800);
    expect(fromMineBracket(within)).toBe(2);
  });

  it("names only the cards to buy: a free owned piece of the set is placed, never offered as a buy", () => {
    const combo = { ...short(3200), buy: { raisers: ["owned-piece", "rhystic"], buyCents: 3200, overBudget: false } };
    const chipOf = (id: string) => (id === "owned-piece" ? { ...chip(id), owned: true } : chip(id));
    expect(handOffReachOf({ ...base, chipOf, permits: [1, 2], reach: combo })!.buy!.cards.map((c) => c.oracleId)).toEqual(["rhystic"]);
    // Owned, every copy held: bought, so named.
    const heldOf = (id: string) => ({ ...chip(id), owned: true, held: { deck: "Other" } });
    expect(handOffReachOf({ ...base, chipOf: heldOf, permits: [1, 2], reach: combo })!.buy!.cards).toHaveLength(2);
  });

  it("carries the picks the create buys, leaving out owned ones (round 5)", () => {
    const chipOf = (id: string) => (id === "owned-pick" ? { ...chip(id), owned: true } : chip(id));
    const r = handOffReachOf({ ...base, chipOf, permits: [1, 2], reach: short(3200), selectedIds: ["bought-pick", "owned-pick"] })!;
    expect(r.buy!.selectedBuys.map((c) => c.oracleId)).toEqual(["bought-pick"]);
  });

  it("short with nothing to buy, or a set it cannot name, is a statement", () => {
    expect(handOffReachOf({ ...base, permits: [1, 2], reach: { ...short(0), buy: null } })!.buy).toBeNull();
    expect(handOffReachOf({ ...base, chipOf: () => null, permits: [1, 2], reach: short(3200) })!.buy).toBeNull();
  });
});
