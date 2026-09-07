import { describe, expect, it } from "vitest";
import { discoveryCopy } from "./commander-discovery";
import { planeCopy } from "./commanders-plane";

describe("planeCopy", () => {
  // Pins the class, not one string: every count-taking function must format, so a new one added
  // without `n()` fails here rather than shipping a bare "1234" on a four-digit surface.
  it("locale-formats every count, everywhere", () => {
    const counts: ((...a: never[]) => string)[] = [
      planeCopy.search.heldAside, planeCopy.search.noneBody, planeCopy.search.noneEmphasis,
      planeCopy.excluded.heldPool, planeCopy.exclusion.unmeasuredAlone, planeCopy.overflow.more,
    ];
    for (const fn of counts) {
      const out = (fn as (...a: number[]) => string)(1234, 5678, 9012);
      expect(out, fn.toString()).not.toMatch(/\d{4}/);
    }
    expect(planeCopy.join.exactNote(1234, 5678, ["W"])).not.toMatch(/\d{4}/);
    expect(planeCopy.join.exactNoteShort(1234, 5678, ["W"])).not.toMatch(/\d{4}/);
    expect(planeCopy.join.announce("exactly", 1234, ["W"])).not.toMatch(/\d{4}/);
    expect(planeCopy.search.announce(1234, 5678)).not.toMatch(/\d{4}/);
    expect(planeCopy.search.asideMore(1234, "the colour filter")).not.toMatch(/\d{4}/);
    expect(planeCopy.excluded.pool("Zur", 1234)).not.toMatch(/\d{4}/);
    expect(planeCopy.excluded.poolAlso("Zur", 1234)).not.toMatch(/\d{4}/);
    expect(planeCopy.exclusion.colors(1234, ["W"])).not.toMatch(/\d{4}/);
    expect(planeCopy.exclusion.join(1234, ["W"])).not.toMatch(/\d{4}/);
    expect(planeCopy.overflow.moreAria(1234, "Zur")).not.toMatch(/\d{4}/);
  });

  // The floor strings carry both kinds of number, so they are where the two rules can be seen
  // not to contradict: counts separate, percentages do not.
  it("separates counts and leaves percentages alone in the same string", () => {
    const line = planeCopy.exclusion.floorAloneWithUnmeasured(1234, 5678, 30, 29);
    expect(line).toContain("1,234");
    expect(line).toContain("5,678");
    expect(line).toContain("30%");
    expect(line).toContain("29%");
    expect(line).not.toContain("3,0%");
  });

  // Every string that claims the floor prints the threshold. A row that says it cleared a bar
  // without naming the bar is a figure without its denominator.
  it("prints the threshold at every site that claims the floor", () => {
    expect(discoveryCopy.justify.floorNote(30, 41)).toContain("30%");
    expect(discoveryCopy.justify.floorNoteShort(30, 41)).toContain("30%");
    expect(planeCopy.exclusion.floor(12, 30)).toContain("30%");
    expect(planeCopy.exclusion.floorWithUnmeasured(12, 3, 30)).toContain("30%");
    expect(planeCopy.exclusion.floorAlone(12, 30, 29)).toContain("30%");
    expect(planeCopy.exclusion.floorAloneWithUnmeasured(12, 3, 30, 29)).toContain("30%");
    expect(planeCopy.excluded.floor("Zur", 21, 30)).toContain("30%");
    expect(planeCopy.excluded.floorAlso("Zur", 21, 30)).toContain("30%");
    expect(planeCopy.excluded.heldFloor(21, 30)).toContain("30%");
    expect(planeCopy.floorPool.body(30, 12, 3, 20, 1190, 4)).toContain("30%");
    expect(planeCopy.floorPool.emphasis(30)).toContain("30%");
    // The seventh site is the collection-variant FloorEmpty, which lives in `discoveryCopy`.
    expect(discoveryCopy.empty.floorBody(30, 20, 2805, 29)).toContain("30%");
  });

  // The mark has to be a substring of the sentence it marks, or the emphasis renders as a
  // second author's fragment spliced into the body.
  it("keeps every emphasis a substring of its own body", () => {
    expect(planeCopy.floorPool.body(30, 12, 3, 20, 1190, 4)).toContain(
      planeCopy.floorPool.emphasis(30),
    );
    expect(planeCopy.search.noneBody(3326)).toContain(planeCopy.search.noneEmphasis(3326));
  });

  // The pool-variant empty state's premise is that nothing cleared. A body whose two populations
  // do not sum to the candidate count reads as rows that cleared after all.
  it("accounts for the whole candidate count in the pool empty state", () => {
    expect(planeCopy.floorPool.body(30, 3301, 25, 3326, 1190, 4)).toContain("3,301 of the 3,326");
    expect(planeCopy.floorPool.body(30, 3301, 25, 3326, 1190, 4)).toContain("25 have no tags");
  });

  // "AND" is the word the reported confusion is about and "OR" is a mode the plane does not
  // offer. The modes are described as matches, never as operators.
  it("never describes the colour modes as boolean operators", () => {
    const join = JSON.stringify(planeCopy.join, (_k, v) =>
      typeof v === "function" ? String(v) : v,
    );
    expect(join).not.toMatch(/\bAND\b|\bOR\b/);
  });

  it("never says buy", () => {
    const all = JSON.stringify(planeCopy, (_k, v) =>
      typeof v === "function" ? (v.length === 0 ? v() : String(v)) : v,
    );
    expect(all.toLowerCase()).not.toMatch(/\bbuy\b/);
  });

  // Pins the class the same way the count test does: a colour identity reaching prose must be
  // named. The codes are the pip row's alphabet, and a sentence that prints "U and B" is one
  // that leaked the storage format onto the screen.
  it("names colours rather than printing their codes", () => {
    const two = ["U", "B"];
    const sentences = [
      planeCopy.join.exactNote(12, 34, two), planeCopy.join.exactNoteShort(12, 34, two),
      planeCopy.join.announce("exactly", 12, two), planeCopy.join.announce("contains", 12, two),
      planeCopy.excluded.heldColors(two, ["R"]), planeCopy.excluded.heldJoin(two, ["R"]),
      planeCopy.excluded.colors("Zur", two, ["R"]), planeCopy.excluded.colorsAlso("Zur", two, ["R"]),
      planeCopy.excluded.join("Zur", two, ["R"]), planeCopy.excluded.joinAlso("Zur", two, ["R"]),
      planeCopy.excluded.control.colors(two), planeCopy.excluded.control.join(two),
      planeCopy.exclusion.colors(12, two), planeCopy.exclusion.join(12, two),
    ];
    for (const line of sentences) {
      expect(line).toContain("Blue and Black");
      expect(line, line).not.toMatch(/\bU\b|\bB\b|\bU · B\b/);
    }
  });

  // The in-field count was dropped: `filter-bar.tsx` already prints `{filtered}/{active}`, and
  // the match figure appears once. A `count` key reappearing here means it got printed twice.
  it("ships no in-field search count", () => {
    expect(planeCopy.search).not.toHaveProperty("count");
  });
});
