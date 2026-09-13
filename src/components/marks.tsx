// Inline-SVG marks per docs/superpowers/design-tables/appshell.md §Marks Summary.
// - Crowned99 = identity mark (wordmark, signed-out hero, home greeting)
// - CardFan   = Collection / Decks (library motif)
// - XcixSeal  = Commanders (leadership regalia)
//
// Each component accepts a `variant` prop whose values map to exact pixel
// geometry from the design table. A single `size`-based uniform viewBox
// scale would produce fractional px values and fail the design-review gate.
// Colors reference brand tokens via CSS custom properties where possible;
// some design-table values (e.g. card-fan fill layers) are raw hex by spec.

import { CrownDiamonds, crownBox } from "./ui/crown";

// ---------------------------------------------------------------------------
// Crowned99
// ---------------------------------------------------------------------------

type Crowned99Variant =
  | "hero-mobile"     // 13/18/13px diamonds, 92px numeral, weight 900, 8px gap
  | "hero-desktop"    // 18/25/18px diamonds, 132px numeral, weight 900, 11px gap
  | "rail-62"         // 6/8.5/6px diamonds, 23px numeral, weight 900, 3px gap
  | "mobile-header";  // 5/7/5px diamonds, 24px numeral, weight 800, 3px gap

interface Crowned99Props {
  variant: Crowned99Variant;
  className?: string;
}

// Per-context pixel geometry from §SVG / Marks Summary and §Rail / §Hero tables.
// Exported because `src/app/icon.svg` is drawn from the `rail-62` entry and
// nothing renders that file — `icon.test.ts` reads the spec back out of here so
// the two cannot drift apart the way two copies of a number always do.
export const CROWNED99_SPECS: Record<
  Crowned99Variant,
  {
    smallDiamond: number; // s diamond side length in px
    largeDiamond: number; // l diamond side length in px
    numeralSize: number;  // font-size in px
    fontWeight: number;
    gap: number;          // air between diamond *points*, in px — see below
    translateX: number;   // crown row translateX offset in px (negative = left)
    baselineGap: number;  // px from the crown row's bottom to the numeral baseline
    bottomPad: number;    // px reserved under that baseline
    letterSpacing?: string;
  }
> = {
  // The three hero/header variants carry `numeralSize + 6` as their baseline
  // gap because that is what the render body hardcoded before the gap became a
  // field: the numeral's em box sat 6px under the crown, and the baseline a
  // further `numeralSize` down. Keeping the arithmetic as literals rather than
  // an expression is what makes a future change to one of them visible.
  "hero-mobile": {
    smallDiamond: 13,
    largeDiamond: 18,
    numeralSize: 92,
    fontWeight: 900,
    gap: 8,
    translateX: -2,
    baselineGap: 98,
    bottomPad: 4,
  },
  "hero-desktop": {
    smallDiamond: 18,
    largeDiamond: 25,
    numeralSize: 132,
    fontWeight: 900,
    gap: 11,
    translateX: -3,
    baselineGap: 138,
    bottomPad: 4,
  },
  // The 62px rail's head (design/design_handoff_the99_rail_mark/CHROME-rail-mark.md).
  // It replaces the *wide* rail's wordmark, which the 2026-09-07 refresh deleted
  // along with the rail that held it — leaving the desktop app with nowhere it
  // said its own name.
  //
  // The handoff writes this gap as 6px, because it draws the crown as three
  // flex-laid boxes and a 45°-rotated square overflows its box by 0.207× a side
  // each way: `gap = air + 0.207 × (w₁ + w₂)`. `crownBox` lays the row out from
  // the diagonals instead, so its gap already *is* the air, and the 3px the
  // handoff asks to see is the 3px passed here. The same conversion makes the
  // drawn row 35px wide rather than the handoff's 32.5, which is its flex box;
  // the height is untouched at 8.5√2 = 12, so the 39px lockup the rail's layout
  // is measured from holds exactly.
  //
  // baselineGap is 22, not the 4 + 23 the handoff's "4px between them" would
  // suggest, because the canvas sets those numerals as HTML with `line-height:
  // 1` and an SVG has no line box to inherit that from. Cinzel reports a
  // 22px ascent and a 9px descent at this size, so a 23px line box carries
  // −4px of half-leading and puts the baseline 18px into a box that starts 4px
  // under the crown: 22. Placing it at 4 + 23 instead drops the digits 5px and
  // opens a visible trench under the crown, which is what the first build did.
  //
  // bottomPad then completes the 39px lockup (12 + 4 + 23) that the rail's
  // 73px head zone is measured from: 39.02 − 12.02 − 22 ≈ 5.
  "rail-62": {
    smallDiamond: 6,
    largeDiamond: 8.5,
    numeralSize: 23,
    fontWeight: 900,
    gap: 3,
    translateX: 0,
    baselineGap: 22,
    bottomPad: 5,
    letterSpacing: "-0.01em",
  },
  "mobile-header": {
    smallDiamond: 5,
    largeDiamond: 7,
    numeralSize: 24,
    fontWeight: 800,
    gap: 3,
    translateX: 0,
    baselineGap: 30,
    bottomPad: 4,
  },
};

export function Crowned99({ variant, className }: Crowned99Props) {
  const spec = CROWNED99_SPECS[variant];
  const {
    smallDiamond: s,
    largeDiamond: l,
    numeralSize,
    fontWeight,
    gap,
    translateX,
    baselineGap,
    bottomPad,
    letterSpacing,
  } = spec;

  // The crown row itself is drawn by CrownDiamonds — the app's one drawing of
  // the mark — so the wordmark and the standalone Crown cannot drift apart.
  // This file still owns the per-variant pixel geometry, because those values
  // come from the design table and the numeral has to sit under them.
  const geometry = { small: s, large: l, gap };
  const { width: crownWidth, height: crownHeight } = crownBox(geometry);

  // Numeral "99": approximate width at the given font-size (Cinzel is slightly
  // condensed; 1.15× factor gives a reasonable bounding box for the SVG width).
  const numeralApproxWidth = numeralSize * 1.15;

  // SVG total dimensions
  const totalWidth = Math.max(crownWidth, numeralApproxWidth) + 4; // 2px padding each side
  // The numeral is placed by its baseline, because that is the only vertical
  // anchor an SVG `<text>` has — there is no line box, and so no half-leading
  // to inherit from the font the way the design canvas's HTML does.
  const textY = crownHeight + baselineGap;
  const totalHeight = textY + bottomPad;

  // Crown row left edge: centred in the SVG, adjusted by translateX.
  const crownRowLeft = totalWidth / 2 + translateX - crownWidth / 2;

  const textX = totalWidth / 2;

  return (
    <svg
      role="img"
      aria-label="The 99"
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      width={totalWidth}
      height={totalHeight}
      className={className}
      style={{ overflow: "visible" }}
    >
      <CrownDiamonds geometry={geometry} fill="var(--accent)" offsetX={crownRowLeft} />
      {/* Numeral "99" */}
      <text
        x={textX}
        y={textY}
        textAnchor="middle"
        fontFamily="var(--font-display), 'Cinzel', serif"
        fontWeight={fontWeight}
        fontSize={numeralSize}
        letterSpacing={letterSpacing}
        fill="var(--fg)"
      >
        99
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// CardFan
// ---------------------------------------------------------------------------

type CardFanVariant = "mobile" | "desktop" | "decks-desktop";

interface CardFanProps {
  variant?: CardFanVariant;
  className?: string;
}

// Per-context geometry from §Card-fan mark table.
// Collection empty + Decks empty share the same card dimensions per breakpoint;
// Decks desktop uses +15° (vs collection's +16°) — we expose exact rotation
// via the variant. For the shared mobile spec: -14°/0°/+14°.
const CARDFAN_SPECS: Record<
  CardFanVariant,
  {
    containerW: number;
    containerH: number;
    cardW: number;
    cardH: number;
    cardRx: number;
    backRotate: number;
    frontRotate: number;
    backTranslateX: number;
    frontTranslateX: number;
    fontSize: number;
  }
> = {
  mobile: {
    containerW: 100,
    containerH: 110,
    cardW: 52,
    cardH: 74,
    cardRx: 8,
    backRotate: -14,
    frontRotate: 14,
    backTranslateX: -18,
    frontTranslateX: 18,
    fontSize: 22,
  },
  desktop: {
    // Collection empty desktop: -16°/0°/+16°, translateX ±22px
    containerW: 120,
    containerH: 130,
    cardW: 60,
    cardH: 84,
    cardRx: 9,
    backRotate: -16,
    frontRotate: 16,
    backTranslateX: -22,
    frontTranslateX: 22,
    fontSize: 26,
  },
  "decks-desktop": {
    // Decks empty desktop: -15°/0°/+15°, translateX ±22px (table row differs from collection)
    containerW: 120,
    containerH: 130,
    cardW: 60,
    cardH: 84,
    cardRx: 9,
    backRotate: -15,
    frontRotate: 15,
    backTranslateX: -22,
    frontTranslateX: 22,
    fontSize: 26,
  },
};

export function CardFan({ variant = "mobile", className }: CardFanProps) {
  const spec = CARDFAN_SPECS[variant];
  const { containerW, containerH, cardW, cardH, cardRx, backRotate, frontRotate, backTranslateX, frontTranslateX, fontSize } = spec;

  const cx = containerW / 2;
  const cy = containerH / 2;
  const hw = cardW / 2;
  const hh = cardH / 2;

  return (
    <svg
      role="img"
      aria-label="Card fan"
      viewBox={`0 0 ${containerW} ${containerH}`}
      width={containerW}
      height={containerH}
      className={className}
    >
      {/* Back card: rotated away, translated left */}
      <g transform={`translate(${cx}, ${cy}) rotate(${backRotate}) translate(${backTranslateX}, 0)`}>
        <rect
          x={-hw}
          y={-hh}
          width={cardW}
          height={cardH}
          rx={cardRx}
          fill="var(--elevated)"
          stroke="var(--border-dashed)"
          strokeWidth="1.5"
        />
      </g>
      {/* Middle card: upright, centered */}
      <g transform={`translate(${cx}, ${cy})`}>
        <rect
          x={-hw}
          y={-hh}
          width={cardW}
          height={cardH}
          rx={cardRx}
          fill="var(--border)"
          stroke="var(--accent-shadow)"
          strokeWidth="1.5"
        />
      </g>
      {/* Front card: rotated forward, translated right, accent border + "99" */}
      <g transform={`translate(${cx}, ${cy}) rotate(${frontRotate}) translate(${frontTranslateX}, 0)`}>
        <rect
          x={-hw}
          y={-hh}
          width={cardW}
          height={cardH}
          rx={cardRx}
          fill="var(--border-strong)"
          stroke="var(--accent)"
          strokeWidth="1.5"
        />
        <text
          x="0"
          y={fontSize * 0.35}
          textAnchor="middle"
          fontFamily="var(--font-display), 'Cinzel', serif"
          fontWeight={800}
          fontSize={fontSize}
          fill="var(--accent)"
        >
          99
        </text>
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// XcixSeal
// ---------------------------------------------------------------------------

type XcixSealVariant = "mobile" | "desktop" | "reference";

interface XcixSealProps {
  variant?: XcixSealVariant;
  className?: string;
}

// Per-context geometry from §XCIX seal table.
const XCIXSEAL_SPECS: Record<
  XcixSealVariant,
  {
    size: number;
    borderRadius: number;
    fontSize: number;
  }
> = {
  mobile: { size: 64, borderRadius: 14, fontSize: 20 },
  desktop: { size: 78, borderRadius: 16, fontSize: 24 },
  reference: { size: 52, borderRadius: 12, fontSize: 16 },
};

export function XcixSeal({ variant = "mobile", className }: XcixSealProps) {
  const { size, borderRadius, fontSize } = XCIXSEAL_SPECS[variant];
  const half = size / 2;
  const textY = half + fontSize * 0.35; // approximate vertical centering

  return (
    <svg
      role="img"
      aria-label="XCIX"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={className}
    >
      {/* Accent border, no fill */}
      <rect
        x="1"
        y="1"
        width={size - 2}
        height={size - 2}
        rx={borderRadius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
      />
      {/* XCIX glyph centered */}
      <text
        x={half}
        y={textY}
        textAnchor="middle"
        fontFamily="var(--font-display), 'Cinzel', serif"
        fontWeight={700}
        fontSize={fontSize}
        letterSpacing="0.04em"
        fill="var(--fg)"
      >
        XCIX
      </text>
    </svg>
  );
}
