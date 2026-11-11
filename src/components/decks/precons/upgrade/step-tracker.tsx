"use client";

// The flow's step tracker (handoff R2c, STATES "Applies everywhere"): one bounded strip under the title, a cell per step. The current cell
// is raised with an accent edge and its number; a done cell shows a filled tick, the step name and its pick inside the cell, and presses
// back to that step; later cells show only their number and name.
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";
import type { PickStep } from "../../../../lib/precons/upgrade/flow";

const copy = preconUpgradeCopy.flow;

export type TrackerCell = { step: PickStep; pick: string | null };

export function StepTracker({ cells, current, onGo }: { cells: TrackerCell[]; current: PickStep | null; onGo?: (step: PickStep) => void }) {
  return (
    <ol className="m-0 flex flex-none list-none gap-[4px] rounded-[10px] bg-[color:var(--surface-sunken)] p-[4px]" aria-label={copy.stepsLabel}>
      {cells.map((cell, i) => {
        const here = cell.step === current;
        const done = !here && cell.pick !== null;
        const inner = (
          <>
            <span aria-hidden className={"flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full font-mono text-[10px] "
              + (done ? "bg-[color:var(--accent)] text-[color:var(--bg)]" : here ? "border border-solid border-[color:var(--accent)] text-[color:var(--accent-text)]" : "border border-solid border-[color:var(--border-strong)]")}>
              {done ? "✓" : i + 1}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className={"font-mono text-[9.5px] uppercase tracking-[0.08em] " + (here ? "font-semibold text-[color:var(--fg)]" : "")}>{copy.steps[cell.step]}</span>
              {done && <span className="block min-w-0 truncate text-[12px] text-[color:var(--fg)]">{cell.pick}</span>}
            </span>
            {here && <span className="sr-only">{copy.choosing}</span>}
          </>
        );
        const cls = "flex min-h-[44px] min-w-0 flex-1 items-center gap-[8px] rounded-[7px] px-[10px] py-[6px] text-left md:min-h-[40px] "
          + (here
            ? "border border-solid border-[color:var(--accent)] bg-[color:var(--elevated)] text-[color:var(--fg)]"
            : "border border-solid border-transparent text-[color:var(--fg-faint)]");
        return (
          <li key={cell.step} className="flex min-w-0 flex-1" aria-current={here ? "step" : undefined}>
            {done && onGo ? (
              <button type="button" onClick={() => onGo(cell.step)} className={`${cls} cursor-pointer bg-transparent`}>{inner}</button>
            ) : (
              <span className={cls}>{inner}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
