import { describe, expect, it } from "vitest";

import { FIELD_VALUES, fieldBars, jobBars, restrictionPair, stops, VOCABULARY_KEYS } from "./card-labels-bars.mjs";

const perfect = Object.fromEntries(VOCABULARY_KEYS.map((k) => [k, { tp: 10, fp: 0, fn: 0 }]));

describe("the per-job bars", () => {
  it("pass when every job is measured and over its bar", () => {
    expect(stops(jobBars(perfect))).toEqual([]);
  });

  it("hold tutor to 0.9 where every other job is held to 0.8", () => {
    const at085 = { tp: 85, fp: 15, fn: 15 };
    expect(stops(jobBars({ ...perfect, "role:tutor": at085 }))).toEqual([
      "role:tutor: precision 0.85 recall 0.85 under 0.9 (100 cases)",
    ]);
    expect(stops(jobBars({ ...perfect, "theme:fog": at085 }))).toEqual([]);
  });

  it("fail a job the gold set never scores, rather than passing it as unmeasurable", () => {
    const rest = Object.fromEntries(Object.entries(perfect).filter(([k]) => k !== "theme:goad"));
    expect(stops(jobBars(rest))).toEqual(["theme:goad: no gold cases, so unmeasured"]);
  });

  it("judge the unrounded ratio: 0.8996 is under a 0.9 bar though it prints as 0.9", () => {
    const [b] = jobBars({ "role:tutor": { tp: 8996, fp: 0, fn: 1004 } }).filter((x) => x.key === "role:tutor");
    expect(b.recall).toBe(0.9);
    expect(b.pass).toBe(false);
  });

  it("fail on precision alone: a model that labels everything a tutor finds every tutor", () => {
    expect(stops(jobBars({ ...perfect, "role:tutor": { tp: 10, fp: 10, fn: 0 } }))[0]).toMatch(/^role:tutor: precision 0.5 recall 1/);
  });
});

describe("the per-field bars", () => {
  const every = (values: readonly string[]) => values.flatMap((v) => Array.from({ length: 10 }, () => [v, v] as [string, string]));
  const clean = Object.fromEntries(
    Object.entries(FIELD_VALUES).map(([f, values]) => [f, every(values)]),
  ) as Record<keyof typeof FIELD_VALUES, [string, string][]>;

  it("pass when every value is measured and right", () => {
    expect(stops(fieldBars(clean))).toEqual([]);
  });

  it("charge a wrong value to both sides: a miss for the gold value, a false positive for the predicted one", () => {
    const wrong = { ...clean, affects: [...clean.affects, ["self", "each"] as [string, string], ["self", "each"] as [string, string]] };
    expect(stops(fieldBars(wrong))).toEqual([
      "affects=self: precision 1 recall 0.833 under 0.9 (12 cases)",
      "affects=each: precision 0.833 recall 1 under 0.9 (10 cases)",
    ]);
  });

  it("hold affects to 0.9 and to/method to 0.8", () => {
    const miss = (values: [string, string][], g: string, p: string) => [...values, [g, p] as [string, string], [g, p] as [string, string]];
    expect(stops(fieldBars({ ...clean, to: miss(clean.to, "hand", "top") }))).toEqual([]);
    expect(stops(fieldBars({ ...clean, affects: miss(clean.affects, "self", "each") })).length).toBe(2);
  });

  it("bar every ramp kind, so a kind confused for another is caught though `ramp` itself matched", () => {
    const confused = [...clean.rampKind, ...Array.from({ length: 4 }, () => ["multiplies", "tapsForMana"] as [string, string])];
    expect(stops(fieldBars({ ...clean, rampKind: confused }))).toEqual([
      "rampKind=tapsForMana: precision 0.714 recall 1 under 0.8 (10 cases)",
      "rampKind=multiplies: precision 1 recall 0.714 under 0.8 (14 cases)",
    ]);
  });

  it("bar a restriction as present and right, compared without case as the matcher compares it", () => {
    expect(restrictionPair("artifact", "Artifact")).toEqual(["restricted", "restricted"]);
    expect(restrictionPair("Knight", "Elf")).toEqual(["restricted", "other"]);
    expect(restrictionPair("Goblin", "goblin")).toEqual(["restricted", "other"]);
    expect(restrictionPair("Dwarf or Vehicle", "Dwarf or Vehicle")).toEqual(["restricted", "restricted"]);
    expect(restrictionPair("none", "Elf")).toEqual(["none", "restricted"]);
    expect(restrictionPair("Knight", "none")).toEqual(["restricted", "none"]);
    const wrong = Array.from({ length: 4 }, () => restrictionPair("Knight", "Elf"));
    expect(stops(fieldBars({ ...clean, restrictedTo: [...clean.restrictedTo, ...wrong] }))).toEqual([
      "restrictedTo=restricted: precision 1 recall 0.714 under 0.8 (14 cases)",
    ]);
  });

  it("fail a value with no gold cases", () => {
    expect(stops(fieldBars({ ...clean, method: every(FIELD_VALUES.method.filter((v) => v !== "shrink")) }))).toEqual([
      "method=shrink: no gold cases, so unmeasured",
    ]);
  });
});
