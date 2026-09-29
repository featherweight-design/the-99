import { describe, expect, it } from "vitest";

import { capToBody, dedupeSelectionFromPool, planFill, type FillCandidate, type FillPlan } from "./fill";
import type { CompositionTargets, ProfileSkeleton } from "../profile/types";

/** The asserted baseline, which is what every case below the new block was written against. */
const FLAT = { hasPartner: false, skeleton: null } as const;

/** A skeleton carrying whatever targets a case is about, and plausible figures for the rest —
 *  a zero everywhere else would make the type tie-break see a surplus on every axis. */
type SkeletonOver = Partial<CompositionTargets>
  & { ramp?: number; draw?: number; removal?: number; wipes?: number };

const skeletonWith = (over: SkeletonOver): ProfileSkeleton => ({
  composition: {
    of: "commander",
    targets: {
      land: over.land ?? 36, basic: over.basic ?? 20, nonbasic: over.nonbasic ?? 16,
      creature: over.creature ?? 26, instant: over.instant ?? 8,
      sorcery: over.sorcery ?? 7, artifact: over.artifact ?? 9,
      enchantment: over.enchantment ?? 6, planeswalker: over.planeswalker ?? 1,
      battle: over.battle ?? 0,
    },
    averageCurve: null,
  },
  roleTargets: {
    of: "commander",
    targets: {
      ramp: over.ramp ?? 10, draw: over.draw ?? 10,
      removal: over.removal ?? 8, wipes: over.wipes ?? 3,
    },
  },
  condition: "G", thinCondition: false, staples: [], commanderDeckCount: 1000,
});
const skeletonWithLand = (land: number) => skeletonWith({ land });

/** A generic non-land pool, deep enough that the role floors and the residual both have
 *  something to take. Deliberately varied in type so the tie-break has real choices. */
const poolOf = (n: number): FillCandidate[] =>
  Array.from({ length: n }, (_, i) =>
    c({
      oracleId: `p${i}`, name: `p${i}`, inclusionPct: 90 - (i % 80),
      typeLine: i % 3 === 0 ? "Creature — Human" : i % 3 === 1 ? "Instant" : "Sorcery",
      oracleText: i % 4 === 0 ? "Search your library for a basic land card."
        : i % 4 === 1 ? "Draw a card."
        : i % 4 === 2 ? "Destroy target creature."
        : "Destroy all creatures.",
    }));

const countRole = (plan: FillPlan, role: string) =>
  plan.rows.filter((r) => r.role === role).reduce((n, r) => n + r.quantity, 0);

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

  // WAS "stacks basics up to the copies owned". A basic is never a buy — `draft-state.ts` forces
  // `owned` for one and the shopping figures bill none — so capping the mana base at the shelf
  // contradicted the rest of the app, and it is what dropped a colour out of a deck's split
  // entirely when no copies were to hand.
  it("stacks a basic to the land target however few copies are owned", () => {
    const plan = planFill([basic("forest", 12)], FLAT);
    expect(plan.rows).toEqual([{ oracleId: "forest", quantity: 37, role: "land" }]);
    expect(plan.filled).toBe(37);
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

  // WAS "hands a colour's unreachable slots to a colour that can still fill them". No colour is
  // unreachable now, so there are no slots to hand over — and the loop that handed them is gone.
  // It ordered only by pip weight and checked only capacity, never the identity and never whether
  // the receiving colour's weight was zero, which is how a Boros deck's capped Plains spilled six
  // Wastes. The split now follows the pips whatever the shelf holds.
  it("follows the pips even when a colour's copies run short", () => {
    const plan = planFill([
      ...Array.from({ length: 3 }, (_, i) => c({ oracleId: `g${i}`, manaCost: "{G}{G}" })),
      c({ oracleId: "b0", manaCost: "{B}" }),
      basic("forest", 3, "Forest"),
      basic("swamp", 60, "Swamp"),
    ], FLAT);
    const quantityOf = (id: string) => plan.rows.find((r) => r.oracleId === id)!.quantity;
    // 6 green pips to 1 black, and three Forests owned no longer caps green at three.
    expect(quantityOf("forest")).toBe(32);
    expect(quantityOf("swamp")).toBe(5);
  });

  // WAS "reaches past the utility-land cap when the basics run short". Basics cannot run short
  // any more, so the case that needed the lift is a pool with NO basic at all — which is still
  // real: a collection with no basics in the deck's colours offers none to the pool.
  it("reaches past the utility-land cap when the pool holds no basic", () => {
    const utility = Array.from({ length: 40 }, (_, i) => nonBasicLand(`u${i}`));
    const plan = planFill(utility, FLAT);
    const lands = plan.rows.filter((r) => r.role === "land");
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
      { kind: "role", role: "ramp", short: 9 },
      { kind: "role", role: "draw", short: 10 },
      { kind: "role", role: "removal", short: 8 },
      { kind: "role", role: "wipes", short: 3 },
    ]);
  });

  // THE MAGNITUDE, on the TYPE arm, which is the one the bulk controls' concession note reads.
  // A note saying `short on creatures` cannot tell a deck one card under the decklists it is
  // measured against from one eight cards under, and those are different answers to the
  // question the control is asked. Measured with `slots` set so the fill CANNOT close the gap
  // — an unbounded fill would close it and report nothing, which proves nothing about the
  // figure.
  it("says how far short each type is, not only which", () => {
    const plan = planFill(poolOf(40), {
      hasPartner: false,
      skeleton: skeletonWith({ creature: 26, instant: 8 }),
      slots: 4,
    });
    const creature = plan.shortfalls.find(
      (s) => s.kind === "type" && s.type === "creature",
    );
    expect(creature, "no creature shortfall to measure").toBeTruthy();
    // Against the deck the plan actually built, never against the target alone: with two
    // creatures placed the note owes `24 creatures short` and not `26`.
    const placedCreatures = plan.rows.filter((r) => {
      const n = Number(r.oracleId.replace("p", ""));
      return Number.isInteger(n) && n % 3 === 0;
    }).length;
    expect(creature).toEqual({
      kind: "type",
      type: "creature",
      short: 26 - placedCreatures,
    });
    expect(placedCreatures, "the fill placed nothing, so the figure is the target").toBeGreaterThan(0);
  });

  // `measured` AND `measuredTypes` ARE DIFFERENT QUESTIONS, and the concession note turns on
  // the second one. The role chain ends at the asserted baseline, so there is always a floor
  // to be short of; the composition chain can end at nothing, and then the ten type
  // shortfalls are empty for the opposite reason to a deck that met all ten.
  it("distinguishes no type targets from every type target met", () => {
    const none = planFill(poolOf(40), { hasPartner: false, skeleton: null, slots: 4 });
    expect(none.measuredTypes).toBe(false);
    expect(none.shortfalls.some((s) => s.kind === "type")).toBe(false);

    const withTargets = planFill(poolOf(40), {
      hasPartner: false,
      skeleton: skeletonWith({ creature: 26 }),
      slots: 4,
    });
    expect(withTargets.measuredTypes).toBe(true);
    expect(withTargets.shortfalls.some((s) => s.kind === "type")).toBe(true);
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
    // 36, not 4: the dedupe is what this pins, and a basic is no longer capped at copies owned.
    // 36 rather than 37 because the utility sweep takes the tower first, as it should.
    expect(plan.rows.find((r) => r.oracleId === "forest")!.quantity).toBe(36);
  });

  // ---- the basics split, by identity (Hugh, 2026-09-28) ----

  const boros = { ...FLAT, identity: ["R", "W"] };

  it("never puts Wastes in a coloured deck", () => {
    const plan = planFill([
      c({ oracleId: "w0", manaCost: "{W}" }), c({ oracleId: "r0", manaCost: "{R}" }),
      basic("plains", 40, "Plains"), basic("mountain", 40, "Mountain"),
      basic("wastes", 40, "Wastes"),
    ], boros);
    expect(plan.rows.find((r) => r.oracleId === "wastes")).toBeUndefined();
  });

  it("puts Wastes in a colourless deck", () => {
    const plan = planFill([basic("wastes", 40, "Wastes")], { ...FLAT, identity: [] });
    expect(plan.rows.find((r) => r.oracleId === "wastes")!.quantity).toBe(37);
  });

  it("leaves out a basic for a colour outside the identity", () => {
    const plan = planFill([
      c({ oracleId: "w0", manaCost: "{W}" }),
      basic("plains", 40, "Plains"), basic("island", 40, "Island"),
    ], boros);
    expect(plan.rows.find((r) => r.oracleId === "island")).toBeUndefined();
  });

  it("splits a two-colour deck evenly when the pips are even", () => {
    const plan = planFill([
      c({ oracleId: "w0", manaCost: "{W}" }), c({ oracleId: "r0", manaCost: "{R}" }),
      basic("plains", 40, "Plains"), basic("mountain", 40, "Mountain"),
    ], boros);
    const q = (id: string) => plan.rows.find((r) => r.oracleId === id)!.quantity;
    expect(Math.abs(q("plains") - q("mountain"))).toBeLessThanOrEqual(1);
    expect(q("plains") + q("mountain")).toBe(37);
  });

  it("tilts a two-colour deck toward the heavier colour", () => {
    const plan = planFill([
      ...Array.from({ length: 6 }, (_, i) => c({ oracleId: `w${i}`, manaCost: "{W}", inclusionPct: 90 - i })),
      c({ oracleId: "r0", manaCost: "{R}", inclusionPct: 50 }),
      basic("plains", 40, "Plains"), basic("mountain", 40, "Mountain"),
    ], boros);
    const q = (id: string) => plan.rows.find((r) => r.oracleId === id)!.quantity;
    expect(q("plains")).toBeGreaterThan(q("mountain"));
    expect(q("mountain")).toBeGreaterThan(0);
    expect(q("plains") + q("mountain")).toBe(37);
  });

  it("gives a mono deck's one colour the whole base", () => {
    const plan = planFill([
      c({ oracleId: "w0", manaCost: "{W}" }), basic("plains", 40, "Plains"),
    ], { ...FLAT, identity: ["W"] });
    expect(plan.rows.find((r) => r.oracleId === "plains")!.quantity).toBe(37);
  });

  it("gives every colour of a five-colour deck at least one basic", () => {
    // One pip in white and none elsewhere: four colours round to zero and must still be castable.
    const plan = planFill([
      c({ oracleId: "w0", manaCost: "{W}" }),
      basic("plains", 40, "Plains"), basic("island", 40, "Island"), basic("swamp", 40, "Swamp"),
      basic("mountain", 40, "Mountain"), basic("forest", 40, "Forest"),
    ], { ...FLAT, identity: ["W", "U", "B", "R", "G"] });
    const q = (id: string) => plan.rows.find((r) => r.oracleId === id)?.quantity ?? 0;
    for (const id of ["plains", "island", "swamp", "mountain", "forest"]) {
      expect(q(id)).toBeGreaterThan(0);
    }
    expect(["plains", "island", "swamp", "mountain", "forest"].reduce((n, id) => n + q(id), 0)).toBe(37);
  });

  it("takes a basic the player owns NO copies of", () => {
    // ITEM 2's actual point, and the Thorin case: Mountain was in the pool with nothing to hand,
    // and gating on `ownedQuantity` dropped red out of the split entirely. A basic is never a buy.
    const plan = planFill([
      c({ oracleId: "w0", manaCost: "{W}" }), c({ oracleId: "r0", manaCost: "{R}" }),
      basic("plains", 40, "Plains"), basic("mountain", 0, "Mountain"),
    ], boros);
    const q = (id: string) => plan.rows.find((r) => r.oracleId === id)?.quantity ?? 0;
    expect(q("mountain")).toBeGreaterThan(0);
    expect(q("plains") + q("mountain")).toBe(37);
  });

  it("gives a zero-weight identity colour its floor of one, out of the largest share", () => {
    // Two colours, every pip white. Red rounds to zero and must still be castable, and the one
    // slot comes from white rather than from the total — so the base still adds up.
    const plan = planFill([
      ...Array.from({ length: 5 }, (_, i) => c({ oracleId: `w${i}`, manaCost: "{W}", inclusionPct: 90 - i })),
      basic("plains", 40, "Plains"), basic("mountain", 40, "Mountain"),
    ], boros);
    const q = (id: string) => plan.rows.find((r) => r.oracleId === id)?.quantity ?? 0;
    expect(q("mountain")).toBe(1);
    expect(q("plains")).toBe(36);
  });

  it("never finishes a short base on Wastes, even when Wastes is next in the pool", () => {
    // THE SECOND LOOP, and the case that makes it observable. Every pip is white, so red rounds
    // to zero and takes its floor of one out of white — which leaves the base one short. The
    // fallback sweep then takes the next unspent land, and POOL ORDER decides which: Wastes sits
    // ahead of Mountain here, so before the guard this Boros base finished on a Wastes.
    //
    // The order is the whole fixture. With Mountain first the fallback lands on Mountain by luck
    // and the guard looks unnecessary — which is exactly how the hole survived the split's own
    // tests.
    const plan = planFill([
      ...Array.from({ length: 5 }, (_, i) => c({ oracleId: `w${i}`, manaCost: "{W}", inclusionPct: 90 - i })),
      basic("plains", 40, "Plains"), basic("wastes", 40, "Wastes"), basic("mountain", 40, "Mountain"),
    ], boros);
    expect(plan.rows.find((r) => r.oracleId === "wastes")).toBeUndefined();
    const q = (id: string) => plan.rows.find((r) => r.oracleId === id)?.quantity ?? 0;
    expect(q("plains") + q("mountain")).toBe(37);
  });

  it("leaves the base short rather than finishing it on Wastes", () => {
    // THE ONLY STATE THAT REACHES THE FALLBACK SWEEP, and it took three attempts to find. With no
    // capacity cap and a floor that makes the allocation exact, the split always fills the base —
    // so the fallback runs only when the pool holds NO basic the identity wants. Then it sweeps
    // `lands`, which still contains Wastes, and before the guard it finished a Boros base on it.
    //
    // Close to the real HD - Thorin pool: the deck's own colours missing, Wastes present.
    const plan = planFill([
      c({ oracleId: "w0", manaCost: "{W}" }),
      basic("wastes", 40, "Wastes"),
    ], boros);
    expect(plan.rows.find((r) => r.oracleId === "wastes")).toBeUndefined();
    // And it reports the shortfall rather than hiding it behind a land it must not play.
    expect(plan.rows.filter((r) => r.role === "land")).toHaveLength(0);
  });

  it("gives EACH starved colour its floor, not two slots to whichever sorts first", () => {
    // THE CASE THAT MAKES THE FLOOR RULE FALSIFIABLE, and it took a while to find. With one
    // starved colour the rule looks untested: drop it and the base comes out one short, the
    // fallback sweep takes the next unspent land, and that happens to be the starved colour's
    // basic — same answer by luck.
    //
    // With TWO starved colours and two printings of the first one ahead of the second in the pool,
    // luck runs out. Without the floor the base is two short and the fallback takes the first two
    // unspent lands, which are BOTH Islands — so black never gets a source. The floor assigns one
    // slot per starved colour before any take, so pool order cannot decide it.
    const plan = planFill([
      ...Array.from({ length: 5 }, (_, i) => c({ oracleId: `w${i}`, manaCost: "{W}", inclusionPct: 90 - i })),
      basic("plains", 40, "Plains"),
      basic("island-a", 40, "Island"), basic("island-b", 40, "Island"),
      basic("swamp", 40, "Swamp"),
    ], { ...FLAT, identity: ["W", "U", "B"] });
    const q = (id: string) => plan.rows.find((r) => r.oracleId === id)?.quantity ?? 0;
    const islands = q("island-a") + q("island-b");
    expect(islands).toBe(1);
    expect(q("swamp")).toBe(1);
    expect(q("plains")).toBe(35);
  });

  /**
   * NEVER PAST THE CEILING, however many land-backed modal cards the pool holds. The residual runs
   * BEFORE the basics here, so its guard cannot read the basics out of `counts.land` the way it
   * could when they were already placed — and every wrong way to bridge that gap is silent. Both
   * figures are `origin/main`'s on this identical pool, measured: 37 flat, 36 under a 36 skeleton.
   */
  it("never admits land drops past the ceiling, whatever the pool holds", () => {
    const modalPool = () => [
      ...Array.from({ length: 40 }, (_, i) => c({
        oracleId: `m${i}`, name: `m${i}`, inclusionPct: 95 - i,
        typeLine: "Sorcery // Land", layout: "modal_dfc", oracleText: "Draw a card.",
      })),
      basic("mountain", 40, "Mountain"),
      ...Array.from({ length: 30 }, (_, i) =>
        c({ oracleId: `f${i}`, name: `f${i}`, manaCost: "{R}", inclusionPct: 40 - i })),
    ];
    const flat = planFill(modalPool(), { ...FLAT, identity: ["R"] });
    const sk36 = planFill(modalPool(), {
      hasPartner: false, skeleton: skeletonWithLand(36), identity: ["R"],
    });
    // The COMPOSITION, not just the total: 27 basics and 10 modal drops under the flat ceiling,
    // 26 and 10 under a 36 skeleton. A residual allowed to spend the reserved basic slots reaches
    // the same total on drops alone (0 and 37), which the totals below cannot tell apart.
    expect([countRole(flat, "land"), flat.landCapable]).toEqual([27, 37]);
    expect([countRole(sk36, "land"), sk36.landCapable]).toEqual([26, 36]);
  });

  /**
   * THE SWEEP HAS TO SEE THE RESIDUAL'S OWN DROPS. With no basic the deck can cast, the reserve is
   * zero and the residual is free to take land-backed modal cards up to the ceiling — and the
   * fallback sweep below it takes ANY unspent land, so a ceiling that still reads as though those
   * drops had not happened lets it add a second full base on top of them.
   */
  it("the fallback sweep counts the land drops the residual already took", () => {
    const plan = planFill([
      ...Array.from({ length: 40 }, (_, i) => c({
        oracleId: `m${i}`, name: `m${i}`, inclusionPct: 95 - i,
        typeLine: "Sorcery // Land", layout: "modal_dfc", oracleText: "Draw a card.",
      })),
      ...Array.from({ length: 40 }, (_, i) => nonBasicLand(`nb${i}`)),
      ...Array.from({ length: 30 }, (_, i) =>
        c({ oracleId: `f${i}`, name: `f${i}`, manaCost: "{R}", inclusionPct: 40 - i })),
    ], { ...FLAT, identity: ["R"] });
    expect(plan.landCapable).toBeLessThanOrEqual(37);
  });

  /**
   * A SELECTED CARD IS IN THE FINISHED DECK, so its pips weight the basics. `createDeck` inserts
   * its selection beside the plan's rows, and every selected card is in `excludeOracleIds` — so
   * it is stripped from the candidate pool and reaches neither `held` nor `rows`. Its costs ride
   * in on `commanderCosts`, which is the census's own input, and `actions.ts` fills it from
   * `selectedSet`.
   */
  it("counts a SELECTED card's pips in the census", () => {
    const pool = [basic("plains", 40, "Plains"), basic("mountain", 40, "Mountain")];
    const args = { hasPartner: false, skeleton: null, identity: ["R", "W"] } as const;
    const q = (plan: FillPlan, id: string) =>
      plan.rows.filter((r) => r.oracleId === id).reduce((n, r) => n + r.quantity, 0);
    // A white commander and nothing else: white leads the split.
    const white = planFill(pool, { ...args, commanderCosts: ["{W}{W}"] });
    expect(q(white, "plains")).toBeGreaterThan(q(white, "mountain"));
    // The same deck and the same commander, plus nine red cards the CALLER places. Red must now
    // lead — which it can only do if those costs reached the census, since nothing else changed.
    const selected = planFill(pool, {
      ...args, commanderCosts: ["{W}{W}", ...Array.from({ length: 9 }, () => "{R}{R}")],
    });
    expect(q(selected, "mountain")).toBeGreaterThan(q(selected, "plains"));
  });

  it("counts the COMMANDERS' pips in the census", () => {
    // The deck's only coloured pips are the commander's. Without it the census is empty, the split
    // falls back to even, and a red-heavy commander gets a white-equal base. `{R}{R}{W}` is
    // asymmetric on purpose: an even split and a pip split give different answers here.
    const plan = planFill([
      ...Array.from({ length: 12 }, (_, i) => c({ oracleId: `g${i}`, manaCost: "{2}", inclusionPct: 90 - i })),
      basic("plains", 40, "Plains"), basic("mountain", 40, "Mountain"),
    ], { ...boros, commanderCosts: ["{R}{R}{R}{W}"] });
    const q = (id: string) => plan.rows.find((r) => r.oracleId === id)?.quantity ?? 0;
    // A RATIO, not an inequality. `{R}{R}{R}{W}` is 3:1, so the pip split is 28/9 — while the
    // no-pips fallback is an even 19/18, which `mountain > plains` also satisfies. Asserting only
    // the inequality left the "commanders dropped from the census" mutation green.
    expect(q("mountain")).toBeGreaterThanOrEqual(25);
    expect(q("mountain") + q("plains")).toBe(37);
  });

  it("counts the RESIDUAL's pips in the census", () => {
    // The role rows are white; the red lives in cards that can only reach the deck as residual —
    // they close no floor. Before the split moved after the residual this deck scored zero red and
    // gave Mountain its floor of one. `toBeGreaterThan(1)` is the whole point: 1 means the floor
    // caught it, not the census.
    const plan = planFill([
      ...Array.from({ length: 8 }, (_, i) => c({
        oracleId: `w${i}`, manaCost: "{1}{W}", inclusionPct: 95 - i,
        typeLine: "Instant", oracleText: "Draw a card.",
      })),
      ...Array.from({ length: 20 }, (_, i) => c({
        oracleId: `r${i}`, manaCost: "{1}{R}", inclusionPct: 60 - i,
        typeLine: "Creature — Goblin", oracleText: "Haste.",
      })),
      basic("plains", 40, "Plains"), basic("mountain", 40, "Mountain"),
    ], boros);
    const q = (id: string) => plan.rows.find((r) => r.oracleId === id)?.quantity ?? 0;
    expect(q("mountain")).toBeGreaterThan(1);
    expect(q("mountain") + q("plains")).toBe(37);
  });

  it("counts every HELD spell in the census, not only the ones it chose", () => {
    // The case my own harness got wrong: with `inclusionPct` null the candidate order falls back
    // to NAME, so a role cap can take an all-red sample of a mixed pool. The census has to read
    // the deck's held cards too — `planFill` does, and this is what pins it.
    const plan = planFill([
      basic("plains", 40, "Plains"), basic("mountain", 40, "Mountain"),
    ], {
      ...boros,
      held: Array.from({ length: 9 }, () => ({
        typeLine: "Instant", manaCost: "{W}", quantity: 1,
        oracleText: "Draw a card.", keywords: [], layout: "normal",
      })),
    });
    const q = (id: string) => plan.rows.find((r) => r.oracleId === id)?.quantity ?? 0;
    // Nine white pips held and no red: white takes the base, red keeps its floor of one.
    expect(q("plains")).toBeGreaterThan(q("mountain"));
    expect(q("mountain")).toBe(1);
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

// THE FIVE CASES §13 NAMES. Each one is a rule the fill could break while every other test
// here stayed green, which is why the plan wrote them out rather than leaving them to a sweep.
describe("planFill against a measured skeleton", () => {
  // [R2] R1's version of this passed for three wrong reasons — the card never placed, the pool
  // already supplied 36 lands, or classifyRoles called it a land and the role pass skipped it.
  // This asserts the row IS placed, on a NON-land role, and that only the modal one credits.
  it("credits a placed modal land and not a placed transform card", () => {
    const skeleton = skeletonWithLand(36);
    const mdfc = c({
      oracleId: "mdfc", name: "mdfc", typeLine: "Sorcery // Land", layout: "modal_dfc",
      oracleText: "Draw three cards.\n//\nEnters tapped. {T}: Add {R}.", inclusionPct: 99,
    });
    const xform = c({
      oracleId: "xf", name: "xf", typeLine: "Creature — God // Land", layout: "transform",
      oracleText: "Draw three cards.\n//\n{T}: Add {R}.", inclusionPct: 99,
    });

    const a = planFill([mdfc, ...poolOf(200)], { hasPartner: false, skeleton });
    // PLACED, and on a non-land role. The exact role is deliberately not asserted: the type
    // tie-break decides which card closes `draw`, so naming one here would pin an incidental
    // choice and fail the day the deficits move. What the case is about is that a placed
    // modal card credits the land count without taking a land slot, and a row on any non-land
    // role shows it — while `role: "land"` would mean the fill took it as a land after all.
    const mdfcRow = a.rows.find((r) => r.oracleId === "mdfc");
    expect(mdfcRow).toBeDefined();
    expect(mdfcRow?.role).not.toBe("land");
    // A modal card sleeved as draw is still a land DROP, so it credits `landCapable` — and
    // never `counts.land`, or the same card would take a role slot and a land slot.
    expect(a.landCapable).toBeGreaterThan(countRole(a, "land"));

    // A `transform` card is NOT a land drop: it only ever flips into one. Same text, same
    // type line, different layout, and the layout is the whole answer.
    const b = planFill([xform, ...poolOf(200)], { hasPartner: false, skeleton });
    const xfRow = b.rows.find((r) => r.oracleId === "xf");
    expect(xfRow).toBeDefined();
    expect(xfRow?.role).not.toBe("land");
    expect(b.landCapable).toBe(countRole(b, "land"));
  });

  // The double-credit case §2.5a names. Without `castFaceText` this card reads as ramp off its
  // land back, is spent on the ramp floor, AND takes a land slot.
  it("never lets one card take a role slot and a land slot", () => {
    const plan = planFill([
      c({
        oracleId: "ss", name: "ss", typeLine: "Sorcery // Land", layout: "modal_dfc",
        oracleText: "Deal 3 damage to any target.\n//\nEnters tapped. {T}: Add {R}.",
        inclusionPct: 99,
      }),
      ...poolOf(200),
    ], { hasPartner: false, skeleton: skeletonWithLand(36) });
    const row = plan.rows.find((r) => r.oracleId === "ss");
    // Not ramp: the land back is not the spell you cast.
    expect(row?.role).not.toBe("ramp");
    expect(row?.role).not.toBe("land");
  });

  // The tie-break decides WHICH card closes a role, never whether one does. A deck short on
  // ramp is a worse outcome than a deck one artifact over, and the overshoot is permanent
  // either way — nothing removes a surplus artifact later.
  it("meets the role floor even when every candidate deepens a type surplus", () => {
    const rocks = Array.from({ length: 20 }, (_, i) =>
      c({ oracleId: `rock${i}`, name: `rock${i}`, typeLine: "Artifact",
          oracleText: "{T}: Add {C}.", inclusionPct: 90 - i }));
    const plan = planFill(rocks, {
      hasPartner: false,
      skeleton: skeletonWith({ land: 35, artifact: 0, creature: 26, ramp: 10 }),
    });
    expect(countRole(plan, "ramp")).toBe(10);
  });

  // §2.5a: the targets describe decks with a card counted under each role it fills, so a
  // single-spend count would make this fill place two cards where the description counted one.
  it("counts a dual-role card toward both floors while spending one slot", () => {
    const plan = planFill([
      c({ oracleId: "x", name: "x", typeLine: "Instant", inclusionPct: 99,
          oracleText: "Destroy target creature. Draw a card." }),
      ...poolOf(200),
      // Basics too, or the LAND floor is short and the assertion below is about that rather
      // than about the four the case is named for.
      ...Array.from({ length: 40 }, (_, i) => basic(`b${i}`, 4)),
    ], {
      hasPartner: false,
      skeleton: skeletonWith({ ramp: 0, draw: 1, removal: 1, wipes: 0, land: 35 }),
    });
    expect(plan.rows.filter((r) => r.oracleId === "x")).toHaveLength(1);
    expect(plan.shortfalls.filter((s) => s.kind === "role")).toEqual([]);
    // THE DISCRIMINATOR, and the first version of this case did not have it: with a
    // single-role credit the fill simply places a SECOND card for the other floor, so both
    // "one row for x" and "no shortfall" hold either way and the case measured nothing. What
    // separates them is how many cards the role pass spent — one where the decklists behind
    // the target counted one, two where it credited only the first role it closed.
    const roleRows = plan.rows.filter(
      (r) => r.role !== "land" && r.role !== "other",
    );
    expect(roleRows).toHaveLength(1);
    expect(roleRows[0]?.oracleId).toBe("x");
  });

  // `createDeck` truncates the tail, so a residual placed with the non-land roles would see
  // the MANA BASE cut on any build carrying a `?select=` picks list.
  it("appends the residual after the land sweeps", () => {
    const plan = planFill(
      [...poolOf(400), ...Array.from({ length: 40 }, (_, i) => basic(`f${i}`, 4))],
      { hasPartner: false, skeleton: skeletonWithLand(35) },
    );
    const roles = plan.rows.map((r) => r.role);
    expect(roles.lastIndexOf("land")).toBeGreaterThan(-1);
    expect(roles.indexOf("other")).toBeGreaterThan(roles.lastIndexOf("land"));
  });
});

// THE FOUR THE PRE-OPEN PASS FOUND, each verified as a concrete repro before it was fixed.
describe("the fill does not leave usable cards behind", () => {
  // The tie-break can spend a DIFFERENT card than the one under the cursor, and a `for…of`
  // advances past the candidate anyway. Ten ramp cards, a floor of ten, and a composition that
  // prefers five of them: the pass placed five, reported a ramp shortfall, and left the other
  // five for the residual to sleeve as `other`.
  it("reconsiders a candidate the tie-break passed over", () => {
    const wantsCreatures = skeletonWith({
      land: 0, creature: 40, artifact: 0, instant: 0, sorcery: 0, enchantment: 0,
      ramp: 10, draw: 0, removal: 0, wipes: 0,
    });
    const pool = [
      ...Array.from({ length: 5 }, (_, i) =>
        c({ oracleId: `a${i}`, name: `a${i}`, typeLine: "Artifact", oracleText: "{T}: Add {C}." })),
      ...Array.from({ length: 5 }, (_, i) =>
        c({ oracleId: `e${i}`, name: `e${i}`, typeLine: "Creature — Elf",
            oracleText: "{T}: Add {C}." })),
    ];
    const plan = planFill(pool, { hasPartner: false, skeleton: wantsCreatures });
    expect(countRole(plan, "ramp")).toBe(10);
    expect(plan.shortfalls).not.toContainEqual({ kind: "role", role: "ramp" });
  });

  // `slots` means "fill this many CARDS". The three land sweeps between the role pass and the
  // residual were the only passes not reading it, so a five-slot ask returned 42 cards.
  it("stops every pass at the slot count, land sweeps included", () => {
    const pool = [
      ...Array.from({ length: 10 }, (_, i) => ramp(`r${i}`, 50)),
      ...Array.from({ length: 10 }, (_, i) => basic(`f${i}`, 10)),
    ];
    const plan = planFill(pool, { ...FLAT, slots: 5 });
    expect(plan.filled).toBe(5);
  });

  // `placed` only ever holds the non-land rows, so the three land axes read 0 whatever the
  // mana base did — a deck meeting its land target exactly still reported all three short.
  it("never reports a land axis as a type shortfall", () => {
    const plan = planFill(
      [...poolOf(200), ...Array.from({ length: 40 }, (_, i) => basic(`f${i}`, 4))],
      { hasPartner: false, skeleton: skeletonWithLand(36) },
    );
    expect(plan.shortfalls.filter((s) => s.kind === "type")
      .map((s) => (s as { type: string }).type))
      .not.toContain("land");
    const types = plan.shortfalls.filter((s) => s.kind === "type")
      .map((s) => (s as { type: string }).type);
    // ALL THREE. The contract excludes every land axis, and a regression reintroducing only
    // `nonbasic` would pass a check that named the other two.
    expect(types).not.toContain("basic");
    expect(types).not.toContain("nonbasic");
  });

  // A skeleton can NAME a measured rung and still carry figures `roleFloors` rejects. The plan
  // was then built entirely to the asserted constants while claiming to be measured.
  it("does not claim measured when it fell back to the asserted floors", () => {
    const broken = skeletonWith({});
    broken.roleTargets = {
      of: "commander",
      targets: { ramp: undefined as unknown as number, draw: 10, removal: 8, wipes: 3 },
    };
    expect(planFill(poolOf(120), { hasPartner: false, skeleton: broken }).measured).toBe(false);
  });
});

describe("the measured composition reaches the mana base too", () => {
  const modal = (id: string) => c({
    oracleId: id, name: id, typeLine: "Sorcery // Land", layout: "modal_dfc",
    oracleText: "Draw three cards.\n//\nEnters tapped. {T}: Add {G}.", inclusionPct: 99,
  });

  // `avg_nonbasic` is this exact figure taken over real decklists. Leaving the constant while
  // every other target became measured is the asserted-number failure this sub-project ends: a
  // commander measuring seven nonbasics would still take twelve utility lands before a basic.
  it("caps utility lands at the measured nonbasic target", () => {
    const utility = Array.from({ length: 20 }, (_, i) =>
      c({ oracleId: `u${i}`, name: `u${i}`, typeLine: "Land", oracleText: "{T}: Add {G}." }));
    const plan = planFill(
      [...utility, ...Array.from({ length: 40 }, (_, i) => basic(`f${i}`, 4))],
      { hasPartner: false, skeleton: skeletonWith({ land: 36, nonbasic: 7 }) },
    );
    const nonbasics = plan.rows.filter(
      (r) => r.role === "land" && r.oracleId.startsWith("u"),
    ).reduce((n, r) => n + r.quantity, 0);
    expect(nonbasics).toBe(7);
  });

  // A card sleeved as draw whose back is a land is a land DROP, so a target of 36 met by 36
  // basics PLUS one modal card is 37 drops — one more than the decklists behind it ran. It
  // still keeps its non-land role: one slot spent, counted once in each place that counts.
  it("charges a modal land drop to the base rather than adding to it", () => {
    // A composition that WANTS sorceries, so the tie-break gives the modal card a draw slot
    // rather than handing all ten to creatures. The case is about a card the fill placed on a
    // non-land role; one the tie-break passes over never reaches the base at all.
    const wantsSorceries = skeletonWith({
      land: 36, creature: 0, instant: 0, artifact: 0, enchantment: 0, sorcery: 40,
    });
    const plan = planFill(
      [modal("m1"), ...poolOf(200), ...Array.from({ length: 40 }, (_, i) => basic(`f${i}`, 4))],
      { hasPartner: false, skeleton: wantsSorceries },
    );
    const placedModal = plan.rows.find((r) => r.oracleId === "m1");
    expect(placedModal).toBeDefined();
    expect(placedModal?.role).not.toBe("land");
    expect(plan.landCapable).toBe(36);
  });

  // And a base completed by those drops must not report itself short by exactly the cards
  // that completed it.
  it("does not report a land shortfall on a base the modal drops completed", () => {
    const wantsSorceries = skeletonWith({
      land: 36, creature: 0, instant: 0, artifact: 0, enchantment: 0, sorcery: 40,
    });
    const plan = planFill(
      [modal("m1"), ...poolOf(200), ...Array.from({ length: 40 }, (_, i) => basic(`f${i}`, 4))],
      { hasPartner: false, skeleton: wantsSorceries },
    );
    expect(plan.shortfalls).not.toContainEqual({ kind: "role", role: "land" });
  });
});

// A type gap is a reason to prefer one card to another. It is never a reason to spend money —
// `byPreference` makes owned the first and absolute preference, and a tie-break that crossed
// that boundary would buy a staple while a card the player already owns went unused.
it("never buys a staple over an owned card on type-gap grounds", () => {
  const wantsCreatures = skeletonWith({
    land: 0, creature: 40, artifact: 0, instant: 0, sorcery: 0, enchantment: 0,
    ramp: 1, draw: 0, removal: 0, wipes: 0,
  });
  const ownedArtifact = c({
    oracleId: "owned", name: "owned", typeLine: "Artifact",
    oracleText: "{T}: Add {C}.", inclusionPct: 50,
  });
  const boughtCreature = c({
    oracleId: "bought", name: "bought", typeLine: "Creature — Elf",
    oracleText: "{T}: Add {C}.", owned: false, ownedQuantity: 0, inclusionPct: 99,
  });
  const plan = planFill([ownedArtifact, boughtCreature], {
    hasPartner: false, skeleton: wantsCreatures, slots: 1,
  });
  expect(plan.rows.find((r) => r.role === "ramp")?.oracleId).toBe("owned");
  expect(plan.bought).toBe(0);
});

// The bulk control's promise is about cards the player can sleeve TONIGHT, so its plan runs
// with `pool: "sleeveable"`. Tested here rather than through the action, because the action's
// stub supplies no unowned candidates — so the rule would be asserted over a pool that cannot
// violate it, which is a check measuring nothing.
describe("pool: sleeveable", () => {
  const owned = ramp("mine", 10);
  const staple = ramp("buy", 99, false);

  it("never reaches past the collection", () => {
    const plan = planFill([staple, owned], { ...FLAT, pool: "sleeveable" });
    expect(plan.rows.map((r) => r.oracleId)).not.toContain("buy");
    expect(plan.bought).toBe(0);
  });

  // And the default still may: the create path buys a staple when a floor is short, which is
  // the behaviour this option narrows rather than replaces.
  it("while the default pool still may", () => {
    const plan = planFill([staple, owned], FLAT);
    expect(plan.rows.map((r) => r.oracleId)).toContain("buy");
  });
});

// WHAT THE DECK ALREADY HOLDS.
//
// Every caller before the bulk control filled an EMPTY deck — `createDeck` starts with nothing
// and `fillDeck` returns early the moment one `deck_cards` row exists — so role counts starting
// at zero was right and nothing had to know better. `chooseBulkFill` is the first caller to
// plan for a deck that already has cards, and without this it asked for four slots and got the
// first four placements of a from-scratch 99.
describe("held", () => {
  const rampSpell = c({
    oracleId: "spare-ramp", name: "Aaa Ramp",
    typeLine: "Artifact", oracleText: "Add {G}.",
  });
  const drawSpell = c({
    oracleId: "want-draw", name: "Zzz Draw",
    typeLine: "Instant", oracleText: "Draw three cards.",
  });
  // Named so the RAMP card wins every tie-break available — `byPreference` falls through to
  // `name.localeCompare`, and with both floors open the first name decides. That is what makes
  // the pair discriminating: the draw card can only be chosen because the ramp floor is shut,
  // never because it sorted first. An earlier version of this case had it the other way round
  // and passed with `held` removed entirely.
  const heldRamp = Array.from({ length: 10 }, () => ({
    typeLine: "Artifact", oracleText: "Add {G}.", keywords: [], layout: "normal",
    manaCost: "{2}", quantity: 1,
  }));

  it("takes the role the deck is short of over the one it has already filled", () => {
    const plan = planFill([rampSpell, drawSpell], { ...FLAT, slots: 1, held: heldRamp });
    expect(plan.rows.map((r) => r.oracleId)).toEqual(["want-draw"]);
  });

  it("and without it, plans for a deck that does not exist", () => {
    // The counterfactual, and the reason the case above means anything: the same pool and the
    // same single slot, with the deck's own contents withheld, spends it on a role the deck
    // has ten of.
    const plan = planFill([rampSpell, drawSpell], { ...FLAT, slots: 1 });
    expect(plan.rows.map((r) => r.oracleId)).toEqual(["spare-ramp"]);
  });

  it("counts a held land-backed modal card against the land ceiling", () => {
    // A card already in the deck whose back is a land is already a land drop. A plan blind to
    // it takes the whole ceiling again, so the deck ends one land over and reports a shortfall
    // it does not have.
    const heldModal = {
      typeLine: "Sorcery // Land", oracleText: "Draw three cards.\n//\nEnters tapped.",
      keywords: [], layout: "modal_dfc", manaCost: "{1}{U}", quantity: 1,
    };
    const basics = Array.from({ length: 40 }, (_, i) => basic(`f${i}`, 4));

    const withHeld = planFill(basics, { ...FLAT, held: [heldModal] });
    const without = planFill(basics, FLAT);

    expect(countRole(withHeld, "land")).toBe(countRole(without, "land") - 1);
    expect(withHeld.landCapable).toBe(without.landCapable);
  });

  it("splits the basics against the costs the deck already casts", () => {
    // The split is proportioned against what the deck will CAST, and a partial fill casts what
    // it holds as well as what this plan adds. A deck of blue spells taking three more lands
    // was splitting them against three costs.
    const heldBlue = Array.from({ length: 12 }, () => ({
      typeLine: "Instant", oracleText: "Draw a card.", keywords: [],
      layout: "normal", manaCost: "{U}{U}", quantity: 1,
    }));
    const pool = [
      ...Array.from({ length: 20 }, (_, i) => basic(`i${i}`, 1, "Island")),
      ...Array.from({ length: 20 }, (_, i) => basic(`f${i}`, 1, "Forest")),
    ];

    const islands = (plan: FillPlan) =>
      plan.rows.filter((r) => r.oracleId.startsWith("i")).reduce((n, r) => n + r.quantity, 0);

    expect(islands(planFill(pool, { ...FLAT, held: heldBlue })))
      .toBeGreaterThan(islands(planFill(pool, FLAT)));
  });

  it("counts a stacked row as the cards it holds, not as one row", () => {
    // A basic is nine cards in one row, so a row count would leave a floor open on a deck
    // already at it. Read through the ROLE the slot is spent on rather than through whether
    // anything was placed: the slot is filled either way — the residual takes it when no floor
    // wants it — and which pass claimed it is the whole difference.
    const held = (quantity: number) => [{
      typeLine: "Artifact", oracleText: "Add {G}.", keywords: [], layout: "normal",
      manaCost: "{2}", quantity,
    }];

    // Nine against a floor of ten: still one short, so the card is spent ON ramp.
    expect(planFill([rampSpell], { ...FLAT, slots: 1, held: held(9) }).rows[0].role)
      .toBe("ramp");
    // Ten: the floor is shut, and the same card falls through to the residual.
    expect(planFill([rampSpell], { ...FLAT, slots: 1, held: held(10) }).rows[0].role)
      .toBe("other");
  });
});

describe("a gate (Help me choose's budget and bracket)", () => {
  it("passes over every card it refuses, in every pass, and hears each placement in order", () => {
    const pool = [
      ...poolOf(120),
      ...Array.from({ length: 40 }, (_, i) => c({ oracleId: `land${i}`, typeLine: "Land", oracleText: "{T}: Add {C}." })),
    ];
    const refused = new Set(["p0", "p1", "p2", "p3", "p4", "land0", "land1"]);
    const heard: string[] = [];
    const plan = planFill(pool, { ...FLAT, gate: { admits: (x) => !refused.has(x.oracleId), place: (x) => heard.push(x.oracleId) } });
    const placedIds = plan.rows.map((r) => r.oracleId);
    expect(placedIds.filter((id) => refused.has(id))).toEqual([]);
    expect(heard).toEqual(placedIds);
    // The fill carried on past the refusals rather than stopping short.
    expect(plan.filled).toBe(planFill(pool, FLAT).filled);
  });
});

describe("capToBody", () => {
  it("keeps rows in order until the body is full, truncating the stack that overruns it", () => {
    const rows = [{ id: "card", quantity: 1 }, { id: "a", quantity: 60 }, { id: "forest", quantity: 40 }, { id: "late", quantity: 1 }];
    expect(capToBody(rows, 99)).toEqual([{ id: "card", quantity: 1 }, { id: "a", quantity: 60 }, { id: "forest", quantity: 38 }]);
  });

  it("leaves a body that fits untouched", () => {
    expect(capToBody([{ quantity: 98 }], 99)).toEqual([{ quantity: 98 }]);
  });
});
