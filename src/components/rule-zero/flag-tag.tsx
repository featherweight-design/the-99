// The flag a seat carries when it sits a bracket or more from the table (Rule 0 handoff, decision 3): amber ▲
// `Above the table`, steel blue ▼ `Below the table`, violet ◂▸ `Split` on both seats of a two-seat split. NEVER COLOR
// ALONE: every tag is its glyph and its words, and the seat's border and the headline take the same ink.

import type { SeatFlag } from "../../lib/rule-zero/rules";
import { ruleZeroCopy } from "../../lib/copy/rule-zero";

export type FlagKind = "high" | "low" | "split";

export const flagKind = (flag: SeatFlag): FlagKind => (flag.split ? "split" : flag.dir);

/**
 * The three inks. High and low are the boards' `--warning` and `--fact`. Violet has no token of its own in any
 * theme, so the split takes `--avg-fewer`, the theme-independent violet the Stats curve already draws with
 * (oklch .70 .11 305, near the boards' own violet).
 */
export const FLAG_INK: Record<FlagKind, string> = {
  high: "var(--warning)",
  low: "var(--fact)",
  split: "var(--avg-fewer)",
};

export const flagWords = (kind: FlagKind): string =>
  kind === "high" ? ruleZeroCopy.seat.above : kind === "low" ? ruleZeroCopy.seat.below : ruleZeroCopy.seat.split;

const GLYPH: Record<FlagKind, string> = {
  high: "M5 1.5 9 8.5H1z",
  low: "M5 8.5 1 1.5h8z",
  split: "M1 5l3-3v6zM9 5 6 2v6z",
};

export function FlagTag({ kind }: { kind: FlagKind }) {
  return (
    <span
      data-testid="flag-tag"
      data-flag={kind}
      className="inline-flex h-[22px] flex-none items-center gap-[5px] whitespace-nowrap rounded-[6px] px-[8px] font-mono text-[10.5px] font-semibold tracking-[0.04em] text-[color:var(--bg)]"
      style={{ background: FLAG_INK[kind] }}
    >
      <svg viewBox="0 0 10 10" width={10} height={10} aria-hidden className="block">
        <path d={GLYPH[kind]} fill="currentColor" />
      </svg>
      {flagWords(kind)}
    </span>
  );
}
