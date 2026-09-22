import { describe, it, expect } from "vitest";
import { bulkConcession } from "./bulk-concession";
import { topOffCopy } from "../copy/top-off";
import type { FillShortfall } from "./fill";

const t = (type: string, short: number): FillShortfall =>
  ({ kind: "type", type, short } as FillShortfall);
const role = (r: string, short: number): FillShortfall =>
  ({ kind: "role", role: r, short } as FillShortfall);

describe("bulkConcession", () => {
  // NIL IS A SENTENCE. The player pressed nothing yet; they came to find out whether the
  // cheap option costs anything, and `no` is the answer rather than the absence of one. An
  // empty slot beside one control and a figure beside the other reads as a missing figure.
  it("states the nil rather than leaving the slot empty", () => {
    expect(bulkConcession({ shortfalls: [], measured: true })).toBe(topOffCopy.bulk.gapNone);
  });

  // AN UNMEASURABLE MIX SAYS SO, and this is the case the empty list cannot be trusted for:
  // with no composition there is nothing to be short OF, so `shortfalls` is empty for the
  // opposite reason. `matches every recommendation` there would be the strongest possible
  // claim made from no data.
  it("does not read an empty list as a match when nothing was measured", () => {
    expect(bulkConcession({ shortfalls: [], measured: false })).toBe(
      topOffCopy.bulk.gapUnmeasured,
    );
    expect(bulkConcession({ shortfalls: [t("creature", 4)], measured: false })).toBe(
      topOffCopy.bulk.gapUnmeasured,
    );
  });

  it("prints one axis as itself and two as a pair", () => {
    expect(bulkConcession({ shortfalls: [t("creature", 2)], measured: true })).toBe(
      "2 creatures short of recommendations",
    );
    expect(
      bulkConcession({ shortfalls: [t("creature", 9), t("instant", 4)], measured: true }),
    ).toBe("9 creatures and 4 instants short of recommendations");
  });

  // THE NOUN AGREES WITH ITS COUNT. `1 creatures short` is the kind of thing that reads as a
  // machine talking, on a surface whose whole register is a person telling you what a choice
  // costs.
  it("singularises the noun at one", () => {
    expect(bulkConcession({ shortfalls: [t("creature", 1)], measured: true })).toBe(
      "1 creature short of recommendations",
    );
    expect(bulkConcession({ shortfalls: [t("sorcery", 1)], measured: true })).toBe(
      "1 sorcery short of recommendations",
    );
    // The plural that is not an -s.
    expect(bulkConcession({ shortfalls: [t("sorcery", 3)], measured: true })).toBe(
      "3 sorceries short of recommendations",
    );
  });

  // THREE OR MORE COLLAPSE, and the survivor is the WORST rather than the first: a line
  // naming five types is a table with no headings, and the worst gap is what decides whether
  // the concession is acceptable at all.
  it("collapses three or more to a count and the worst axis", () => {
    const line = bulkConcession({
      // Same trap as the pair above: the worst axis is deliberately one that sorts LATE in
      // the reporting order, so `creatures worst` cannot come out of the tie-break by luck.
      shortfalls: [t("creature", 2), t("instant", 8), t("artifact", 5)],
      measured: true,
    });
    expect(line).toBe("short on 3 types · instants worst at 8");
  });

  // ORDER IS BY MAGNITUDE, not by arrival. `planFill` emits its type shortfalls in the
  // composition's own key order, so a pair printed as it arrived would name a 1-card gap
  // before a 9-card one and read as though the small one mattered more.
  it("names the larger gap first in a pair, whatever order it arrived in", () => {
    // The axes are chosen so MAGNITUDE and the reporting order DISAGREE: `creature` precedes
    // `instant` in `TYPE_ORDER`, so a build that dropped the magnitude sort and fell through
    // to the tie-break alone would still print `creatures` first and pass a case where the
    // creature gap happened to be the larger one. It did, and this is that case corrected.
    expect(
      bulkConcession({ shortfalls: [t("creature", 1), t("instant", 9)], measured: true }),
    ).toBe("9 instants and 1 creature short of recommendations");
  });

  // A DETERMINISTIC TIE-BREAK. Two axes short by the same amount must print in the same
  // sequence every time, or the note changes between two reads of a deck that did not move.
  it("breaks a tie on the reporting order, both ways round", () => {
    const expected = "3 creatures and 3 instants short of recommendations";
    expect(
      bulkConcession({ shortfalls: [t("creature", 3), t("instant", 3)], measured: true }),
    ).toBe(expected);
    expect(
      bulkConcession({ shortfalls: [t("instant", 3), t("creature", 3)], measured: true }),
    ).toBe(expected);
  });

  // ROLES ARE NOT TYPES. `planFill` reports both in one list; this note is about the ten type
  // axes, and a role leaking in would make the count in `short on N types` a lie about what
  // it counted.
  it("ignores role shortfalls entirely", () => {
    expect(
      bulkConcession({ shortfalls: [role("ramp", 4), role("draw", 2)], measured: true }),
    ).toBe(topOffCopy.bulk.gapNone);
    expect(
      bulkConcession({
        shortfalls: [role("ramp", 9), t("creature", 2)],
        measured: true,
      }),
    ).toBe("2 creatures short of recommendations");
  });

  // b3. The clause is APPENDED to whichever gap applies rather than replacing it — the
  // survivor still has to say what it concedes on shape, and `nothing to buy` is why the
  // other control is gone.
  it("appends the nothing-to-buy clause to whatever the gap was", () => {
    expect(
      bulkConcession({ shortfalls: [], measured: true, nothingToBuy: true }),
    ).toBe("matches every recommendation · nothing to buy");
    expect(
      bulkConcession({ shortfalls: [t("creature", 2)], measured: true, nothingToBuy: true }),
    ).toBe("2 creatures short of recommendations · nothing to buy");
    expect(
      bulkConcession({ shortfalls: [], measured: false, nothingToBuy: true }),
    ).toBe("no recommendation for this commander · nothing to buy");
  });
});
