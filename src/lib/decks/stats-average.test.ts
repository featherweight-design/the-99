import { describe, expect, it } from "vitest";

import type { CompositionTargets, ProfileSkeleton } from "../profile/types";
import { jobTally } from "./job-tally";
import { manaCurve, typeCurve } from "./stats";
import { averageComparison, type AverageDeck } from "./stats-average";
import { averageDeckFrom } from "./stats-average-load";

const TARGETS: CompositionTargets = {
  land: 36, basic: 20, nonbasic: 16, creature: 26, instant: 8, sorcery: 9, artifact: 10, enchantment: 6, planeswalker: 1, battle: 0,
};
const skeleton = (over: Partial<ProfileSkeleton> = {}): ProfileSkeleton => ({
  composition: { of: "commander", targets: TARGETS, averageCurve: { "1": 8, "2": 12, "3": 12, "9": 2 } },
  roleTargets: { of: "commander", targets: { ramp: 11.4, draw: 10, removal: 8, wipes: 3 } },
  condition: "BGR",
  thinCondition: false,
  staples: [],
  commanderDeckCount: 1812,
  ...over,
});

describe("averageDeckFrom", () => {
  it("names the commander rung with its deck count and folds the tail into 7+", () => {
    const a = averageDeckFrom(skeleton(), ["Korvold, Fae-Cursed King"], ["B", "G", "R"], false);
    expect(a.basis).toEqual({ of: "commander", names: ["Korvold, Fae-Cursed King"], label: "", decks: 1812 });
    expect(a.curve).toEqual([0, 8, 12, 12, 0, 0, 0, 2]);
    // The mean runs over the UNFOLDED keys, so the 9 is a 9 and not a 7.
    expect(a.manaValue).toBeCloseTo((8 + 24 + 36 + 18) / 34, 6);
    expect(a.roles).toEqual({ ramp: 11.4, draw: 10, removal: 8, wipes: 3 });
  });

  it("sizes the body at 99, or 98 for a pair", () => {
    expect(averageDeckFrom(skeleton(), ["A"], ["W"], false).body).toBe(99);
    expect(averageDeckFrom(skeleton(), ["A", "B"], ["W"], true).body).toBe(98);
  });

  it("names both partners on a pair rung and only the first when the commander's row served a pair deck", () => {
    const pair = averageDeckFrom(skeleton({ composition: { of: "pair", targets: TARGETS, averageCurve: null } }), ["A", "B"], ["W"], true);
    expect(pair.basis.names).toEqual(["A", "B"]);
    const fell = averageDeckFrom(skeleton(), ["A", "B"], ["W"], true);
    expect(fell.basis.names).toEqual(["A"]);
  });

  it("names the identity by its color name and the count rung by its color count, with no deck count", () => {
    const id = averageDeckFrom(skeleton({ composition: { of: "identity", targets: TARGETS, averageCurve: null } }), ["X"], ["G", "B", "R"], false);
    expect(id.basis).toMatchObject({ of: "identity", label: "Jund", decks: null });
    const count = averageDeckFrom(skeleton({ composition: { of: "count", targets: TARGETS, averageCurve: null } }), ["X"], ["G", "B", "R", "W"], false);
    expect(count.basis).toMatchObject({ of: "count", label: "4-color", decks: null });
    const none = averageDeckFrom(skeleton({ composition: { of: "count", targets: TARGETS, averageCurve: null } }), ["X"], [], false);
    expect(none.basis.label).toBe("colorless");
  });

  it("falls to the starting mix when neither the composition nor the roles were measured", () => {
    const a = averageDeckFrom(
      skeleton({ composition: null, roleTargets: { of: "flat", targets: { ramp: 8, draw: 8, removal: 6, wipes: 2 } } }),
      ["Aang, at the Crossroads"],
      ["W"],
      false,
    );
    expect(a.basis.of).toBe("baseline");
    expect(a.targets).toBeNull();
    expect(a.curve).toBeNull();
    expect(a.manaValue).toBeNull();
    expect(a.roles).toEqual({ ramp: 8, draw: 8, removal: 6, wipes: 2 });
  });

  it("draws no job targets when the roles resolved at a different rung than the named composition", () => {
    const a = averageDeckFrom(skeleton({ roleTargets: { of: "identity", targets: { ramp: 8, draw: 8, removal: 6, wipes: 2 } } }), ["X"], ["G"], false);
    expect(a.basis.of).toBe("commander");
    expect(a.roles).toBeNull();
  });

  it("draws no job targets where the composition is measured and the roles are only the flat ones", () => {
    const a = averageDeckFrom(skeleton({ roleTargets: { of: "flat", targets: { ramp: 8, draw: 8, removal: 6, wipes: 2 } } }), ["X"], ["G"], false);
    expect(a.targets).not.toBeNull();
    expect(a.roles).toBeNull();
  });
});

const avg = (over: Partial<AverageDeck> = {}): AverageDeck => ({
  body: 99,
  basis: { of: "commander", names: ["Korvold"], label: "", decks: 1812 },
  targets: TARGETS,
  curve: [1, 9, 14, 13, 11, 8, 4, 4],
  manaValue: 3.4,
  roles: { ramp: 11.4, draw: 10.2, removal: 7.9, wipes: 2.6 },
  ...over,
});
const spell = (cmc: number, typeLine: string, quantity = 1) => ({ cmc, typeLine, quantity });
const have = (cards: ReturnType<typeof spell>[], jobs = jobTally([], {}), count = 99) => ({
  curve: manaCurve(cards),
  types: typeCurve(cards),
  jobs,
  cards: count,
});
const rowOf = (c: ReturnType<typeof averageComparison>, key: string) => c.groups.flatMap((g) => g.rows).find((r) => r.key === key)!;

describe("averageComparison", () => {
  it("draws lands, mana value, the seven types and the four jobs in their groups", () => {
    const c = averageComparison(avg(), have([spell(0, "Land", 36), spell(2, "Creature", 26), spell(3, "Instant", 8)]));
    expect(c.groups.map((g) => [g.key, g.rows.map((r) => r.key)])).toEqual([
      ["shape", ["lands", "manaValue"]],
      ["types", ["creature", "instant", "sorcery", "artifact", "enchantment", "planeswalker", "battle"]],
      ["jobs", ["ramp", "draw", "removal", "wipes"]],
    ]);
    expect(rowOf(c, "lands")).toMatchObject({ you: 36, avg: 36, diff: 0, fill: 0, cut: false });
  });

  it("rounds the difference to one decimal before it is compared, so 12 against 11.4 is 0.6 and not 0.6000000000000005", () => {
    const jobs = jobTally(
      [{ oracleId: "a", name: "A", copies: 12 }],
      { a: ["ramp"] },
    );
    const c = averageComparison(avg(), have([], jobs));
    expect(rowOf(c, "ramp").diff).toBe(0.6);
  });

  it("caps a bar at its end and marks it cut when the gap passes the scale", () => {
    const c = averageComparison(avg(), have([spell(0, "Land", 3)]));
    expect(rowOf(c, "lands")).toMatchObject({ diff: -33, fill: 1, cut: true });
    const exact = averageComparison(avg({ targets: { ...TARGETS, land: 7 } }), have([spell(0, "Land", 3)]));
    // Exactly the scale away fills the bar and is not cut off.
    expect(rowOf(exact, "lands")).toMatchObject({ diff: -4, fill: 1, cut: false });
  });

  it("scales mana value by one, not four", () => {
    const c = averageComparison(avg(), have([spell(2, "Creature", 2)]));
    expect(rowOf(c, "manaValue")).toMatchObject({ you: 2, avg: 3.4, diff: -1.4, fill: 1, cut: true });
  });

  it("omits mana value when the deck has no nonland card, rather than compare against a 0", () => {
    const c = averageComparison(avg(), have([spell(0, "Land", 5)]));
    expect(c.groups[0].rows.map((r) => r.key)).toEqual(["lands"]);
  });

  it("counts the unlabeled cards beside the job rows, and none when there are no job rows", () => {
    const jobs = jobTally([{ oracleId: "a", name: "A", copies: 2 }, { oracleId: "b", name: "B", copies: 1 }], { a: ["ramp"] });
    expect(averageComparison(avg(), have([], jobs)).unlabeled).toBe(1);
    expect(averageComparison(avg({ roles: null }), have([], jobs)).unlabeled).toBe(0);
  });

  it("omits the job group when the label read failed", () => {
    const c = averageComparison(avg(), { ...have([]), jobs: null });
    expect(c.groups.map((g) => g.key)).toEqual(["shape", "types"]);
  });

  it("draws jobs alone against the starting mix", () => {
    const c = averageComparison(
      avg({ basis: { of: "baseline", names: ["Aang"], label: "", decks: null }, targets: null, curve: null, manaValue: null, roles: { ramp: 8, draw: 8, removal: 6, wipes: 2 } }),
      have([]),
    );
    expect(c.groups.map((g) => g.key)).toEqual(["jobs"]);
    expect(c.mini).toBeNull();
    expect(c.note).toBe("baseline");
  });

  it("builds the mini curve from the same buckets as the Curve card, 20px at two cards, 22px at most", () => {
    const c = averageComparison(avg(), have([spell(1, "Creature", 11), spell(2, "Creature", 14)]));
    expect(c.mini![1]).toEqual({ label: 1, diff: 2, px: 20 });
    expect(c.mini![2].diff).toBe(0);
    expect(c.mini![0].diff).toBe(-1);
    expect(c.mini![0].px).toBe(10);
    expect(c.mini).toHaveLength(8);
    // A fractional average a hair from a whole count is the same as it, with no sliver drawn.
    const near = averageComparison(avg({ curve: [1, 9, 11.96, 13, 11, 8, 4, 4] }), have([spell(2, "Creature", 12)]));
    expect(near.mini![2]).toEqual({ label: 2, diff: 0, px: 0 });
  });

  it("says the deck is short only when it is under 99 and a bar is cut off", () => {
    expect(averageComparison(avg(), have([spell(0, "Land", 3)], undefined, 12)).note).toBe("thin");
    const flat = avg({ targets: { ...TARGETS, land: 3, creature: 0, instant: 0, sorcery: 0, artifact: 0, enchantment: 0, planeswalker: 0, battle: 0 }, manaValue: null, roles: { ramp: 0, draw: 0, removal: 0, wipes: 0 } });
    expect(averageComparison(flat, have([spell(0, "Land", 3)], undefined, 12)).note).toBeNull();
    expect(averageComparison(avg(), have([spell(0, "Land", 3)], undefined, 99)).note).toBeNull();
    // A complete pair deck holds 98, so it is not short.
    expect(averageComparison(avg({ body: 98 }), have([spell(0, "Land", 3)], undefined, 98)).note).toBeNull();
    expect(averageComparison(avg({ body: 98 }), have([spell(0, "Land", 3)], undefined, 97)).note).toBe("thin");
  });
});
