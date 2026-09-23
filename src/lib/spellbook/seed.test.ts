import { describe, expect, it } from "vitest";

import { FLOORS, classifierCollapse, fieldCollapse, fieldPopulation } from "./seed";

type Row = Parameters<typeof fieldPopulation>[0][number];

const row = (o: Partial<Row> = {}): Row => ({
  steps: "Do the thing.",
  manaValueNeeded: 0,
  manaNeeded: null,
  notablePrerequisites: null,
  ...o,
});

describe("fieldPopulation", () => {
  it("counts over the kept rows, and reports each field's share", () => {
    const f = fieldPopulation([
      row({ manaNeeded: "{2}", manaValueNeeded: 2, notablePrerequisites: "Five creatures." }),
      row(),
      row({ steps: null }),
      row({ manaValueNeeded: null }),
    ]);
    expect(f.kept).toBe(4);
    expect(f.withSteps).toBe(3);
    expect(f.withManaValue).toBe(3);
    expect(f.withManaPips).toBe(1);
    expect(f.withPrerequisites).toBe(1);
    expect(f.stepsShare).toBe(0.75);
    expect(f.manaValueShare).toBe(0.75);
  });

  // A zero mana value is a populated field — the combo is free — so it must count toward the
  // share. Testing it with `filter(v => v.manaValueNeeded)` would read 59% of the real feed as
  // unpopulated and refuse every healthy ingest.
  it("counts a zero mana value as present, because zero is an answer", () => {
    const f = fieldPopulation([row({ manaValueNeeded: 0 }), row({ manaValueNeeded: 0 })]);
    expect(f.withManaValue).toBe(2);
    expect(f.manaValueShare).toBe(1);
  });

  it("reports zero shares for an empty ingest rather than dividing by zero", () => {
    const f = fieldPopulation([]);
    expect(f.kept).toBe(0);
    expect(f.stepsShare).toBe(0);
    expect(f.manaValueShare).toBe(0);
  });
});

describe("fieldCollapse", () => {
  it("passes a healthy population", () => {
    expect(fieldCollapse(fieldPopulation([row(), row(), row()]), FLOORS)).toEqual([]);
  });

  // The failure this exists for: upstream keeps sending well-formed variants and stops
  // populating the steps. Every floor above it passes — the records survive the transform, the
  // publish succeeds, the job is green — and every combo modal in the app is empty.
  it("names the steps when they collapse", () => {
    const rows = [row(), ...Array.from({ length: 9 }, () => row({ steps: null }))];
    const below = fieldCollapse(fieldPopulation(rows), FLOORS);
    expect(below).toHaveLength(1);
    expect(below[0]).toContain("steps");
    expect(below[0]).toContain(String(FLOORS.stepsShare));
  });

  it("names the mana value when it collapses", () => {
    const rows = [row(), ...Array.from({ length: 9 }, () => row({ manaValueNeeded: null }))];
    const below = fieldCollapse(fieldPopulation(rows), FLOORS);
    expect(below).toHaveLength(1);
    expect(below[0]).toContain("mana value");
  });

  it("names both when both collapse", () => {
    const rows = Array.from({ length: 10 }, () => row({ steps: null, manaValueNeeded: null }));
    expect(fieldCollapse(fieldPopulation(rows), FLOORS)).toHaveLength(2);
  });

  // An empty ingest breaches every share floor at once, but the cause is not a field
  // collapse — `variantsKept` owns that case and its message is the one an operator needs.
  // Reporting here as well would name the wrong cause twice.
  it("says nothing about an empty ingest, which variantsKept owns", () => {
    expect(fieldCollapse(fieldPopulation([]), FLOORS)).toEqual([]);
  });

  // `manaNeeded` is 41% on the real feed and that is a fact about combos rather than about the
  // feed, so no floor may be placed on it — one would refuse every healthy ingest.
  it("does not floor the mana pips, whose absence is the common case", () => {
    const rows = Array.from({ length: 10 }, () => row({ manaNeeded: null }));
    expect(fieldCollapse(fieldPopulation(rows), FLOORS)).toEqual([]);
  });
});

describe("classifierCollapse", () => {
  // The first real run with the tutor column, on local-dev 2026-09-22.
  const healthy = { mldSweep: 106, mldRule: 40, etSweep: 53, etRule: 52, tutorRule: 410 };

  it("publishes a run clearing every classifier floor", () => {
    expect(classifierCollapse(healthy, 1, FLOORS)).toEqual([]);
  });

  // One case per floor, each naming that floor alone. A floor whose check is deleted fails
  // exactly its own case — which is the property "every floor is asserted" needs.
  it.each([
    ["mldSweep", "mld sweep", FLOORS.mldFromSweep],
    ["mldRule", "mld rule", FLOORS.mldFromRule],
    ["etSweep", "extra-turn sweep", FLOORS.extraTurnFromSweep],
    ["etRule", "extra-turn rule", FLOORS.extraTurnFromRule],
    // The tutor floor: a tutor rule that silently stopped matching must refuse the publish, or
    // every tutor mark in the app goes dark behind a green job.
    ["tutorRule", "tutor rule", FLOORS.tutorFromRule],
  ] as const)("refuses a run whose %s collapsed, naming that floor alone", (key, words, floor) => {
    const below = classifierCollapse({ ...healthy, [key]: 0 }, 1, FLOORS);
    expect(below).toEqual([`${words} 0 < ${floor}`]);
  });

  it("refuses a run whose sweep resolved too little of what it returned", () => {
    const below = classifierCollapse(healthy, 0.1, FLOORS);
    expect(below).toEqual([`resolution share 0.100 < ${FLOORS.sweepResolutionShare}`]);
  });
});

