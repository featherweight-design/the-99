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
      discoveryCopy.empty.floorCtaNote,
      discoveryCopy.window.revealBand,
    ];
    for (const fn of counts) {
      const out = (fn as (...a: number[]) => string)(1234, 5678, 9012);
      expect(out, fn.toString()).not.toMatch(/\d{4}/);
    }
    expect(discoveryCopy.empty.filteredBody("Azorius", 1234)).not.toMatch(/\d{4}/);
    expect(discoveryCopy.empty.filteredBuiltClause(1234, 5678, "Azorius")).not.toMatch(/\d{4}/);
    expect(discoveryCopy.scope.announce("play", 1234, "new")).not.toMatch(/\d{4}/);
    expect(discoveryCopy.sort.announce("new", 1234)).not.toMatch(/\d{4}/);
  });

  it("leaves percentages unseparated", () => {
    // `justify.floorNote` carried the two-percentage case and retired with the
    // row. `empty.floorBody` still carries both kinds of number, which is what
    // makes it the one place the two rules can be seen not to contradict.
    const floor = discoveryCopy.empty.floorBody(30, 1234, 5678, 29);
    expect(floor).toContain("30%");
    expect(floor).toContain("29%");
    // The same string carries both kinds of number, so it is the one place the two rules can be
    // seen not to contradict: its counts separate, its percentages do not.
    expect(floor).toContain("1,234");
    expect(floor).toContain("5,678");
  });

  // `justify.overlap` pinned the denominator rule here and retired with the
  // row. The rule itself did not: the shared row prints Fit over
  // `measurableTotal`, and `commandersCopy.row.fitDenominator` /
  // `fitDenominatorMeasurable` are where that now lives.

  it("never says buy", () => {
    const all = JSON.stringify(discoveryCopy, (_k, v) =>
      typeof v === "function" ? (v.length === 0 ? v() : String(v)) : v,
    );
    expect(all.toLowerCase()).not.toMatch(/\bbuy\b/);
  });
});
