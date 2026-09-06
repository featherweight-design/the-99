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
  /**
   * Which bucket drew the cell. Absent below the threshold, where there are no
   * buckets yet and the figure stays neutral.
   */
  bucket?: "fix" | "keep";
}

export function GameAxisCell({ tally, gameCount, bucket }: GameAxisCellProps) {
  const marks = tally.worked + tally.hurt;
  // Below the threshold the bar is one neutral segment and the figure takes no
  // ink. Either would claim a pattern from two games.
  const patterned = gameCount >= PATTERN_MIN;
  const oneGame = gameCount === 1;

  // The direction-and-count form belongs to N=1 alone. At N≥2 a single mark is
  // still `1 of 3`, because every figure on the panel carries its denominator.
  const figure =
    oneGame
      ? tally.worked === 1
        ? gameLogCopy.cell.figureOneUp
        : gameLogCopy.cell.figureOneDown
      : gameLogCopy.cell.figure(String(marks), String(gameCount));

  const figureInk =
    patterned && bucket
      ? bucket === "fix"
        ? "text-warning"
        : "text-success"
      : "text-fg-body";

  // Mobile reads label · sub · figure across one 44px row; desktop stacks a
  // label/figure baseline row, the bar, then the sub. One element per slot,
  // reordered at the breakpoint rather than drawn twice.
  return (
    <div className="w-full md:w-[200px] md:flex-none min-h-[44px] md:min-h-0 flex md:flex-wrap items-center md:items-baseline gap-x-[10px] md:gap-x-[8px] gap-y-0 rounded-[8px] md:rounded-[9px] px-[12px] md:px-[14px] md:py-[11px] bg-surface border border-border">
      <div className="flex-1 min-w-0 md:order-1 md:truncate text-[13px] md:font-mono md:uppercase md:text-[10px] md:tracking-[0.1em] text-fg md:text-fg-faint">
        {axisCopy[tally.key].label}
      </div>

      <div
        className={
          "flex-none md:order-2 font-mono font-semibold tabular-nums whitespace-nowrap md:text-[16px] " +
          (oneGame ? "text-[12px] " : "text-[13px] ") +
          figureInk
        }
      >
        {figure}
      </div>

      {/* Track and segments. No transition — the bar is a reading, not a change. */}
      <div className="hidden md:block md:order-3 md:w-full rounded-full overflow-hidden mt-[8px] h-[5px] bg-elevated">
        {patterned ? (
          <div className="flex h-full">
            <div className="h-full bg-success" style={{ width: pct(tally.worked, marks) }} />
            <div className="h-full bg-warning" style={{ width: pct(tally.hurt, marks) }} />
          </div>
        ) : (
          <div className="h-full w-full bg-border-strong" />
        )}
      </div>

      <div
        className={
          "flex-none md:order-4 md:w-full md:mt-[6px] font-mono md:text-[9.5px] " +
          (oneGame ? "text-[11px] text-fg-locked" : "text-[10.5px] text-fg-faint")
        }
      >
        {oneGame
          ? gameLogCopy.cell.subOneGame
          : gameLogCopy.cell.sub(String(tally.worked), String(tally.hurt))}
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
