// `bestPairing` decides which predicted job answers which gold job when a card has
// two of the same KIND. Depala carries two restricted pumps and Tyrant's Scorn two
// removals, deliberately, so this is the code that decides whether those rows measure
// anything — and three earlier versions of it were wrong in ways the aggregate scores
// never showed, because the published figures did not move.
import { describe, expect, it } from "vitest";

import { bestPairing } from "./card-labels-pairing.mjs";

type J = Parameters<typeof bestPairing>[0][number];

const job = (o: Partial<J> & { kind: string }): J => ({
  space: "theme", restrictedTo: null, trigger: "none", recurrence: "repeatable",
  threshold: null, modal: false, ...o,
} as J);

const LIMITS = ["rampKind", "restrictedTo", "trigger", "recurrence", "threshold", "modal"] as const;
const lim = (j: J, f: string) => f === "threshold"
  ? (j.threshold ? `${j.threshold.stat}${j.threshold.op}${j.threshold.value}` : "none")
  : String((j as unknown as Record<string, unknown>)[f] ?? "none");
const agreement = (a: J, b: J) => LIMITS.filter((f) => lim(a, f) === lim(b, f)).length;

describe("bestPairing", () => {
  it("pairs a single job with its only candidate", () => {
    const g = job({ kind: "pump", restrictedTo: "Dwarf" });
    const p = job({ kind: "pump", restrictedTo: "Dwarf" });
    expect(bestPairing([g], [p], agreement)).toEqual([[g, p]]);
  });

  // THE GREEDY DEFECT. Taking the best match for gold[0] first consumes the
  // prediction that is the only fit for gold[1], so a perfect answer scores as two
  // partial ones. Ordered so that greedy gets it wrong: gold[0] agrees with both.
  it("does not let the first gold job steal the second's only fit", () => {
    const g0 = job({ kind: "pump", restrictedTo: "Dwarf" });
    const g1 = job({ kind: "pump", restrictedTo: "Vehicle" });
    const pDwarf = job({ kind: "pump", restrictedTo: "Dwarf" });
    const pVehicle = job({ kind: "pump", restrictedTo: "Vehicle" });
    const pairs = bestPairing([g0, g1], [pVehicle, pDwarf], agreement);
    const total = pairs.reduce((a, [g, p]) => a + agreement(g, p), 0);
    // Both pairs can agree on every limit; a greedy walk cannot reach that.
    expect(total).toBe(LIMITS.length * 2);
  });

  // THE RECTANGULAR DEFECT. With one prediction for two gold jobs, the earlier
  // version always assigned it to gold[0]. It belongs to whichever it actually
  // matches.
  it("gives a lone prediction to the gold job it matches, not the first one", () => {
    const first = job({ kind: "removal", restrictedTo: "creature", recurrence: "oneShot" });
    const second = job({ kind: "removal", restrictedTo: "artifact", recurrence: "oneShot" });
    const only = job({ kind: "removal", restrictedTo: "artifact", recurrence: "oneShot" });
    const pairs = bestPairing([first, second], [only], agreement);
    expect(pairs).toHaveLength(1);
    expect(pairs[0][0]).toBe(second);
  });

  it("pairs as many as the shorter side allows, and no more", () => {
    const g = [job({ kind: "pump" }), job({ kind: "pump" }), job({ kind: "pump" })];
    const p = [job({ kind: "pump" }), job({ kind: "pump" })];
    expect(bestPairing(g, p, agreement)).toHaveLength(2);
    expect(bestPairing(p, g, agreement)).toHaveLength(2);
  });

  it("never pairs across kinds", () => {
    const g = job({ kind: "pump" });
    const p = job({ kind: "counters" });
    expect(bestPairing([g], [p], agreement)).toEqual([]);
  });

  it("keeps each prediction to one gold job", () => {
    const g = [job({ kind: "pump" }), job({ kind: "pump" })];
    const p = [job({ kind: "pump" })];
    const pairs = bestPairing(g, p, agreement);
    expect(new Set(pairs.map(([, q]) => q)).size).toBe(pairs.length);
  });
});
