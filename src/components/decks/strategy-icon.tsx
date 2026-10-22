// The icon each strategy goes by on the strategy ring's legend and on its centre medallion (handoff
// `design_handoff_the99_strategy_focus`, Ring-Centre D, R2g). Five are the handoff's own drawings (Tokens, Spells matter,
// Evasion, +1/+1 counters, and the three spears every creature type shares); the rest are drawn to match them: a 24-unit
// grid, no fill, a 1.6 stroke in `currentColor` with round caps and joins, one to four shapes each. A strategy with no
// glyph of its own (a theme added later) draws the dashed fallback until it gets one.
import type { ReactNode } from "react";
import type { LabelTheme } from "@/lib/labels/types";
import type { FixedAxis } from "@/lib/strategy/axes";
import type { StrategyKey } from "@/lib/strategy/score";

type Glyph = LabelTheme | FixedAxis | "typal" | "fallback";

/** The spears every creature type is drawn with, and the `tribal` theme a creature type replaces. */
const SPEARS = <path d="M7 4l-2.5 15M12 3v17M17 4l2.5 15" />;

export const STRATEGY_GLYPHS: Record<Glyph, ReactNode> = {
  // The handoff's five.
  tokens: (<><circle cx="12" cy="12" r="9" /><path d="M12 6.5l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" /></>),
  spellslinger: <path d="M13.5 2.5L5 13.5h6l-1.5 8 8.5-11h-6z" />,
  evasion: <path d="M3 15c3-7 9-11 18-11-2 3-4 4.5-7 5 2 .5 3.5.3 5-.5-2 4-5 6-9 6 1 .7 2.3 1 4 1-3 2.5-7 2.5-11-.5z" />,
  counters: (<><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M7 12h4M9 10v4M15 9v6" /></>),
  typal: SPEARS,
  tribal: SPEARS,

  // Label themes.
  pump: (<><path d="M12 19V5M6.5 10.5L12 5l5.5 5.5" /><path d="M5 20h14" /></>),
  haste: (<><path d="M3 8h6M2.5 12h6.5M3 16h6" /><path d="M13 6l6 6-6 6" /></>),
  etbDraw: (<><rect x="9" y="3.5" width="11" height="16" rx="2" /><path d="M3 11.5h8M8 8.5l3 3-3 3" /></>),
  draw: (<><rect x="8" y="3.5" width="11" height="15" rx="2" /><path d="M5 7.5v11a2 2 0 0 0 2 2h8" /></>),
  treasure: (<><path d="M7 4h10l4 5-9 11L3 9z" /><path d="M3 9h18M9.5 4L12 9l2.5-5" /></>),
  protection: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />,
  recursion: (<><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path d="M19.5 3.5v4h-4" /></>),
  blink: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />,
  finisher: (<><path d="M5.5 21V3.5" /><path d="M5.5 4h12l-2.5 4 2.5 4h-12" /></>),
  castFree: (<><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="3" ry="4.5" /></>),
  mill: (<><path d="M5 5h14M5 9h14" /><path d="M12 12.5V21M8 17l4 4 4-4" /></>),
  sacOutlet: (<><path d="M12 2.5l2 3v8.5h-4V5.5z" /><path d="M7 14h10M12 14v7" /></>),
  deathTrigger: (<><path d="M5 11a7 7 0 0 1 14 0v4l-2 1v4H7v-4l-2-1z" /><circle cx="9.5" cy="12" r="1.3" /><circle cx="14.5" cy="12" r="1.3" /></>),
  lifegain: (<><path d="M12 20s-7.5-4.5-7.5-10A4 4 0 0 1 12 7.5 4 4 0 0 1 19.5 10c0 5.5-7.5 10-7.5 10z" /><path d="M12 9.5v5M9.5 12h5" /></>),
  drain: (<><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /><path d="M9.5 14.5h5" /></>),
  landfall: <path d="M2.5 19l6.5-11 4 6.5 3-4.5 5.5 9z" />,
  graveyardHate: (<><path d="M7 20V9.5a5 5 0 0 1 10 0V20" /><path d="M4 20h16" /><path d="M4 4l16 16" /></>),
  discard: (<><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M9.5 9.5l5 5M14.5 9.5l-5 5" /></>),
  stax: (<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  clones: (<><rect x="8.5" y="8.5" width="12" height="12" rx="2" /><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" /></>),
  theft: (<><path d="M6 3.5V12a6 6 0 0 0 12 0V3.5" /><path d="M6 8h4M14 8h4" /></>),
  poison: <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" />,
  goad: (<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3" /></>),
  doublers: (<><path d="M4.5 8l6 8M10.5 8l-6 8" /><path d="M14 9a2.5 2.5 0 0 1 5 0c0 2-5 4-5 7h5" /></>),
  fog: <path d="M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 9a4.5 4.5 0 0 1 0 9z" />,

  // Type-line axes.
  artifacts: (<><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /><path d="M12 2.5v3.5M12 18v3.5M2.5 12H6M18 12h3.5M5.3 5.3l2.4 2.4M16.3 16.3l2.4 2.4M18.7 5.3l-2.4 2.4M7.7 16.3l-2.4 2.4" /></>),
  enchantments: <path d="M19 14.5A7.5 7.5 0 1 1 9.5 5 6 6 0 0 0 19 14.5z" />,
  voltron: (<><path d="M20 4l-1 4-8.5 8.5-3-3L16 5z" /><path d="M5.5 12.5l6 6M8.5 15.5L4.5 19.5" /></>),
  vehicles: (<><path d="M3 15.5V9h11l4 3h3v3.5" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></>),
  bigCreatures: (<><path d="M8 20.5c-2 0-3.2-2-2.2-4 1.8-3.4 10.6-3.4 12.4 0 1 2-.2 4-2.2 4z" /><circle cx="6.5" cy="10" r="1.7" /><circle cx="12" cy="7" r="1.7" /><circle cx="17.5" cy="10" r="1.7" /></>),

  fallback: <circle cx="12" cy="12" r="8" strokeDasharray="2.5 3" />,
};

/** The glyph a strategy draws: a creature type shares the spears. */
export function glyphOf(key: StrategyKey): Glyph {
  if (key.startsWith("typal:")) return "typal";
  return key in STRATEGY_GLYPHS ? (key as Glyph) : "fallback";
}

export function StrategyIcon({ strategy, size = 16, className }: { strategy: StrategyKey; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      data-glyph={glyphOf(strategy)}
      className={className}
    >
      {STRATEGY_GLYPHS[glyphOf(strategy)]}
    </svg>
  );
}
