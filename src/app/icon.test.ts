import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CROWNED99_SPECS } from "../components/marks";
import { crownBox } from "../components/ui/crown";
import { parseThemeBlocks } from "../lib/theme/parse-css";
import { DEFAULT_THEME } from "../lib/theme/themes";

/**
 * `icon.svg` is generated, not hand-drawn, and it is the one copy of the mark
 * that no component renders — so nothing else in the app would notice if the
 * crown's proportions moved underneath it. `crown.tsx` exists to stop the
 * wordmark and the standalone crown drifting apart; this does the same job for
 * the file a browser tab draws.
 *
 * The check is deliberately about proportion rather than absolute pixels: the
 * icon scales the rail-62 lockup onto a 64-unit plate, and that scale is
 * recovered from the drawing rather than restated here. What must not change
 * silently is the shape — three diamonds in the arrangement `rail-62` declares,
 * and a numeral of two glyphs under them. The arrangement is read out of that
 * spec rather than copied, so moving the rail mark's diamonds fails here.
 */
const RAIL = CROWNED99_SPECS["rail-62"];
const GEOMETRY = {
  small: RAIL.smallDiamond,
  large: RAIL.largeDiamond,
  gap: RAIL.gap,
} as const;

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const HERE = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(HERE, "icon.svg"), "utf8");

// The icon is the one drawing in the app that cannot reference a custom
// property, so its three colours are literals — and literals are exactly what
// goes stale when a token moves. Reading them back out of globals.css is what
// keeps the tab's mark wearing the default theme rather than a past one.
const tokens = parseThemeBlocks(readFileSync(join(HERE, "globals.css"), "utf8")).get(DEFAULT_THEME);

function token(name: string): string {
  const value = tokens?.get(name);
  if (!value) throw new Error(`globals.css no longer declares --${name} on the default theme`);
  return value;
}

function attr(tag: string, name: string): number {
  const match = new RegExp(`${name}="(-?[\\d.]+)"`).exec(tag);
  if (!match) throw new Error(`no ${name} on ${tag}`);
  return Number(match[1]);
}

describe("icon.svg", () => {
  const rects = svg.match(/<rect[^>]*rotate\(45[^>]*>/g) ?? [];

  it("draws the crown as three diamonds", () => {
    expect(rects).toHaveLength(3);
  });

  it("keeps the crown's proportions and spacing", () => {
    const sides = rects.map((r) => attr(r, "width"));
    // Squares: a diamond that stopped being square would read as a lozenge.
    for (const rect of rects) expect(attr(rect, "height")).toBeCloseTo(attr(rect, "width"), 3);

    // Two decimals throughout, because the drawing rounds its coordinates to three
    // and every figure here is derived from more than one of them.
    const scale = sides[1] / GEOMETRY.large;
    expect(sides[0]).toBeCloseTo(GEOMETRY.small * scale, 2);
    expect(sides[2]).toBeCloseTo(GEOMETRY.small * scale, 2);

    // Centres come from the diagonals, exactly as `CrownDiamonds` lays them out.
    const box = crownBox(GEOMETRY);
    const drawn = rects.map((r, i) => attr(r, "x") + sides[i] / 2);
    const left = drawn[0] - box.centers[0] * scale;
    for (const [i, centre] of box.centers.entries()) {
      expect(drawn[i]).toBeCloseTo(left + centre * scale, 2);
    }

    // All three sit on one horizontal, which is what makes it a row.
    const cys = rects.map((r, i) => attr(r, "y") + sides[i] / 2);
    expect(cys[1]).toBeCloseTo(cys[0], 2);
    expect(cys[2]).toBeCloseTo(cys[0], 2);
  });

  it("sets the numeral as two outlined glyphs under the crown", () => {
    const paths = svg.match(/<path[^>]*>/g) ?? [];
    expect(paths).toHaveLength(2);

    const crownBottom = Math.max(...rects.map((r) => {
      const side = attr(r, "width");
      // A 45°-rotated square reaches half its diagonal below its centre.
      return attr(r, "y") + side / 2 + (side * Math.SQRT2) / 2;
    }));
    for (const path of paths) {
      const baseline = Number(/translate\([\d.-]+ ([\d.-]+)\)/.exec(path)?.[1]);
      expect(baseline).toBeGreaterThan(crownBottom);
    }
  });

  it("wears the default theme, on an opaque plate", () => {
    // Opaque, because a transparent favicon inherits the browser's chrome and
    // the numeral is bone: on a light tab strip it would disappear.
    expect(svg).toContain(`<rect width="64" height="64" fill="${token("bg")}"/>`);
    // The crown takes the accent and the numeral the foreground, the same
    // division `Crowned99` draws.
    const crowns = svg.match(/<rect[^>]*rotate\(45[^>]*>/g) ?? [];
    for (const crown of crowns) expect(crown).toContain(`fill="${token("accent")}"`);
    for (const glyph of svg.match(/<path[^>]*>/g) ?? []) {
      expect(glyph).toContain(`fill="${token("fg")}"`);
    }
  });
});
