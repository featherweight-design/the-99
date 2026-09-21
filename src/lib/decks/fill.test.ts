import { describe, expect, it } from "vitest";

import { dedupeSelectionFromPool, planFill, type FillCandidate, type FillPlan } from "./fill";
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
