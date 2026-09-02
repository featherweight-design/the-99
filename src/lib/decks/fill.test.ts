import { describe, expect, it } from "vitest";
import { planFill, type FillCandidate } from "./fill";

const c = (over: Partial<FillCandidate> & { oracleId: string }): FillCandidate => ({
  name: over.oracleId, typeLine: "Artifact", oracleText: "{T}: Add {C}.",
  keywords: [], owned: true, ownedQuantity: 1, inclusionPct: null, ...over,
});

const ramp = (id: string, pct: number | null, owned = true) =>
  c({ oracleId: id, name: id, inclusionPct: pct, owned, ownedQuantity: owned ? 1 : 0 });

const basic = (id: string, qty: number) =>
  c({ oracleId: id, name: id, typeLine: "Basic Land — Forest", oracleText: "{T}: Add {G}.", ownedQuantity: qty });

const nonBasicLand = (id: string) =>
  c({ oracleId: id, name: id, typeLine: "Land", oracleText: "{T}: Add {G}." });

describe("planFill", () => {
  it("stops a role at its target", () => {
    const plan = planFill(Array.from({ length: 14 }, (_, i) => ramp(`r${i}`, 100 - i)));
    expect(plan.rows.filter((r) => r.role === "ramp")).toHaveLength(10);
  });

  it("takes the highest inclusion first and absent figures last", () => {
    const plan = planFill([ramp("low", 10), ramp("none", null), ramp("high", 90)]);
    expect(plan.rows.map((r) => r.oracleId)).toEqual(["high", "low", "none"]);
  });

  it("prefers an owned card to an unowned one whatever the figures say", () => {
    const plan = planFill([ramp("bought", 99, false), ramp("mine", 3)]);
    expect(plan.rows.map((r) => r.oracleId)).toEqual(["mine", "bought"]);
    expect(plan.bought).toBe(1);
  });

  it("reaches past the collection only where the role is short", () => {
    const owned = Array.from({ length: 10 }, (_, i) => ramp(`r${i}`, 50));
    const plan = planFill([...owned, ramp("bought", 99, false)]);
    expect(plan.rows.some((r) => r.oracleId === "bought")).toBe(false);
    expect(plan.bought).toBe(0);
  });

  it("spends a card on the first role it can close", () => {
    const dual = c({
      oracleId: "dual", name: "dual", typeLine: "Instant",
      oracleText: "Draw a card. Destroy target creature.",
    });
    const plan = planFill([dual]);
    expect(plan.rows).toEqual([{ oracleId: "dual", quantity: 1, role: "draw" }]);
  });

  it("stacks basics up to the copies owned", () => {
    const plan = planFill([basic("forest", 12)]);
    expect(plan.rows).toEqual([{ oracleId: "forest", quantity: 12, role: "land" }]);
    expect(plan.filled).toBe(12);
  });

  it("never stacks past the land target", () => {
    const plan = planFill([basic("forest", 60)]);
    expect(plan.rows[0].quantity).toBe(37);
    expect(plan.filled).toBe(37);
  });

  it("gives a non-basic land a single copy however many are owned", () => {
    const plan = planFill([c({ ...nonBasicLand("command-tower"), ownedQuantity: 4 })]);
    expect(plan.rows[0].quantity).toBe(1);
  });

  it("never buys a land", () => {
    const plan = planFill([c({ ...nonBasicLand("horizon"), owned: false, ownedQuantity: 0 })]);
    expect(plan.rows).toHaveLength(0);
    expect(plan.bought).toBe(0);
  });

  it("names every role it came up short on, in role order", () => {
    const plan = planFill([ramp("r0", 5), basic("forest", 37)]);
    expect(plan.shortfalls).toEqual(["ramp", "draw", "removal", "wipes"]);
  });

  it("reports no shortfall and 68 cards on a complete fill", () => {
    const full: FillCandidate[] = [
      ...Array.from({ length: 10 }, (_, i) => ramp(`ramp${i}`, 50)),
      ...Array.from({ length: 10 }, (_, i) =>
        c({ oracleId: `draw${i}`, name: `draw${i}`, typeLine: "Sorcery", oracleText: "Draw a card." })),
      ...Array.from({ length: 8 }, (_, i) =>
        c({ oracleId: `rem${i}`, name: `rem${i}`, typeLine: "Instant", oracleText: "Destroy target creature." })),
      ...Array.from({ length: 3 }, (_, i) =>
        c({ oracleId: `wipe${i}`, name: `wipe${i}`, typeLine: "Sorcery", oracleText: "Destroy all creatures." })),
      basic("forest", 37),
    ];
    const plan = planFill(full);
    expect(plan.filled).toBe(68);
    expect(plan.shortfalls).toEqual([]);
  });

  it("never spends one card twice", () => {
    const plan = planFill([ramp("r", 50), ramp("r", 50)]);
    expect(plan.rows).toHaveLength(1);
  });
});
