// The lock glyph, one drawing at three sizes (small-polish handoff §1, plan 2026-10-14-small-polish PR 2): a solid
// body and a round-capped shackle, so the lock reads from the body's mass rather than from a heavier outline.
// It replaces the shell's outlined `Padlock` and is what `decks/lock-mark.tsx` draws.
//
// SVG, ink by `currentColor`, so it takes the colour of whatever surface draws it (`ink` sets it, otherwise the
// parent's text colour). The keyhole is CUT OUT of the body (`evenodd`) and shows the real ground; it used to be
// painted in `--bg`, which drew a dark dot on a `--surface` tile.
//
// Sizes (width x height): `sm` 9x12 (the tab bar's bracket; no keyhole, a 1px hole aliases at 1x), `md` 11x14
// (every deck site), `lg` 12x15 (the rail's foot, the first-run page line and cards). `open` drops the shackle's
// right leg; `sm` has no open state because nothing draws one.
//
// Decorative everywhere (`aria-hidden`): every locked thing already says its state in words.

export type LockSize = "sm" | "md" | "lg";

const DRAWING = {
  sm: {
    w: 9, h: 12, stroke: 1.3,
    shackle: "M2.4 5V3.1a2.1 2.1 0 0 1 4.2 0V5",
    shackleOpen: null,
    body: "M1.5 4.6h6A1.5 1.5 0 0 1 9 6.1v4.4A1.5 1.5 0 0 1 7.5 12h-6A1.5 1.5 0 0 1 0 10.5V6.1A1.5 1.5 0 0 1 1.5 4.6Z",
  },
  md: {
    w: 11, h: 14, stroke: 1.6,
    shackle: "M2.8 6V3.8a2.7 2.7 0 0 1 5.4 0V6",
    shackleOpen: "M2.8 6V3.8a2.7 2.7 0 0 1 5.4 0",
    body: "M2 5.8h7a2 2 0 0 1 2 2V12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V7.8a2 2 0 0 1 2-2Zm3.5 3.1a1 1 0 1 0 0 2a1 1 0 1 0 0-2Z",
  },
  lg: {
    w: 12, h: 15, stroke: 1.6,
    shackle: "M3 6.5V4a3 3 0 0 1 6 0v2.5",
    shackleOpen: "M3 6.5V4a3 3 0 0 1 6 0",
    body: "M2 6h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm4 2.4a1.3 1.3 0 0 0-.6 2.45v1.35h1.2v-1.35A1.3 1.3 0 0 0 6 8.4Z",
  },
} as const;

export function Lock({
  size = "md", open = false, ink, className,
}: {
  size?: LockSize;
  /** The shackle's right leg lifted. `md` and `lg` only. */
  open?: boolean;
  /** A CSS colour for the glyph; omitted, it takes the parent's text colour. */
  ink?: string;
  className?: string;
}) {
  const d = DRAWING[size];
  const lifted = open && d.shackleOpen !== null;
  return (
    <svg
      width={d.w}
      height={d.h}
      viewBox={`0 0 ${d.w} ${d.h}`}
      aria-hidden="true"
      focusable="false"
      data-lock-size={size}
      data-lock-state={lifted ? "open" : "closed"}
      className={className}
      style={ink ? { color: ink } : undefined}
    >
      <path
        data-lock-part="shackle"
        d={lifted ? d.shackleOpen : d.shackle}
        fill="none"
        stroke="currentColor"
        strokeWidth={d.stroke}
        strokeLinecap="round"
      />
      <path data-lock-part="body" d={d.body} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
