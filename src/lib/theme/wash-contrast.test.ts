import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrast, parseHex } from "./color";
import { parseThemeBlocks } from "./parse-css";

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app", "globals.css"),
  "utf8",
);
const THEMES = parseThemeBlocks(CSS);

// The worst case the scrim has to survive: a pure white pixel in the art.
const BRIGHTEST_ART = "#FFFFFF";

// The layer stack, as fractions, and the numbers `<ArtWash>` renders. L1 is the
// opaque base plate (`--bg`); L2 is the art; L3 is the gradient scrim, also
// `--bg`, whose alpha varies down the band. Changing either file without the
// other is the failure this test exists to catch.
const ART_ALPHA = 0.58;
const SCRIM_AT_TITLE = 0.9; // stop 1 — the label band
const SCRIM_AT_META = 0.86; // stop 4 — the bottom band, where the chip sits

const over = (fg: string, bg: string, alpha: number): string => {
  const [fr, fgreen, fb] = parseHex(fg);
  const [br, bgreen, bb] = parseHex(bg);
  const mix = (f: number, b: number) => Math.round(f * alpha + b * (1 - alpha));
  return `#${[mix(fr, br), mix(fgreen, bgreen), mix(fb, bb)]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
};

/** The plate the ink actually sits on, at a given scrim alpha. */
const washGround = (bg: string, scrimAlpha: number): string =>
  over(bg, over(BRIGHTEST_ART, bg, ART_ALPHA), scrimAlpha);

const token = (theme: string, name: string): string => {
  const value = THEMES.get(theme)?.get(name);
  if (!value) throw new Error(`${theme} has no --${name}`);
  return value;
};

describe("art wash contrast floor", () => {
  it("covers all six themes", () => {
    expect(THEMES.size).toBe(6);
  });

  for (const theme of THEMES.keys()) {
    it(`${theme}: a title clears 7:1 over the brightest possible art`, () => {
      const ground = washGround(token(theme, "bg"), SCRIM_AT_TITLE);
      expect(contrast(token(theme, "fg"), ground)).toBeGreaterThanOrEqual(7);
    });

    it(`${theme}: meta clears 4.5:1 in the lower band`, () => {
      const ground = washGround(token(theme, "bg"), SCRIM_AT_META);
      expect(contrast(token(theme, "fg-body"), ground)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
