"use client";

import type { ManaColor } from "../../lib/mana/supply";

// The Colors card's own drawing pieces (Deck stats), shared with Mana Balance's table so a bar
// means the same thing on both surfaces: a solid run of lands, a striped run of other sources.

export const PIP_STYLE: Record<ManaColor, { bg: string; ink: string }> = {
  W: { bg: "var(--w)", ink: "var(--pip-ink-dark)" },
  U: { bg: "var(--u)", ink: "var(--pip-ink-light)" },
  B: { bg: "var(--b)", ink: "var(--pip-ink-dark)" },
  R: { bg: "var(--r)", ink: "var(--pip-ink-black)" },
  G: { bg: "var(--g)", ink: "var(--pip-ink-light)" },
  C: { bg: "var(--fg-muted)", ink: "var(--pip-ink-dark)" },
};

const STRIPE = (c: ManaColor) =>
  `repeating-linear-gradient(135deg, ${PIP_STYLE[c].bg} 0 2px, transparent 2px 5px)`;

export function SourceBar({ c, lands, other, widthPct }: { c: ManaColor; lands: number; other: number; widthPct: number }) {
  const total = lands + other;
  if (total === 0) return null;
  return (
    <span
      className={`anim-grow-x origin-left flex h-[14px] flex-none gap-[1px] ${lands > 0 && other > 0 ? "min-w-[13px] md:min-w-[15px]" : "min-w-[8px] md:min-w-[10px]"}`}
      style={{ width: `${widthPct}%` }}
      data-source-bar
    >
      {lands > 0 ? (
        <span
          className={`h-full ${other > 0 ? "rounded-l-[3px]" : "rounded-[3px]"}`}
          style={{ flex: `${lands} 1 0`, minWidth: 4, background: PIP_STYLE[c].bg }}
          data-segment="land"
        />
      ) : null}
      {other > 0 ? (
        <span
          className={`h-full ${lands > 0 ? "rounded-r-[3px]" : "rounded-[3px]"}`}
          style={{ flex: `${other} 1 0`, minWidth: 4, backgroundImage: STRIPE(c), boxShadow: `inset 0 0 0 1px ${PIP_STYLE[c].bg}` }}
          data-segment="nonland"
        />
      ) : null}
    </span>
  );
}
