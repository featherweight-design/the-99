import { describe, expect, it } from "vitest";
import { choosePairs, legalPairs, unionPairs, type PairSource } from "./pair-enumerate";

let n = 0;
const card = (name: string, oracleText: string, over: Partial<PairSource> = {}): PairSource => ({
  oracleId: `00000000-0000-0000-0000-${String(++n).padStart(12, "0")}`,
  name,
  typeLine: "Legendary Creature — Human",
  oracleText,
  layout: "normal",
  manaCost: "{2}",
  ...over,
});

describe("legalPairs", () => {
  const thrasios = card("Thrasios, Triton Hero", "Partner (You can have two commanders if both have partner.)");
  const tymna = card("Tymna the Weaver", "Lifelink\nPartner (You can have two commanders if both have partner.)");
  const kraum = card("Kraum, Ludevic's Opus", "Flying, haste\nPartner");
  const pir = card("Pir, Imaginative Rascal", "Partner with Toothy, Imaginary Friend (When this creature enters...)");
  const toothy = card("Toothy, Imaginary Friend", "Partner with Pir, Imaginative Rascal (When this creature enters...)");
  const kratos = card("Kratos, Stoic Father", "Partner—Father & son (You can have two commanders if both have this ability.)");
  const atreus = card("Atreus, Impulsive Son", "Reach\nPartner—Father & son (You can have two commanders if both have this ability.)");
  const leo = card("Leonardo, the Balance", "Partner—Character select (You can have two commanders if both have this ability.)");
  const vanilla = card("Isshin, Two Heavens as One", "If a creature attacking causes a triggered ability...");
  // A partner ability on a card that cannot lead a deck at all: not a pair anyone can build.
  const blaring = card("Blaring Captain", "Partner with Blaring Recruiter (...)", { typeLine: "Creature — Azra Warrior" });
  const recruiter = card("Blaring Recruiter", "Partner with Blaring Captain (...)", { typeLine: "Creature — Elf Warrior" });

  const tenth = card("The Tenth Doctor", "Allons-y! — Whenever The Tenth Doctor attacks, ...", { typeLine: "Legendary Creature — Time Lord Doctor" });
  const fourth = card("The Fourth Doctor", "Would You Like a...? — ...", { typeLine: "Legendary Creature — Time Lord Doctor" });
  const rose = card("Rose Tyler", "Bad Wolf — ...\nDoctor's companion (You can have two commanders if the other is the Doctor.)");

  const pairs = legalPairs([thrasios, tymna, kraum, pir, toothy, kratos, atreus, leo, vanilla, blaring, recruiter, tenth, fourth, rose]);
  const has = (x: PairSource, y: PairSource) =>
    pairs.some((p) => (p.a === x.oracleId && p.b === y.oracleId) || (p.a === y.oracleId && p.b === x.oracleId));

  it("pairs each Doctor with a companion, and never two Doctors or a Doctor with a partner", () => {
    expect(has(tenth, rose)).toBe(true);
    expect(has(fourth, rose)).toBe(true);
    expect(has(tenth, fourth)).toBe(false);
    expect(has(tenth, thrasios)).toBe(false);
  });

  it("pairs every generic partner with every other one", () => {
    expect(has(thrasios, tymna)).toBe(true);
    expect(has(thrasios, kraum)).toBe(true);
    expect(has(tymna, kraum)).toBe(true);
  });

  it("pairs a named partner only with the card it names", () => {
    expect(has(pir, toothy)).toBe(true);
    expect(has(pir, thrasios)).toBe(false);
  });

  it("pairs a restricted label only within its own label", () => {
    expect(has(kratos, atreus)).toBe(true);
    expect(has(kratos, leo)).toBe(false);
    expect(has(kratos, thrasios)).toBe(false);
  });

  it("forms no pair with a card that has no partner ability, or cannot be a commander", () => {
    expect(pairs.some((p) => p.a === vanilla.oracleId || p.b === vanilla.oracleId)).toBe(false);
    expect(has(blaring, recruiter)).toBe(false);
  });

  it("emits each pair once, in canonical id order, with each name on its own id", () => {
    expect(pairs).toHaveLength(7);
    for (const p of pairs) expect(p.a < p.b).toBe(true);
    const byId = new Map([thrasios, tymna, kraum, pir, toothy, kratos, atreus, tenth, fourth, rose].map((c) => [c.oracleId, c.name]));
    for (const p of pairs) {
      expect(byId.get(p.a)).toBe(p.nameA);
      expect(byId.get(p.b)).toBe(p.nameB);
    }
  });
});

describe("unionPairs", () => {
  it("keeps a built pair the rules would not form, and fetches a pair in both lists once", () => {
    const legal = [{ a: "1", b: "2", nameA: "A", nameB: "B" }];
    const built = [
      { a: "1", b: "2", nameA: "A", nameB: "B" },
      { a: "3", b: "4", nameA: "C", nameB: "D" },
    ];
    expect(unionPairs(legal, built)).toEqual([
      { a: "1", b: "2", nameA: "A", nameB: "B" },
      { a: "3", b: "4", nameA: "C", nameB: "D" },
    ]);
  });
});

describe("choosePairs", () => {
  const legal = [{ a: "1", b: "2", nameA: "A", nameB: "B" }, { a: "5", b: "6", nameA: "E", nameB: "F" }];
  const built = [{ a: "3", b: "4", nameA: "C", nameB: "D" }];

  // The refusal keeps the built pairs: they were indexed before the sweep existed, and a
  // short enumeration is a reason to skip the widening, not to stop indexing those.
  it("refuses a short enumeration and still returns exactly the built pairs", () => {
    const out = choosePairs(legal, built, 3);
    expect(out.refusal).toMatch(/only 2 legal partner pairs enumerated \(floor 3\)/);
    expect(out.pairs).toEqual(built);
    expect(out.legal).toBe(2);
  });

  it("sweeps the union at or above the floor", () => {
    const out = choosePairs(legal, built, 2);
    expect(out.refusal).toBeNull();
    expect(out.pairs).toHaveLength(3);
  });
});
