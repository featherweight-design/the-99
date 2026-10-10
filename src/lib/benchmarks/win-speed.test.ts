import { describe, expect, it } from "vitest";
import { card, line, padded } from "./fixtures";
import { everyFound, winSpeed } from "./win-speed";

const monolith = card("Basalt Monolith", { typeLine: "Artifact", manaValue: 3 });
const monument = card("Forsaken Monument", { typeLine: "Legendary Artifact", manaValue: 5 });

describe("winSpeed", () => {
  it("is null with no line, which draws No combo line rather than a grade", () => {
    expect(winSpeed(padded([monolith]), [])).toBeNull();
  });

  it("gives the same odds for the same list, in any order", () => {
    const deck = padded([monolith, monument]);
    const a = winSpeed(deck, [line("v1", [monolith, monument])]);
    const b = winSpeed([...deck].reverse(), [line("v1", [monolith, monument])]);
    expect(a?.odds).toBe(b?.odds);
    // Two named cards in 14 of 99: about 1.9%, never 0 and never sure.
    expect(a!.odds).toBeGreaterThan(0.005);
    expect(a!.odds).toBeLessThan(0.05);
  });

  it("counts a commander piece as always in hand", () => {
    const cmd = card("Zhulodok", { commander: true, typeLine: "Legendary Creature", manaValue: 6 });
    const solo = winSpeed(padded([cmd, monolith]), [line("v", [cmd, monolith])])!;
    const pair = winSpeed(padded([monolith, monument]), [line("v", [monolith, monument])])!;
    expect(solo.odds).toBeGreaterThan(pair.odds * 5);
  });

  it("lets a search stand in only for a piece it can find", () => {
    const artifactTutor = card("Fabricate", { oracleText: "Search your library for an artifact card, reveal it, put it into your hand, then shuffle.", quantity: 20 });
    const creatureTutor = card("Worldly Tutor", { oracleText: "Search your library for a creature card, reveal it, then shuffle and put the card on top.", quantity: 20 });
    const lines = [line("v", [monolith, monument])];
    const withArtifact = winSpeed(padded([monolith, monument, artifactTutor]), lines)!;
    const withCreature = winSpeed(padded([monolith, monument, creatureTutor]), lines)!;
    const without = winSpeed(padded([monolith, monument]), lines)!;
    expect(withArtifact.odds).toBeGreaterThan(without.odds * 5);
    expect(withArtifact.tutors.map((c) => c.name)).toEqual(["Fabricate"]);
    expect(withCreature.tutors).toEqual([]);
    expect(withCreature.odds).toBeCloseTo(without.odds, 2);
  });

  it("keeps every line, uncapped", () => {
    const pieces = Array.from({ length: 8 }, (_, i) => card(`P${i}`, { typeLine: "Artifact" }));
    const lines = pieces.slice(1).map((p, i) => line(`v${i}`, [pieces[0], p]));
    expect(winSpeed(padded(pieces), lines)!.lines).toHaveLength(7);
  });
});

describe("everyFound", () => {
  const reach = (t: string, p: string) => (t === "wide" ? true : t === "narrow" ? p === "a" : false);
  it("never spends one search on two pieces", () => {
    expect(everyFound(["a", "b"], ["wide"], reach)).toBe(false);
  });
  it("gives the narrow search its piece and the wide one the other", () => {
    expect(everyFound(["a", "b"], ["wide", "narrow"], reach)).toBe(true);
  });
  it("finds nothing a search cannot reach", () => {
    expect(everyFound(["b"], ["narrow"], reach)).toBe(false);
  });
});
