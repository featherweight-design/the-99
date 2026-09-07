import { describe, expect, it } from "vitest";
import { discoveryCopy } from "./commander-discovery";

describe("discoveryCopy", () => {
  it("locale-formats four-digit counts", () => {
    expect(discoveryCopy.scope.subtitlePlay(3334, 2805, "fit")).toContain("3,334");
    expect(discoveryCopy.scope.subtitlePlay(3334, 2805, "fit")).toContain("2,805");
  });

  it("names the sort in the play subtitle", () => {
    expect(discoveryCopy.scope.subtitlePlay(10, 10, "new")).toContain("new to you");
    expect(discoveryCopy.scope.subtitlePlay(10, 10, "fit")).toContain("best fit");
  });

  // Pins the class, not one string: every count-taking function must format, so a new one added
  // without `n()` fails here rather than shipping a bare "1234" on a four-digit surface.
  it("locale-formats every count, everywhere", () => {
    const counts: ((...a: never[]) => string)[] = [
      discoveryCopy.justify.overlap, discoveryCopy.justify.overlapShort,
      discoveryCopy.justify.figureUnitFit, discoveryCopy.justify.distanceAria,
      discoveryCopy.justify.figureUnitNew, discoveryCopy.empty.floorCtaNote,
      discoveryCopy.window.revealBand,
    ];
    for (const fn of counts) {
      const out = (fn as (...a: number[]) => string)(1234, 5678, 9012);
      expect(out, fn.toString()).not.toMatch(/\d{4}/);
    }
    expect(discoveryCopy.justify.tagList(["Aristocrats"], 1234)).not.toMatch(/\d{4}/);
    expect(discoveryCopy.empty.filteredBody("Azorius", 1234)).not.toMatch(/\d{4}/);
    expect(discoveryCopy.empty.filteredBuiltClause(1234, 5678, "Azorius")).not.toMatch(/\d{4}/);
    expect(discoveryCopy.scope.announce("play", 1234, "new")).not.toMatch(/\d{4}/);
    expect(discoveryCopy.sort.announce("new", 1234)).not.toMatch(/\d{4}/);
  });

  it("leaves percentages unseparated", () => {
    expect(discoveryCopy.justify.floorNote(30)).toContain("30%");
    const floor = discoveryCopy.empty.floorBody(30, 1234, 5678, 29);
    expect(floor).toContain("30%");
    expect(floor).toContain("29%");
    // The same string carries both kinds of number, so it is the one place the two rules can be
    // seen not to contradict: its counts separate, its percentages do not.
    expect(floor).toContain("1,234");
    expect(floor).toContain("5,678");
  });

  it("prints a denominator with every figure", () => {
    expect(discoveryCopy.justify.overlap(12, 99)).toMatch(/12.*99/);
  });

  it("never says buy", () => {
    const all = JSON.stringify(discoveryCopy, (_k, v) =>
      typeof v === "function" ? (v.length === 0 ? v() : String(v)) : v,
    );
    expect(all.toLowerCase()).not.toMatch(/\bbuy\b/);
  });
});
