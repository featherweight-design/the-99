// The identity crown, promoted from decoration to the app's empty/loading mark.
// It was already beside the kaiju in completion-reveal.tsx; retiring the
// character layer removes the thing standing in front of the mark rather than
// leaving a hole. `pulse` carries the retired LoaderDots' 1.2s stagger, so the
// loading state keeps its animation and loses a component.
//
// Three intensities, per the handoff's decision 6. Quiet is for a mark that
// sits inside content — an empty state, a panel, an inline row — which is most
// of them. Page is for a mark that stands for the route itself rather than for
// something missing from it: a page's own heading mark, or the loading screen.
// Loud is reserved for the 99/99 reveal, the only place in the app allowed to
// raise its voice. Only the colour separates quiet from page; loud is also the
// larger geometry.
//
// `CrownDiamonds` is the one drawing of the crown in the app. Both this
// component and the `Crowned99` wordmark render it, so the three diamonds have
// one set of proportions everywhere they appear rather than one per call site.
// The two pairs encoded below are the brand sheet's (§The crowned numeral):
// 8/11 for quiet and page, 15/20 for loud, each with a gap of roughly 0.6× the
// small side. Both are wider and flatter than the pre-consolidation 8/12 and
// 13/19. The sheet's smaller pairs belong to the wordmark, which passes its own
// per-variant geometry in rather than choosing a tone.

/** Side lengths, in px, of the three squares that become diamonds when rotated. */
export type CrownGeometry = { small: number; large: number; gap: number };

/**
 * A 45°-rotated square is √2 wider than its side, so the row's visual box and
 * the diamond centres are both computed from the diagonal rather than the side.
 */
export function crownBox({ small, large, gap }: CrownGeometry) {
  const s = small * Math.SQRT2;
  const l = large * Math.SQRT2;
  return {
    width: s + gap + l + gap + s,
    height: l,
    centers: [s / 2, s + gap + l / 2, s + gap + l + gap + s / 2],
  };
}

const DELAYS = [0, 0.2, 0.4];

/**
 * The three diamonds as an SVG `<g>`, for composing inside a caller's own
 * `<svg>` — the wordmark sets the crown above a numeral, so it owns the
 * viewBox and passes the offsets it needs.
 */
export function CrownDiamonds({
  geometry,
  fill,
  offsetX = 0,
  centerY,
  pulse,
}: {
  geometry: CrownGeometry;
  fill: string;
  offsetX?: number;
  centerY?: number;
  pulse?: boolean;
}) {
  const { centers, height } = crownBox(geometry);
  const cy = centerY ?? height / 2;
  const sides = [geometry.small, geometry.large, geometry.small];

  return (
    <g>
      {centers.map((center, i) => {
        const cx = center + offsetX;
        const side = sides[i];
        return (
          <rect
            key={i}
            x={cx - side / 2}
            y={cy - side / 2}
            width={side}
            height={side}
            transform={`rotate(45, ${cx}, ${cy})`}
            fill={fill}
            className={pulse ? "anim-dots" : undefined}
            style={pulse ? { animationDelay: `${DELAYS[i]}s` } : undefined}
          />
        );
      })}
    </g>
  );
}

type Tone = "quiet" | "page" | "loud";

const TONES: Record<Tone, { geometry: CrownGeometry; color: string }> = {
  quiet: { geometry: { small: 8, large: 11, gap: 5 }, color: "var(--border-strong)" },
  page: { geometry: { small: 8, large: 11, gap: 5 }, color: "var(--accent-strong)" },
  loud: { geometry: { small: 15, large: 20, gap: 9 }, color: "var(--accent)" },
};

export function Crown({
  tone = "page",
  pulse,
  className,
}: {
  tone?: Tone;
  pulse?: boolean;
  className?: string;
}) {
  const { geometry, color } = TONES[tone];
  const { width, height } = crownBox(geometry);

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      // `block` because the crown it replaced was a flex row — a block box.
      // An inline `<svg>` sits on the text baseline, so in a plain block
      // container (`first-run.tsx`) it would gain a few pixels of descender
      // leading under the `mb-*` every caller sets. Callers in flex parents
      // are blockified anyway, so this changes nothing for them.
      className={className ? `block ${className}` : "block"}
    >
      <CrownDiamonds geometry={geometry} fill={color} pulse={pulse} />
    </svg>
  );
}
