// One axis's standing across the log. Geometry is role-counter-cell's, copied
// rather than imported: that cell draws one bar against a target, this one
// draws two segments against each other, and a shared primitive taking a
// discriminated union to serve both would be harder to read than the copy.
// role-counter-cell.tsx is READ here, never edited.
import { PATTERN_MIN, axisCopy, gameLogCopy } from "../../lib/copy/game-log";
import type { AxisTally } from "../../lib/decks/games";

export interface GameAxisCellProps {
  tally: AxisTally;
  /** Total games logged — the denominator, and what decides whether the bar takes colour. */
  gameCount: number;
}

export function GameAxisCell({ tally, gameCount }: GameAxisCellProps) {
  const marks = tally.worked + tally.hurt;
  // Below the threshold the bar is one neutral segment. Splitting it into
  // success and warning would claim a pattern from two games.
  const patterned = gameCount >= PATTERN_MIN;

  const figure =
    marks === 1
      ? tally.worked === 1
        ? gameLogCopy.cell.figureOneUp
        : gameLogCopy.cell.figureOneDown
      : gameLogCopy.cell.figure(String(marks), String(gameCount));

  return (
    <div className="w-full md:w-[200px] min-h-[44px] md:min-h-[72px] flex md:block items-center justify-between gap-[10px] rounded-[7px] md:rounded-[9px] px-[12px] py-[7px] md:px-[14px] md:py-[11px] bg-[color:var(--surface)] border border-[color:var(--border)]">
      <div className="min-w-0">
        <div className="font-mono uppercase truncate text-[8.5px] md:text-[10px] tracking-[0.06em] md:tracking-[0.1em] text-[color:var(--fg-body)]">
          {axisCopy[tally.key].label}
        </div>
        <div className="font-mono text-[8px] md:text-[9px] text-[color:var(--fg-faint)]">
          {gameCount === 1
            ? gameLogCopy.cell.subOneGame
            : gameLogCopy.cell.sub(String(tally.worked), String(tally.hurt))}
        </div>
      </div>

      <div className="font-mono font-semibold text-[13px] md:text-[16px] md:mt-[3px] text-[color:var(--fg)] tabular-nums whitespace-nowrap">
        {figure}
      </div>

      {/* Track and segments. No transition — the bar is a reading, not a change. */}
      <div className="hidden md:block rounded-full overflow-hidden mt-[8px] h-[5px] bg-[color:var(--elevated)]">
        {patterned ? (
          <div className="flex h-full">
            <div className="h-full" style={{ width: pct(tally.worked, marks), background: "var(--success)" }} />
            <div className="h-full" style={{ width: pct(tally.hurt, marks), background: "var(--warning)" }} />
          </div>
        ) : (
          <div className="h-full" style={{ width: "100%", background: "var(--border-strong)" }} />
        )}
      </div>
    </div>
  );
}

// A bar width, not a rendered figure. No string this produces reaches the
// screen — the percentage ban is about what the player reads, and a flex
// segment's width is not a claim about frequency.
function pct(part: number, whole: number): string {
  return whole === 0 ? "0%" : `${(part / whole) * 100}%`;
}
