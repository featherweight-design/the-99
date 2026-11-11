"use client";

// The flow's step tracker (handoff R2c, STATES "Applies everywhere"): one bounded strip under the title, a cell per step. The current cell
// is raised with an accent edge and its number; a done cell shows a filled tick, the step name and its pick inside the cell, and presses
// back to that step; later cells show only their number and name.
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";
import type { PickStep } from "../../../../lib/precons/upgrade/flow";

const copy = preconUpgradeCopy.flow;

export type TrackerCell = { step: PickStep; pick: string | null };

export function StepTracker({ cells, current, onGo }: { cells: TrackerCell[]; current: PickStep; onGo: (step: PickStep) => void }) {
  return (
    <ol className="m-0 flex flex-none list-none gap-[4px] rounded-[10px] bg-[color:var(--surface-sunken)] p-[4px]" aria-label={copy.title("")}>
      {cells.map((cell, i) => {
        const here = cell.step === current;
        const done = !here && cell.pick !== null;
        const inner = (
          <>
            <span className="flex items-center gap-[6px] font-mono text-[10px] uppercase tracking-[0.08em]">
              {done ? <span aria-hidden className="text-[color:var(--accent-text)]">✓</span> : <span aria-hidden>{i + 1}</span>}
              <span>{copy.steps[cell.step]}</span>
            </span>
            {done && <span className="block min-w-0 truncate text-[12px] text-[color:var(--fg)]">{cell.pick}</span>}
            {here && <span className="sr-only">{copy.choosing}</span>}
          </>
        );
        const cls = "flex min-h-[44px] min-w-0 flex-1 flex-col justify-center gap-[2px] rounded-[7px] px-[10px] py-[6px] text-left md:min-h-[40px] "
          + (here
            ? "border border-solid border-[color:var(--accent)] bg-[color:var(--surface)] text-[color:var(--fg)]"
            : "border border-solid border-transparent text-[color:var(--fg-faint)]");
        return (
          <li key={cell.step} className="flex min-w-0 flex-1" aria-current={here ? "step" : undefined}>
            {done ? (
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
