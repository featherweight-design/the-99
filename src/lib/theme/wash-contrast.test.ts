import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  type Band,
  bottomScrimStops,
  COVER_ART_OPACITY,
  COVER_SCRIM_STOPS,
  OVER_ART_PLATE,
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
    [0, 0],
    [0, b.clearTo],
    [b.sharpAlpha, Math.round(band * PORTRAIT_RATIO)],
    [100, b.flatStop],
  ];
};

/** The ground a `left-portrait` row's ink sits on, composed in the order
    `<ArtWash>` stacks it: the row's own ground, the sharp portrait where that
    column reaches, the horizontal scrim, then the vertical one.

    No ambient layer. The band used to carry a full-bleed copy of the crop under
    the portrait, and past the portrait's own width it read as a second image;
    removing it can only darken the ground measured here, never lighten it.

    The sharp layer is treated as fully opaque out to its own width. Its mask
    fades from `maskEnd`% of the *row*, which on the narrowest row this band is
    rendered at lands just past that column — so ignoring the mask measures the
    worst case rather than the typical one, which is the point. */
const portraitGround = (
  theme: string,
  band: Band,
  x: number,
  verticalAlpha: number,
  plate = 0,
): string => {
  const b = PORTRAIT_BANDS[band];
  const ground = token(theme, b.ground.replace("--", ""));
  let g = ground;
  if (x <= Math.round(band * PORTRAIT_RATIO)) g = over(BRIGHTEST_ART, g, b.sharpOpacity);
  g = over(ground, g, alphaAt(horizontalStops(band), x));
  g = over(token(theme, "bg"), g, verticalAlpha);
  return plate ? over(token(theme, "bg"), g, plate) : g;
};

/** Where each `left-portrait` surface actually prints ink, and how far down the
    band. `x` is the worst point under that ink: the horizontal scrim now runs at
    zero alpha out to `clearTo` and only climbs after it, so the thinnest ground
    any of this ink stands on is anywhere at or before that stop.

    Both edges of each label block are sampled, not just one. The ramps hold a
    flat value across the block precisely so the two agree — asserting only the
    block's foot is what let a ramp ship that had not finished climbing at the
    block's top, which is where the desktop 148 row measured 4.0:1 before this
    round.

    The rank glyph each 148 row draws is deliberately absent. It is `--fg-faint`,
    which measures below 4.5:1 against flat `--bg` with no art at all, so no scrim
    value can lift it — that is a token question, not a wash one. */
const PORTRAIT_INK: readonly {
  surface: string;
  band: Band;
  x: number;
  /** Percent down the band, for the vertical ramp. */
  y: number;
  /** An opaque-ish plate the surface paints between the wash and its own ink. */
  plate?: number;
  /** The ink tokens this surface actually prints. Defaults to a row's pair. A
      chip that draws one token is measured on that one: asserting a token it
      never uses would set a floor nothing on the band has to clear, and the
      first honest tuning pass would have to argue its way past it. */
  tokens?: readonly string[];
}[] = [
  // Desktop: the name starts at 70px, its block top 81px down the band and its
  // foot 24px off the band's own. Phone: the name starts at 39px and its block
  // spans 65%–92%. Both are `items-end`, so the phone's block sits inside the
  // desktop's and the four samples below bound every 148 row at either width.
  { surface: "discovery and rec rows, block top", band: 148, x: PORTRAIT_BANDS[148].clearTo, y: 55 },
  { surface: "discovery and rec rows, block foot", band: 148, x: PORTRAIT_BANDS[148].clearTo, y: 92 },
  // The resume row's type starts at the 116px inset, past the 99px portrait but
  // short of the 138px flat stop — so it stands on the row's own ground under a
  // scrim that has not closed to opaque yet, which is the thinnest ground any
  // ink on that band gets.
  { surface: "resume row", band: 72, x: 116, y: 0 },
  // The deck spine's `⛶ Card details` pill: 16px in, 14px off the foot, 26px
  // tall, and the one thing on that band whose ink sits over the crop. Its band
  // no longer draws a vertical ramp at all — the pill's own plate is what holds
  // it up, which is why `verticalAlphaAt` returns 0 here and these still pass.
  // Both its spans are `--fg`.
  {
    surface: "deck spine pill, top",
    band: 168,
    x: 16,
    y: 76,
    plate: OVER_ART_PLATE / 100,
    tokens: ["fg"],
  },
  {
    surface: "deck spine pill, foot",
    band: 168,
    x: 120,
    y: 92,
    plate: OVER_ART_PLATE / 100,
    tokens: ["fg"],
  },
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
      // Both edges of the block, as everywhere else: the ramp holds one value
      // from `labelAt` to the band's foot precisely so the two agree, and it is
      // that hold — not a second climb to 88% — that the sample at 100 proves.
      for (const [edge, y] of [
        ["top", labelAt],
        ["foot", 100],
      ] as const) {
        it(`${theme}: bottom-ramp ink clears 4.5:1 at ${surface}'s label ${edge}`, () => {
          const ground = washGround(token(theme, "bg"), alphaAt(bottomScrimStops(labelAt), y));
          expect(contrast(token(theme, "fg"), ground)).toBeGreaterThanOrEqual(4.5);
          expect(contrast(token(theme, "fg-body"), ground)).toBeGreaterThanOrEqual(4.5);
        });
      }
    }

    // The `⛶ Card details` chip is the one control that prints where a bottom
    // ramp is clear, so its plate is measured with no scrim under it at all.
    // This is the assertion that lets the top of that ramp run at zero.
    it(`${theme}: the over-art chip's plate clears 4.5:1 with no scrim beneath it`, () => {
      const ground = over(token(theme, "bg"), washGround(token(theme, "bg"), 0), OVER_ART_PLATE / 100);
      expect(contrast(token(theme, "fg"), ground)).toBeGreaterThanOrEqual(4.5);
    });

    for (const ink of PORTRAIT_INK) {
      it(`${theme}: ${ink.surface} clears 4.5:1 over the brightest possible portrait`, () => {
        const vertical = verticalAlphaAt(ink.band, ink.y);
        const ground = portraitGround(theme, ink.band, ink.x, vertical, ink.plate ?? 0);
        for (const name of ink.tokens ?? ["fg", "fg-body"]) {
          expect(contrast(token(theme, name), ground)).toBeGreaterThanOrEqual(4.5);
        }
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
