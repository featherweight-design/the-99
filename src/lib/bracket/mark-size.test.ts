import { describe, expect, it } from "vitest";

import { markArt, markAsset, markForm } from "./mark-size";
import type { Bracket } from "./types";

const ALL: Bracket[] = [1, 2, 3, 4, 5];

describe("markForm", () => {
  // THE THREE SHIP SIZES `ASSETS.md` NAMES, each landing where it says.
  it("draws the full mark at 26, 36 and 44", () => {
    for (const px of [26, 36, 44]) expect(markForm(px)).toBe("full");
  });

  it("draws the chip at 22", () => {
    expect(markForm(22)).toBe("chip");
  });

  // BELOW 20 THE NUMERAL TAKES OVER, and no file is used. At 22 the chip's own numeral renders
  // at ~9px and is not legible, so the silhouette carries the rank — below 20 it stops carrying
  // it too, and a glyph nobody can read is not a signal.
  it("draws the numeral alone below 20", () => {
    for (const px of [19, 16, 12, 1]) expect(markForm(px)).toBe("numeral");
  });

  // THE BOUNDARIES THEMSELVES, because an off-by-one here is invisible: every size still draws
  // something, just the wrong something.
  it("puts 20 on the chip and 25 on the chip, 26 on the full mark", () => {
    expect(markForm(20)).toBe("chip");
    expect(markForm(25)).toBe("chip");
    expect(markForm(26)).toBe("full");
  });
});

describe("markAsset", () => {
  it("resolves the full mark for every rank", () => {
    expect(markAsset(1, 36)).toBe("/brackets/bracket-1-exhibition.svg");
    expect(markAsset(5, 44)).toBe("/brackets/bracket-5-cedh.svg");
  });

  it("resolves the chip form for every rank", () => {
    expect(markAsset(2, 22)).toBe("/brackets/bracket-2-core-chip.svg");
    expect(markAsset(4, 22)).toBe("/brackets/bracket-4-optimized-chip.svg");
  });

  // NO FILE BELOW THE FLOOR. Returning a path there would have a component fetch art it must
  // not draw — and a 404 on it looks identical to a working build, which is the failure
  // `fetch:mana` records.
  it("resolves no file below 20", () => {
    for (const b of ALL) expect(markAsset(b, 16)).toBeNull();
  });

  // Every rank resolves at every drawn size, and each to its OWN file — a table with a repeated
  // slug would draw one rank's mark for another and pass any test that only checked non-null.
  it("gives every rank its own file at every drawn size", () => {
    for (const px of [22, 26, 36, 44]) {
      const paths = ALL.map((b) => markAsset(b, px));
      expect(new Set(paths).size).toBe(ALL.length);
      expect(paths.every((p) => p !== null)).toBe(true);
    }
  });
});

describe("markArt", () => {
  it("names the stylesheet rule a mark draws from: the asset's file name, or null below 20px", () => {
    expect(markArt(1, 36)).toBe("bracket-1-exhibition");
    expect(markArt(2, 22)).toBe("bracket-2-core-chip");
    expect(markArt(5, 16)).toBeNull();
  });
});
