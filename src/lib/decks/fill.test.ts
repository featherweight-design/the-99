import { describe, expect, it } from "vitest";

/** The asserted baseline, which is what every case here was written against. */
const FLAT = { hasPartner: false, skeleton: null } as const;
import { dedupeSelectionFromPool, planFill, type FillCandidate } from "./fill";

const c = (over: Partial<FillCandidate> & { oracleId: string }): FillCandidate => ({
  name: over.oracleId, typeLine: "Artifact", oracleText: "{T}: Add {C}.",
  keywords: [], manaCost: null, layout: "normal", owned: true, ownedQuantity: 1,
  inclusionPct: null, ...over,
});

const ramp = (id: string, pct: number | null, owned = true) =>
  c({ oracleId: id, name: id, inclusionPct: pct, owned, ownedQuantity: owned ? 1 : 0 });

const basic = (id: string, qty: number, name = "Forest") =>
  c({
    oracleId: id, name, typeLine: `Basic Land — ${name}`,
    oracleText: "{T}: Add {G}.", ownedQuantity: qty,
  });

const nonBasicLand = (id: string) =>
  c({ oracleId: id, name: id, typeLine: "Land", oracleText: "{T}: Add {G}." });

describe("planFill", () => {
  it("stops a role at its target", () => {
    const plan = planFill(Array.from({ length: 14 }, (_, i) => ramp(`r${i}`, 100 - i)), FLAT);
    expect(plan.rows.filter((r) => r.role === "ramp")).toHaveLength(10);
  });

  it("takes the highest inclusion first and absent figures last", () => {
    const plan = planFill([ramp("low", 10), ramp("none", null), ramp("high", 90)], FLAT);
    expect(plan.rows.map((r) => r.oracleId)).toEqual(["high", "low", "none"]);
  });

  it("prefers an owned card to an unowned one whatever the figures say", () => {
    const plan = planFill([ramp("bought", 99, false), ramp("mine", 3)], FLAT);
    expect(plan.rows.map((r) => r.oracleId)).toEqual(["mine", "bought"]);
    expect(plan.bought).toBe(1);
  });

  // The ROLE pass reaches past the collection only where a floor is short. The residual is a
  // different promise and may buy: a player whose collection cannot finish the deck is owed
  // the best cards for those slots and told what they cost, rather than handed a short deck.
  it("reaches past the collection only where the role is short", () => {
    const owned = Array.from({ length: 10 }, (_, i) => ramp(`r${i}`, 50));
    const plan = planFill([...owned, ramp("bought", 99, false)], { ...FLAT, slots: 10 });
    expect(plan.rows.some((r) => r.oracleId === "bought")).toBe(false);
    expect(plan.bought).toBe(0);
  });

  it("spends a card on the first role it can close", () => {
    const dual = c({
      oracleId: "dual", name: "dual", typeLine: "Instant",
      oracleText: "Draw a card. Destroy target creature.",
    });
    const plan = planFill([dual], FLAT);
    expect(plan.rows).toEqual([{ oracleId: "dual", quantity: 1, role: "draw" }]);
  });

  it("stacks basics up to the copies owned", () => {
    const plan = planFill([basic("forest", 12)], FLAT);
    expect(plan.rows).toEqual([{ oracleId: "forest", quantity: 12, role: "land" }]);
    expect(plan.filled).toBe(12);
  });

  it("never stacks past the land target", () => {
    const plan = planFill([basic("forest", 60)], FLAT);
    expect(plan.rows[0].quantity).toBe(37);
    expect(plan.filled).toBe(37);
  });

  it("gives a non-basic land a single copy however many are owned", () => {
    const plan = planFill([c({ ...nonBasicLand("command-tower"), ownedQuantity: 4 })], FLAT);
    expect(plan.rows[0].quantity).toBe(1);
  });

  it("never buys a land", () => {
    const plan = planFill([c({ ...nonBasicLand("horizon"), owned: false, ownedQuantity: 0 })], FLAT);
    expect(plan.rows).toHaveLength(0);
    expect(plan.bought).toBe(0);
  });

  it("never buys a land that also reads as removal", () => {
    // classifyRoles keeps lands out of `ramp` only, so a land whose text
    // matches a removal pattern is the one shape that could reach the
    // non-land pass and be bought there.
    const plan = planFill([
      c({
        oracleId: "blast-zone", name: "blast-zone", typeLine: "Land",
        oracleText: "Destroy all permanents. {T}: Add {C}.",
        owned: false, ownedQuantity: 0,
      }),
    ], FLAT);
    expect(plan.rows).toHaveLength(0);
    expect(plan.bought).toBe(0);
  });

  it("leaves an owned utility land for the mana base rather than a role slot", () => {
    const plan = planFill([
      c({
        oracleId: "mikokoro", name: "mikokoro", typeLine: "Land",
        oracleText: "{T}: Add {C}. {2}, {T}: Draw a card.",
      }),
    ], FLAT);
    expect(plan.rows).toEqual([{ oracleId: "mikokoro", quantity: 1, role: "land" }]);
  });

  it("gives utility lands the first land slots rather than one stacked basic", () => {
    const utility = Array.from({ length: 20 }, (_, i) => nonBasicLand(`u${i}`));
    const plan = planFill([...utility, basic("forest", 60)], FLAT);
    const lands = plan.rows.filter((r) => r.role === "land");
    expect(lands.filter((r) => r.oracleId.startsWith("u"))).toHaveLength(12);
    expect(lands.find((r) => r.oracleId === "forest")!.quantity).toBe(25);
    expect(lands.reduce((n, r) => n + r.quantity, 0)).toBe(37);
  });

  it("splits basics across colours in proportion to the pips the spells cost", () => {
    const plan = planFill([
      ...Array.from({ length: 3 }, (_, i) => c({ oracleId: `g${i}`, manaCost: "{G}{G}" })),
      c({ oracleId: "b0", manaCost: "{B}" }),
      basic("forest", 40, "Forest"),
      basic("swamp", 40, "Swamp"),
    ], FLAT);
    const quantityOf = (id: string) => plan.rows.find((r) => r.oracleId === id)!.quantity;
    expect(quantityOf("forest")).toBe(32);
    expect(quantityOf("swamp")).toBe(5);
  });

  it("hands a colour's unreachable slots to a colour that can still fill them", () => {
    const plan = planFill([
      ...Array.from({ length: 3 }, (_, i) => c({ oracleId: `g${i}`, manaCost: "{G}{G}" })),
      c({ oracleId: "b0", manaCost: "{B}" }),
      basic("forest", 3, "Forest"),
      basic("swamp", 60, "Swamp"),
    ], FLAT);
    const quantityOf = (id: string) => plan.rows.find((r) => r.oracleId === id)!.quantity;
    expect(quantityOf("forest")).toBe(3);
    expect(quantityOf("swamp")).toBe(34);
  });

  it("reaches past the utility-land cap when the basics run short", () => {
    const utility = Array.from({ length: 40 }, (_, i) => nonBasicLand(`u${i}`));
    const plan = planFill([...utility, basic("forest", 5)], FLAT);
    const lands = plan.rows.filter((r) => r.role === "land");
    expect(lands.find((r) => r.oracleId === "forest")!.quantity).toBe(5);
    expect(lands.reduce((n, r) => n + r.quantity, 0)).toBe(37);
    expect(plan.shortfalls).not.toContain("land");
  });

  it("counts a hybrid pip for both of its colours", () => {
    const plan = planFill([
      c({ oracleId: "hybrid", manaCost: "{G/B}" }),
      basic("forest", 40, "Forest"),
      basic("swamp", 40, "Swamp"),
    ], FLAT);
    const quantityOf = (id: string) => plan.rows.find((r) => r.oracleId === id)!.quantity;
    expect(quantityOf("forest")).toBe(18);
    expect(quantityOf("swamp")).toBe(19);
  });

  it("weights Wastes by a true colourless requirement, not by generic cost", () => {
    const plan = planFill([
      c({ oracleId: "eldrazi", manaCost: "{4}{C}{C}" }),
      c({ oracleId: "g0", manaCost: "{G}" }),
      basic("wastes", 40, "Wastes"),
      basic("forest", 40, "Forest"),
    ], FLAT);
    const quantityOf = (id: string) => plan.rows.find((r) => r.oracleId === id)!.quantity;
    expect(quantityOf("wastes")).toBe(25);
    expect(quantityOf("forest")).toBe(12);
  });

  it("names every role it came up short on, in role order", () => {
    const plan = planFill([ramp("r0", 5), basic("forest", 37)], FLAT);
    // Objects rather than bare names: a shortfall can be a ROLE or a TYPE, and a reader told
    // only "short on ramp" cannot see a deck eight creatures under the decks it is measured
    // against. With no composition there are no type targets to be short of.
    expect(plan.shortfalls).toEqual([
      { kind: "role", role: "ramp" },
      { kind: "role", role: "draw" },
      { kind: "role", role: "removal" },
      { kind: "role", role: "wipes" },
    ]);
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
    const plan = planFill(full, FLAT);
    expect(plan.filled).toBe(68);
    expect(plan.shortfalls).toEqual([]);
  });

  it("never spends one card twice", () => {
    const plan = planFill([ramp("r", 50), ramp("r", 50)], FLAT);
    expect(plan.rows).toHaveLength(1);
  });

  it("never spends one land twice, basic or not", () => {
    const plan = planFill([
      nonBasicLand("tower"), nonBasicLand("tower"),
      basic("forest", 4), basic("forest", 4),
    ], FLAT);
    expect(plan.rows.filter((r) => r.oracleId === "tower")).toHaveLength(1);
    expect(plan.rows.filter((r) => r.oracleId === "forest")).toHaveLength(1);
    expect(plan.rows.find((r) => r.oracleId === "forest")!.quantity).toBe(4);
  });
});

// The pure half of the dedupe, extracted so the transaction does not have to be
// stubbed to test the arithmetic that gap report 4 flagged.
describe("dedupeSelectionFromPool", () => {
  it("removes selected cards from the candidates the fill plans against", () => {
    const pool = [{ oracleId: "a" }, { oracleId: "b" }, { oracleId: "c" }];
    expect(dedupeSelectionFromPool(pool, ["b"]).map((x) => x.oracleId)).toEqual(["a", "c"]);
  });

  it("leaves the candidates alone when nothing was selected", () => {
    const pool = [{ oracleId: "a" }];
    expect(dedupeSelectionFromPool(pool, [])).toHaveLength(1);
  });

  it("ignores a selected id that is not among the candidates", () => {
    const pool = [{ oracleId: "a" }];
    expect(dedupeSelectionFromPool(pool, ["zzz"])).toHaveLength(1);
  });

  it("accepts a Set as well as an array", () => {
    const pool = [{ oracleId: "a" }, { oracleId: "b" }];
    expect(dedupeSelectionFromPool(pool, new Set(["a"])).map((x) => x.oracleId)).toEqual(["b"]);
  });
});
