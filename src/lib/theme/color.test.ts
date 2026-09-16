import { describe, expect, it } from "vitest";
import { chroma, contrast, deltaEOk, hueGap, hueOk, parseHex, relativeLuminance } from "./color";

describe("parseHex", () => {
  it("reads a six-digit hex, case-insensitively", () => {
    expect(parseHex("#1E1A15")).toEqual([30, 26, 21]);
    expect(parseHex("#1e1a15")).toEqual([30, 26, 21]);
  });

  it("throws on anything else", () => {
    expect(() => parseHex("#FFF")).toThrow();
    expect(() => parseHex("var(--accent)")).toThrow();
  });
});

describe("relativeLuminance", () => {
  it("anchors at the sRGB extremes", () => {
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 6);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 6);
  });
});

describe("contrast", () => {
  it("is 21:1 for black on white, in either order", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 4);
    expect(contrast("#FFFFFF", "#000000")).toBeCloseTo(21, 4);
  });

  it("is 1:1 for a colour against itself", () => {
    expect(contrast("#CF8745", "#CF8745")).toBeCloseTo(1, 6);
  });

  it("reproduces the audited Low Sun fg-on-bg figure", () => {
    expect(contrast("#EDE6D8", "#14110E")).toBeCloseTo(15.15, 1);
  });
});

describe("chroma", () => {
  it("is zero for neutrals", () => {
    expect(chroma("#FFFFFF")).toBeCloseTo(0, 6);
    expect(chroma("#808080")).toBeCloseTo(0, 6);
  });

  it("reproduces the audited Low Sun accent chroma", () => {
    expect(chroma("#CF8745")).toBeCloseTo(0.1203, 3);
  });
});

describe("deltaEOk", () => {
  it("is zero for a colour against itself", () => {
    expect(deltaEOk("#6FA368", "#6FA368")).toBeCloseTo(0, 6);
  });

  // The pair that came closest to colliding: the shipped warning against the
  // accent §8 replaces accent with. Below the 0.05 floor, which is the whole
  // reason --warning moves in Task 7.
  //
  // Task 8's snap-hex.mjs carries its own inline copy of this maths; if these
  // two ever disagree, the helper is lying about which token is nearest.
  it("reproduces the collision that forces the warning to move", () => {
    expect(deltaEOk("#E0913C", "#CF8745")).toBeCloseTo(0.0417, 3);
    expect(deltaEOk("#E0913C", "#CF8745")).toBeLessThan(0.05);
  });

  it("separates the Low Sun warning from its accent", () => {
    expect(deltaEOk("#DEAA29", "#CF8745")).toBeCloseTo(0.1009, 3);
  });
});

describe("hueOk / hueGap", () => {
  // A known hue, so a regression in the OKLCH conversion itself is visible
  // rather than absorbed by a relative comparison.
  it("reads the hue of a known colour", () => {
    // Canopy's --g, the pip the --success override was cut away from.
    expect(hueOk("#4B7A46")).toBeCloseTo(142.0, 0);
    expect(hueOk("#5EA990")).toBeCloseTo(170.1, 0);
  });

  it("measures the gap between two hues", () => {
    expect(hueGap("#4B7A46", "#5EA990")).toBeCloseTo(28.1, 0);
  });

  // THE WRAP. `Math.abs(a - b)` alone reports 350° for a pair 10° apart across
  // the 0/360 seam, which would read as the safest separation in the palette
  // while being the tightest. The shortest-arc branch exists for this and
  // nothing else exercised it — the one pair under test sits at 142° and 170°,
  // nowhere near the boundary, so the branch could have been wrong and green.
  it("takes the shortest arc across the 0/360 boundary", () => {
    const near0 = "#640A2E"; // 4.22°
    const near355 = "#640A3A"; // 354.99° — 9.23° away the short way
    const a = hueOk(near0);
    const b = hueOk(near355);
    // Guard the fixture: if these drift off either side of the seam the test
    // stops measuring a wrap and silently becomes an ordinary gap.
    expect(Math.abs(a - b)).toBeGreaterThan(180);
    expect(hueGap(near0, near355)).toBeLessThan(180);
    expect(hueGap(near0, near355)).toBeCloseTo(360 - Math.abs(a - b), 6);
    // And the value itself, so a wrap that merely stays under 180 is not enough.
    expect(hueGap(near0, near355)).toBeCloseTo(9.23, 1);
  });

  it("is symmetric", () => {
    expect(hueGap("#4B7A46", "#5EA990")).toBeCloseTo(hueGap("#5EA990", "#4B7A46"), 9);
  });
});
