import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  bottomScrimStops,
  COVER_ART_OPACITY,
  PORTRAIT_HOLD,
  PORTRAITS,
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

/** Every band this round states, as `[surface, labelAtPx, band]`. Asserting a
    shared constant was the estimate the round removed — the floor has to hold at
    each surface's own block edge — and asserting a percentage was the unit it
    removed. Each figure is the block's MEASURED height at its reference width,
    which is the distinction that matters: a block costed at 57px whose title
    wraps to three lines is 83px, and a ramp derived from 57 holds where that
    block ends rather than where it starts. */
const STATED_BANDS: readonly {
  surface: string;
  labelAtPx: number;
  band: number;
  /** The strategy, because the ground and the hold both follow from it: a
      `cover` band fades its art to 0.8 and holds at 73, and a `left-portrait`'s
      sharp layer draws at 0.92 and holds at 78. Measuring a portrait row through
      the cover's ground passes at a contrast the surface never has. */
  strategy: "cover" | "left-portrait";
  /** The portrait a `left-portrait` row draws, for composing its own ground. */
  portrait?: keyof typeof PORTRAITS;
}[] = [

  { surface: "home hero", labelAtPx: 46, band: 288, strategy: "cover" },
  { surface: "commander detail mobile", labelAtPx: 109, band: 288, strategy: "cover" },
  { surface: "deck spine, phone", labelAtPx: 90, band: 288, strategy: "cover" },
  { surface: "deck tile", labelAtPx: 46, band: 248, strategy: "cover" },
  // The two rows differ: one wash under two breakpoint subtrees on each, and the
  // desktop block is the taller — discovery's is its rank column, the owned
  // lane's its identity column with a type line under the name.
  { surface: "discovery row", labelAtPx: 56, band: 208, strategy: "left-portrait", portrait: 285 },
  { surface: "owned-lane row", labelAtPx: 63, band: 208, strategy: "left-portrait", portrait: 285 },
  { surface: "resume row", labelAtPx: 53, band: 168, strategy: "cover" },
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

/** The horizontal scrim a `left-portrait` portrait draws, as `alphaAt` pairs. Its
    positions are pixels rather than percentages — the portrait is a fixed column
    beside type, not a fraction of a row whose width nobody controls.

    Keyed by the portrait's width, as the shipped table now is: every column in it
    is a function of that width, and one band draws two portraits on the one
    surface whose shape was chosen before its height. */
// `number`, not `PortraitWidth`: this suite still measures the two aspect-ratio
// bands' portraits, which are deliberately outside the stated set — a stated band
// may not ask for 203 because that row carries a hand-written ramp.
const horizontalStops = (width: keyof typeof PORTRAITS): ScrimStops => {
  const b = PORTRAITS[width];
  return [
    [0, 0],
    [0, Math.round((b.maskEnd / 100) * width)],
    [b.sharpAlpha, width],
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
  width: keyof typeof PORTRAITS,
  x: number,
  verticalAlpha: number,
  plate = 0,
): string => {
  const b = PORTRAITS[width];
  const ground = token(theme, b.ground.replace("--", ""));
  let g = ground;
  if (x <= width) g = over(BRIGHTEST_ART, g, b.sharpOpacity);
  g = over(ground, g, alphaAt(horizontalStops(width), x));
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
    block's top, which is where the desktop list row measured 4.0:1 before this
    round, on the 148 band it took then.

    The rank glyph each list row draws is deliberately absent. It is `--fg-faint`,
    which measures below 4.5:1 against flat `--bg` with no art at all, so no scrim
    value can lift it — that is a token question, not a wash one. */
const PORTRAIT_INK: readonly {
  surface: string;
  portrait: keyof typeof PORTRAITS;
  /** The band the surface draws that portrait on, which the vertical ramp is a
      percentage of. */
  band: number;
  /** The block this row's ramp is keyed to, or null where its ink starts past the
      portrait's flat stop and stands on the row's own ground. */
  labelAtPx: number | null;
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
  // The two list rows, both at the 208 band over a 285 portrait they take now.
  // Each row holds two breakpoint subtrees under one wash and both are
  // `items-end`, so the phone's block sits inside the desktop's — the taller
  // block is the one each `labelAtPx` is measured against, and sampling its top
  // and its foot bounds every row of ink either width draws.
  { surface: "the owned row's block top", portrait: 285, band: 208, labelAtPx: 63, x: 165, y: 70 },
  { surface: "the owned row's block foot", portrait: 285, band: 208, labelAtPx: 63, x: 165, y: 100 },
  // 56, the rank column's measured figure — the same one `STATED_BANDS` and the
  // component carry. 46 was the handoff's number for a block that does not ship.
  { surface: "discovery's block top", portrait: 285, band: 208, labelAtPx: 56, x: 165, y: 78 },
  // The deck spine's `⛶ Card details` control: 16px in, 14px off the foot, and
  // the one thing on that band whose ink sits over the crop. THE PLATE is opaque
  // now, so `plate: 1` is not a shortcut — it is the whole argument for deleting
  // the top scrim, and asserting it here is what proves the control does not
  // depend on the band underneath it.
  { surface: "deck spine control, top", portrait: 560, band: 288, labelAtPx: null, x: 16, y: 76, plate: 1, tokens: ["fg"] },
  { surface: "deck spine control, foot", portrait: 560, band: 288, labelAtPx: null, x: 42, y: 92, plate: 1, tokens: ["fg"] },
  // The narrow fallback draws the same control over a different portrait.
  { surface: "deck spine control, narrow row", portrait: 340, band: 288, labelAtPx: null, x: 16, y: 76, plate: 1, tokens: ["fg"] },
];

/** The vertical ramp a `left-portrait` band draws, from the same function the
    `cover` bands use — one ramp for both strategies, which is what retired the
    hand-written column this used to read. A band whose ink starts past the flat
    stop passes `null` and draws none. */
const verticalAlphaAt = (labelAtPx: number | null, band: number, y: number): number =>
  labelAtPx === null ? 0 : alphaAt(bottomScrimStops(labelAtPx, band, PORTRAIT_HOLD), y);

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
    // Every band this round states, at both edges of its own block. `band` is
    // required: these stops are gradient positions, so a px `labelAt` through a
    // one-argument percentage signature would hold the scrim at 46% of a 248px
    // band where the drawing puts it at 81% — the scrim landing where the round
    // removes it, which is worse than not moving it at all.
    for (const { surface, labelAtPx, band, strategy, portrait: width } of STATED_BANDS) {
      const stops = bottomScrimStops(labelAtPx, band, strategy === "cover" ? undefined : PORTRAIT_HOLD);
      for (const [edge, y] of [
        ["top", Math.round(((band - labelAtPx) / band) * 100)],
        ["foot", 100],
      ] as const) {
        it(`${theme}: ${surface}'s ink clears 4.5:1 at its block's ${edge}`, () => {
          // The ground each strategy actually composes. A `cover` band is the crop
          // at 0.8 under the ramp; a portrait row's ink stands on its own sharp
          // layer at 0.92, out where the horizontal scrim is still clear.
          const ground =
            width === undefined
              ? washGround(token(theme, "bg"), alphaAt(stops, y))
              : portraitGround(
                  theme,
                  width,
                  Math.round((PORTRAITS[width].maskEnd / 100) * width),
                  alphaAt(stops, y),
                );
          expect(contrast(token(theme, "fg"), ground)).toBeGreaterThanOrEqual(4.5);
          expect(contrast(token(theme, "fg-body"), ground)).toBeGreaterThanOrEqual(4.5);
        });
      }
    }

    // THE PLATE is opaque, so the control it carries stands on the page's own
    // body contrast and no band underneath it can reach its ink. That is the
    // argument decision 5 needs in order to be safe: with the top scrim gone the
    // top edge is the brightest, least controlled region of the crop, and the 72%
    // mix this replaces still passed 28% of a pure white pixel through.
    it(`${theme}: a control on THE PLATE clears 4.5:1 with no scrim beneath it`, () => {
      const ground = over(token(theme, "bg"), washGround(token(theme, "bg"), 0), 1);
      expect(ground).toBe(token(theme, "bg").toUpperCase());
      expect(contrast(token(theme, "fg"), ground)).toBeGreaterThanOrEqual(4.5);
    });

    // The one glyph on art with no plate, by the boundary rule: the ramp protects
    // the label block, plates protect what is above it, and the rename pencil sits
    // INSIDE the block on ground held at 73%. 3:1 rather than 4.5 because it is an
    // icon-only control rather than a string.
    //
    // BOTH tokens, because the glyph draws `--fg` until the deck spines take
    // their bands and `--fg-muted` after — and the floor has to hold for either,
    // or the assertion is measuring a colour the control does not use. Measured,
    // `--fg-muted` lands at 3.42–3.75 across the six themes, so it is a floor
    // with no headroom: any lift of `COVER_ART_OPACITY` or drop of the 73% hold
    // breaks this glyph first.
    for (const ink of ["fg", "fg-muted"] as const) {
      it(`${theme}: the unplated rename glyph clears 3:1 inside the block at --${ink}`, () => {
        const ground = washGround(token(theme, "bg"), 0.73);
        expect(contrast(token(theme, ink), ground)).toBeGreaterThanOrEqual(3);
      });
    }

    for (const ink of PORTRAIT_INK) {
      it(`${theme}: ${ink.surface} clears 4.5:1 over the brightest possible portrait`, () => {
        const vertical = verticalAlphaAt(ink.labelAtPx, ink.band, ink.y);
        const ground = portraitGround(theme, ink.portrait, ink.x, vertical, ink.plate ?? 0);
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
    // The 288 band's two geometries, both of them: a 560px portrait at a 592px
    // inset above ~1200px of row, and a 340px portrait at a 364px inset below it.
    // The narrow one is why the table is keyed by width rather than by band — one
    // band cannot hold two portraits — and its row is the one the 248 band already
    // ships, so the fallback is a value rather than a gap.
    it(`${theme}: both desktop deck header insets clear their own flat stop`, () => {
      expect(alphaAt(horizontalStops(560), 592)).toBe(1);
      expect(alphaAt(horizontalStops(340), 364)).toBe(1);
    });
  }
});
