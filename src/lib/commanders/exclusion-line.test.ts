import { describe, expect, it } from "vitest";
import { planeCopy } from "../copy/commanders-plane";
import { FLOOR_PCT } from "../discovery/floor";
import { resolveExclusionLine } from "./exclusion-line";

const copy = planeCopy.exclusion;

const resolve = (over: Partial<Parameters<typeof resolveExclusionLine>[0]> = {}) =>
  resolveExclusionLine({
    colorExcluded: 0,
    colors: [],
    join: "contains",
    floorExcluded: 0,
    unmeasured: 0,
    bestPct: null,
    sort: "new",
    ...over,
  });

describe("resolveExclusionLine", () => {
  // Missing data is omitted, never zeroed: an absence of exclusions is missing
  // data, so there is no "0 excluded" and no reserved height.
  it("renders nothing when nothing was excluded", () => {
    expect(resolve()).toBeNull();
  });

  it("says nothing about a floor the fit sort never applied", () => {
    expect(resolve({ floorExcluded: 1047, unmeasured: 212, sort: "fit" })).toBeNull();
  });

  it("puts the colour clause first, whichever group is larger", () => {
    const out = resolve({
      colorExcluded: 12,
      colors: ["G", "B"],
      floorExcluded: 1047,
      unmeasured: 212,
    });
    expect(out?.text).toBe(
      copy.join2(copy.colors(12, ["G", "B"]), copy.floorWithUnmeasured(1047, 212, FLOOR_PCT)),
    );
    expect(out?.figures).toEqual([12, 1047, 212]);
  });

  it("names the mode rather than the pips when the mode is exact", () => {
    const out = resolve({ colorExcluded: 3265, colors: ["G", "B"], join: "exactly" });
    expect(out?.text).toBe(copy.join(3265, ["G", "B"]));
  });

  // The sort's two populations are one tier, so they share one clause and the
  // colour clause keeps the other. Never three.
  it("keeps to two clauses when both the filter and the sort excluded", () => {
    const out = resolve({
      colorExcluded: 12,
      colors: ["G"],
      floorExcluded: 1047,
      unmeasured: 212,
    });
    expect(out?.text.split(" · ")).toHaveLength(2);
  });

  // The nearest miss is a second sentence, not a third clause, so it survives
  // the cap — but only where there is room to read it.
  it("adds the nearest miss only when the sort is the sole exclusion", () => {
    expect(resolve({ floorExcluded: 3089, unmeasured: 212, bestPct: 22 })?.text).toBe(
      copy.floorAloneWithUnmeasured(3089, 212, FLOOR_PCT, 22),
    );
    expect(resolve({ floorExcluded: 3089, bestPct: 22 })?.text).toBe(
      copy.floorAlone(3089, FLOOR_PCT, 22),
    );
    const withColour = resolve({
      colorExcluded: 12,
      colors: ["G"],
      floorExcluded: 3089,
      bestPct: 22,
    });
    expect(withColour?.text).not.toContain("closest");
  });

  // No measured row means no miss to name, and the clause is dropped rather
  // than filled with a figure the server did not produce.
  it("drops the nearest miss when there is none", () => {
    expect(resolve({ floorExcluded: 3089, bestPct: null })?.text).toBe(
      copy.floor(3089, FLOOR_PCT),
    );
  });

  it("carries the unmeasurable alone when the floor took nobody", () => {
    const out = resolve({ unmeasured: 212 });
    expect(out?.text).toBe(copy.unmeasuredAlone(212));
    expect(out?.figures).toEqual([212]);
  });

  // The pips are lit but every match survived them: the line is about what was
  // removed, and nothing was.
  it("drops the colour clause when the filter excluded nobody", () => {
    expect(resolve({ colorExcluded: 0, colors: ["G"], unmeasured: 212 })?.text).toBe(
      copy.unmeasuredAlone(212),
    );
  });
});
