import type { CSSProperties } from "react";

/**
 * Three cards shuffling through one another while Suggested changes reads (placement addendum
 * v2, canvas :717-727). A new drawing rather than a state of the shipped `CardFanMark`: that mark
 * is a static SVG sized for an empty state, with no numeral, and this one animates three cards
 * with the front one carrying `99`.
 *
 * Decorative: the heading beside it is the live region. Under reduced motion the animation is
 * dropped and each card holds the fanned pose its inline transform gives it.
 */
const SIZES = {
  desktop: { box: 120, w: 46, h: 70, dx: 17, face: 18, radius: 7 },
  phone: { box: 96, w: 38, h: 58, dx: 14, face: 15, radius: 5 },
} as const;

const CARDS = [
  { background: "var(--elevated)", border: "var(--border-strong)", still: (dx: number) => `translateX(${-dx}px) rotate(-18deg)` },
  { background: "var(--surface-raised)", border: "var(--border-dashed)", still: () => "none" },
  {
    background: "color-mix(in srgb, var(--accent) 14%, var(--surface))",
    border: "var(--accent)",
    still: (dx: number) => `translateX(${dx}px) rotate(18deg)`,
  },
] as const;

export function FanShuffle({ size }: { size: keyof typeof SIZES }) {
  const s = SIZES[size];
  return (
    <span
      aria-hidden
      className="relative flex flex-none items-center justify-center"
      style={{ width: s.box, height: s.box, "--fan-dx": `${s.dx}px` } as CSSProperties}
    >
      {CARDS.map((card, k) => (
        <span
          key={k}
          data-testid="fan-card"
          className="anim-fan-shuffle absolute box-border flex items-center justify-center"
          style={{
            width: s.w,
            height: s.h,
            borderRadius: s.radius,
            border: `1.5px solid ${card.border}`,
            background: card.background,
            transform: card.still(s.dx),
            animationDelay: `${-k * 0.8}s`,
          }}
        >
          {k === 2 ? (
            <span className="font-display font-extrabold" style={{ fontSize: s.face, color: "var(--accent)" }}>
              99
            </span>
          ) : null}
        </span>
      ))}
    </span>
  );
}
