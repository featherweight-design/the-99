import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  type Band,
  bottomScrimStops,
  COVER_ART_OPACITY,
  COVER_SCRIM_STOPS,
  PORTRAIT_BANDS,
  PORTRAIT_RATIO,
  type ScrimStops,
} from "../../components/ui/art-wash";
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
// `--bg`, whose alpha varies down the band. Imported rather than restated: a
// lift applied in one file and not the other is the failure this test exists to
// catch.
const ART_ALPHA = COVER_ART_OPACITY;

/** Read off the shipped gradient rather than restated, so a stop moving in
    `art-wash.tsx` moves the floor this test asserts. */
const alphaAt = (stops: ScrimStops, position: number): number => {
  for (let i = 1; i < stops.length; i++) {
    const [a1, p1] = stops[i];
    const [a0, p0] = stops[i - 1];
    if (position <= p1) {
      return (a0 + ((a1 - a0) * (position - p0)) / (p1 - p0)) / 100;
    }
  }
  return stops[stops.length - 1][0] / 100;
};

const TOP_AT_TITLE = alphaAt(COVER_SCRIM_STOPS.top, 0); // 0.78 — the top of the label block
/** The second stop is the bottom of the label block — the subtitle's own line,
    and the last row of ink a top-labelled band prints. Read off the ramp rather
    than written down, so moving that stop moves what this test samples; a
    hard-coded position would keep measuring where the ink used to be. Sampling
    only 0% and 100% is what let a ramp ship that fell to 3.16:1 under the
    subtitle: both ends were held while the ink between them sat in the trough. */
const TOP_AT_SUBTITLE = alphaAt(COVER_SCRIM_STOPS.top, COVER_SCRIM_STOPS.top[1][1]);

/** The two bottom-labelled surfaces, at the `labelAt` each one passes. Asserting
    a shared constant was the estimate this round removed: the floor has to hold
    at each surface's own block edge, so each surface is measured. */
const BOTTOM_SURFACES: readonly (readonly [string, number])[] = [
  ["commander detail hero", 55],
  ["deck spine, phone", 57],
];

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

/** The horizontal scrim a `left-portrait` band draws, as `alphaAt` pairs. Its
    positions are pixels rather than percentages — the portrait is a fixed column
    beside type, not a fraction of a row whose width nobody controls. */
const horizontalStops = (band: Band): ScrimStops => {
  const b = PORTRAIT_BANDS[band];
  return [
    [b.startAlpha, 0],
    [b.nearAlpha, b.nearStop],
    [b.sharpAlpha, Math.round(band * PORTRAIT_RATIO)],
    [100, b.flatStop],
  ];
};

/** The ground a `left-portrait` row's ink sits on, composed in the order
    `<ArtWash>` stacks it: the row's own ground, the ambient crop across the
    whole band, the sharp portrait where that column reaches, the horizontal
    scrim, then the vertical one.

    The sharp layer is treated as fully opaque out to its own width. Its mask
    fades from `maskEnd`% of the *row*, which on the narrowest row this band is
    rendered at lands just past that column — so ignoring the mask measures the
    worst case rather than the typical one, which is the point. */
const portraitGround = (
  theme: string,
  band: Band,
  x: number,
  verticalAlpha: number,
): string => {
  const b = PORTRAIT_BANDS[band];
  const ground = token(theme, b.ground.replace("--", ""));
  let g = over(BRIGHTEST_ART, ground, b.ambientOpacity);
  if (x <= Math.round(band * PORTRAIT_RATIO)) g = over(BRIGHTEST_ART, g, b.sharpOpacity);
  g = over(ground, g, alphaAt(horizontalStops(band), x));
  return over(token(theme, "bg"), g, verticalAlpha);
};

/** Where each `left-portrait` surface actually prints ink, and how far down the
    band. `x` is the worst point under that ink, not where it starts: a truncating
    name runs past the horizontal ramp's trough, and the trough is the thinnest
    ground it stands on.

    The rank glyph each 148 row draws is deliberately absent. It is `--fg-faint`,
    which measures below 4.5:1 against flat `--bg` with no art at all, so no scrim
    value can lift it — that is a token question, not a wash one. */
const PORTRAIT_INK: readonly {
  surface: string;
  band: Band;
  x: number;
  /** Percent down the band, for the vertical ramp. Absent where the band holds
      one flat value or draws no vertical layer at all. */
  y?: number;
  hold?: boolean;
}[] = [
  // Phone: the name starts at 39px (13px padding, a 16px rank, a 10px gap) and
  // truncates rightward, so it crosses the 118px trough.
  { surface: "discovery and rec rows, phone", band: 148, x: PORTRAIT_BANDS[148].nearStop, hold: true },
  // Desktop: the name starts at 70px and its block bottom sits 24px off the
  // band's foot — 84% of 148px.
  { surface: "discovery and rec rows, desktop", band: 148, x: PORTRAIT_BANDS[148].nearStop, y: 84 },
  // The resume row's type starts at the 116px inset, past the 99px portrait but
  // short of the 138px flat stop, so the ambient crop is still under it.
  { surface: "resume row", band: 72, x: 116 },
];

const verticalAlphaAt = (band: Band, y: number): number => {
  const v = PORTRAIT_BANDS[band].vertical;
  return v ? alphaAt(v, y) : 0;
};

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
    it(`${theme}: a top-ramp title clears 7:1 over the brightest possible art`, () => {
      const ground = washGround(token(theme, "bg"), TOP_AT_TITLE);
      expect(contrast(token(theme, "fg"), ground)).toBeGreaterThanOrEqual(7);
    });

    // The bottom of a top-labelled band is not asserted: nothing there is ink on
    // the wash. The status pill plates itself against `--bg`, the hero's fit chip
    // sets an opaque background, and the colour pips are aria-hidden.
    it(`${theme}: top-ramp ink still clears its floor at the foot of the label block`, () => {
      const ground = washGround(token(theme, "bg"), TOP_AT_SUBTITLE);
      expect(contrast(token(theme, "fg"), ground)).toBeGreaterThanOrEqual(7);
      expect(contrast(token(theme, "fg-body"), ground)).toBeGreaterThanOrEqual(4.5);
    });

    for (const [surface, labelAt] of BOTTOM_SURFACES) {
      it(`${theme}: bottom-ramp ink clears 4.5:1 at ${surface}'s label edge`, () => {
        const ground = washGround(token(theme, "bg"), alphaAt(bottomScrimStops(labelAt), labelAt));
        expect(contrast(token(theme, "fg"), ground)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(token(theme, "fg-body"), ground)).toBeGreaterThanOrEqual(4.5);
      });
    }

    for (const ink of PORTRAIT_INK) {
      it(`${theme}: ${ink.surface} clears 4.5:1 over the brightest possible portrait`, () => {
        const vertical = ink.hold
          ? (PORTRAIT_BANDS[ink.band].verticalHold ?? 0) / 100
          : verticalAlphaAt(ink.band, ink.y ?? 0);
        const ground = portraitGround(theme, ink.band, ink.x, vertical);
        expect(contrast(token(theme, "fg"), ground)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(token(theme, "fg-body"), ground)).toBeGreaterThanOrEqual(4.5);
      });
    }

    // The deck spine's desktop band is the one `left-portrait` surface whose ink
    // never touches the crop: its type starts at a 254px inset and the band's
    // horizontal scrim reaches opaque `--bg` at 240px. Asserting the inset is
    // past the flat stop is the real invariant — a contrast figure there would
    // only be measuring `--fg` against `--bg`.
    it(`${theme}: the deck spine's desktop inset clears the band's flat stop`, () => {
      expect(alphaAt(horizontalStops(168), 254)).toBe(1);
    });
  }
});
