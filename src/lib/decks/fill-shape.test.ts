import { describe, expect, it } from "vitest";

import { preferByTypeGap, tallyTypes, typeDeficits } from "./fill-shape";
import type { CompositionTargets } from "../profile/types";

const ZERO: CompositionTargets = {
  land: 0, basic: 0, nonbasic: 0, creature: 0, instant: 0,
  sorcery: 0, artifact: 0, enchantment: 0, planeswalker: 0, battle: 0,
};
const comp = (over: Partial<CompositionTargets>): CompositionTargets => ({ ...ZERO, ...over });

describe("typeDeficits", () => {
  it("is positive below target and negative over it", () => {
    const d = typeDeficits(comp({ creature: 26, artifact: 11 }), comp({ creature: 4, artifact: 14 }));
    expect(d.get("creature")).toBe(22);
    expect(d.get("artifact")).toBe(-3);
  });

  // `land` is spent on its own budget by the land sweeps, and `basic`/`nonbasic` sit WITHIN
  // land rather than beside it — scoring any of the three would have the role pass spending
  // land slots, and would count every land two or three times over.
  it("ignores all three land axes", () => {
    const d = typeDeficits(comp({ land: 35, basic: 24, nonbasic: 11 }), comp({}));
    expect(d.has("land" as never)).toBe(false);
    expect(d.has("basic" as never)).toBe(false);
    expect(d.has("nonbasic" as never)).toBe(false);
  });

  it("is empty with no targets, so the comparator becomes a no-op", () => {
    expect(typeDeficits(null, comp({}))).toEqual(new Map());
  });
});

describe("preferByTypeGap", () => {
  const d = typeDeficits(comp({ creature: 26, artifact: 11 }), comp({ creature: 4, artifact: 14 }));

  it("prefers the card closing the larger gap", () => {
    expect(preferByTypeGap({ typeLine: "Creature — Bird" }, { typeLine: "Artifact" }, d))
      .toBeLessThan(0);
  });

  // An artifact creature closes the creature gap AND deepens the artifact surplus. It takes
  // its BEST axis: refusing it to avoid a smaller surplus leaves the larger gap open.
  it("scores a multi-type card on its best axis", () => {
    expect(preferByTypeGap({ typeLine: "Artifact Creature — Golem" }, { typeLine: "Artifact" }, d))
      .toBeLessThan(0);
  });

  it("is a no-op on empty deficits, so the caller's prior order survives", () => {
    expect(preferByTypeGap({ typeLine: "Creature" }, { typeLine: "Artifact" }, new Map()))
      .toBe(0);
  });

  // The back face must not score. A whole-line implementation reads `Creature` here and wins
  // on a 26-deep gap the card cannot actually fill — so the axes are chosen to make the two
  // readings disagree, rather than using a land back where `land` is excluded anyway and both
  // readings score the same.
  it("reads the front face only", () => {
    const back = typeDeficits(comp({ instant: 2, creature: 26 }), comp({}));
    expect(preferByTypeGap(
      { typeLine: "Instant // Creature — Horror" }, { typeLine: "Creature — Bird" }, back,
    )).toBeGreaterThan(0);
  });

  // A land, or a type nothing measures, has no claim either way — it must not sort above a
  // card closing a real gap, nor below one deepening a surplus.
  it("gives a card on none of the seven axes a neutral score", () => {
    const surplus = typeDeficits(comp({ artifact: 0 }), comp({ artifact: 5 }));
    expect(preferByTypeGap({ typeLine: "Land" }, { typeLine: "Artifact" }, surplus))
      .toBeLessThan(0);
  });
});

describe("tallyTypes", () => {
  // Through the profile's own `countByType`, not a second copy: the front-face reading is
  // subtle enough that two versions of it would drift, and this is the function that decides
  // whether `Treasure Map // Treasure Cove` lands on the artifact axis, the land axis or both.
  it("counts copies, splits basics out of land, and reads the front face", () => {
    const t = tallyTypes([
      { typeLine: "Basic Land — Forest", quantity: 10 },
      { typeLine: "Land — Desert", quantity: 2 },
      { typeLine: "Artifact Creature — Golem", quantity: 1 },
      { typeLine: "Instant // Land", quantity: 1 },
    ]);
    expect(t.land).toBe(12);
    expect(t.basic).toBe(10);
    expect(t.nonbasic).toBe(2);
    // The artifact creature counts on BOTH its axes, which is what makes the tie-break's
    // best-axis rule meaningful.
    expect(t.creature).toBe(1);
    expect(t.artifact).toBe(1);
    // A land BACK does not make the front an extra land.
    expect(t.instant).toBe(1);
  });
});
