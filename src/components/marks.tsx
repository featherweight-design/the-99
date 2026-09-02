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

// ---------------------------------------------------------------------------
// Crowned99
// ---------------------------------------------------------------------------

type Crowned99Variant =
  | "hero-mobile"     // 13/18/13px diamonds, 92px numeral, weight 900, 8px gap
  | "hero-desktop"    // 18/25/18px diamonds, 132px numeral, weight 900, 11px gap
  | "rail"            // 6/8/6px diamonds, 30px numeral, weight 800, 4px gap
  | "mobile-header";  // 5/7/5px diamonds, 24px numeral, weight 800, 3px gap

interface Crowned99Props {
  variant?: Crowned99Variant;
  className?: string;
}

// Per-context pixel geometry from §SVG / Marks Summary and §Rail / §Hero tables.
const CROWNED99_SPECS: Record<
  Crowned99Variant,
  {
    smallDiamond: number; // s diamond side length in px
    largeDiamond: number; // l diamond side length in px
    numeralSize: number;  // font-size in px
    fontWeight: number;
    gap: number;          // gap between diamonds in px
    translateX: number;   // crown row translateX offset in px (negative = left)
  }
> = {
  "hero-mobile": {
    smallDiamond: 13,
    largeDiamond: 18,
    numeralSize: 92,
    fontWeight: 900,
    gap: 8,
    translateX: -2,
  },
  "hero-desktop": {
    smallDiamond: 18,
    largeDiamond: 25,
    numeralSize: 132,
    fontWeight: 900,
    gap: 11,
    translateX: -3,
  },
  rail: {
    smallDiamond: 6,
    largeDiamond: 8,
    numeralSize: 30,
    fontWeight: 800,
    gap: 4,
    translateX: -1,
  },
  "mobile-header": {
    smallDiamond: 5,
    largeDiamond: 7,
    numeralSize: 24,
    fontWeight: 800,
    gap: 3,
    translateX: 0,
  },
};

export function Crowned99({
  variant = "rail",
  className,
}: Crowned99Props) {
  const spec = CROWNED99_SPECS[variant];
  const { smallDiamond: s, largeDiamond: l, numeralSize, fontWeight, gap, translateX } = spec;

  // Crown row: three diamonds (s, l, s) with pixel-exact sizes.
  // The diamonds are rotated 45°; their visual width is side * sqrt(2).
  // Crown row total width = s*sqrt2 + gap + l*sqrt2 + gap + s*sqrt2
  // We build the SVG viewBox to match the actual pixel dimensions.
  const sqrt2 = Math.SQRT2;
  const sVis = s * sqrt2; // visual diagonal extent of small diamond
  const lVis = l * sqrt2; // visual diagonal extent of large diamond
  const crownWidth = sVis + gap + lVis + gap + sVis;
  const crownHeight = lVis; // tallest diamond sets height

  // Numeral "99": approximate width at the given font-size (Cinzel is slightly
  // condensed; 1.15× factor gives a reasonable bounding box for the SVG width).
  const numeralApproxWidth = numeralSize * 1.15;

  // SVG total dimensions
  const totalWidth = Math.max(crownWidth, numeralApproxWidth) + 4; // 2px padding each side
  // Crown sits above numeral. Numeral baseline: text y = numeralSize (from top).
  // Add 4px padding at bottom.
  const totalHeight = crownHeight + 6 + numeralSize + 4; // 6px gap between crown and numeral top

  // Crown row center-x: center of SVG, adjusted by translateX
  const crownCenterX = totalWidth / 2 + translateX;
  // Crown diamonds are centered at y = crownHeight / 2 (vertically centered in crown band)
  const crownCenterY = crownHeight / 2;

  // Diamond centers (x): starting from left edge of crown row
  // Crown row left edge relative to SVG center:
  const crownRowLeft = crownCenterX - crownWidth / 2;
  const d1cx = crownRowLeft + sVis / 2;
  const d2cx = d1cx + sVis / 2 + gap + lVis / 2;
  const d3cx = d2cx + lVis / 2 + gap + sVis / 2;

  // Text baseline y: crown band + 6px gap + numeralSize (font-size = cap height approx)
  const textY = crownHeight + 6 + numeralSize;
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
      {/* Crown row: s / l / s diamonds, each rotated 45°, filled accent */}
      <g>
        {/* Small diamond 1 */}
        <rect
          x={d1cx - s / 2}
          y={crownCenterY - s / 2}
          width={s}
          height={s}
          transform={`rotate(45, ${d1cx}, ${crownCenterY})`}
          fill="var(--accent)"
        />
        {/* Large diamond */}
        <rect
          x={d2cx - l / 2}
          y={crownCenterY - l / 2}
          width={l}
          height={l}
          transform={`rotate(45, ${d2cx}, ${crownCenterY})`}
          fill="var(--accent)"
        />
        {/* Small diamond 2 */}
        <rect
          x={d3cx - s / 2}
          y={crownCenterY - s / 2}
          width={s}
          height={s}
          transform={`rotate(45, ${d3cx}, ${crownCenterY})`}
          fill="var(--accent)"
        />
      </g>
      {/* Numeral "99" */}
      <text
        x={textX}
        y={textY}
        textAnchor="middle"
        fontFamily="var(--font-display), 'Cinzel', serif"
        fontWeight={fontWeight}
        fontSize={numeralSize}
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
