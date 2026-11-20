"use client";

// History (handoff History.dc, H1 and H0), modelled on Help me choose's: every kept upgrade of this precon, newest first, grouped by month. Each row is
// `RunRow`, the start screen's row too (addendum fresh start, call 4), so it also says where the run went.
// Opening a row costs nothing. No delete and no filter.
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";
import type { PanelRun, UpgradePanel } from "../../../../lib/precons/upgrade/run";
import type { UpgradeArt } from "./pick-steps";
import { KICKER, RunRow } from "./run-row";

const copy = preconUpgradeCopy.history;

const month = (d: Date) => new Date(d).toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();

/** The runs a reader can open: every kept one, newest first, grouped by the month it was made in. */
export function monthGroups(runs: readonly PanelRun[]): { month: string; runs: PanelRun[] }[] {
  const groups: { month: string; runs: PanelRun[] }[] = [];
  for (const r of [...runs].filter((x) => x.status === "done").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())) {
    const m = month(r.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.month === m) last.runs.push(r);
    else groups.push({ month: m, runs: [r] });
  }
  return groups;
}

export function HistoryView({ panel, art, onOpen }: { panel: UpgradePanel; art: UpgradeArt; onOpen: (runId: string) => void }) {
  const groups = monthGroups(panel.runs);
  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex flex-col gap-[4px]">
        <p className="m-0 font-sans text-[16px] font-semibold text-[color:var(--fg)]">{copy.title}</p>
        <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-muted)]">{copy.sub}</p>
      </div>
      {groups.length === 0 ? (
        <div className="flex flex-col gap-[4px] rounded-[10px] border border-dashed border-[color:var(--border-strong)] p-[12px_14px]">
          <p className="m-0 text-[13.5px] font-semibold text-[color:var(--fg)]">{copy.empty.head}</p>
          <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{copy.empty.body}</p>
        </div>
      ) : (
        groups.map((g, gi) => (
          <section key={g.month} className="flex flex-col gap-[8px]">
            <h4 className={KICKER}>{g.month}</h4>
            <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
              {g.runs.map((r, ri) => (
                <li key={r.id} className="m-0">
                  {/* The newest run keeps a stronger edge, as the board draws it. */}
                  <RunRow panel={panel} art={art} run={r} strong={gi === 0 && ri === 0} onOpen={() => onOpen(r.id)} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      <p className="m-0 font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">{copy.foot}</p>
    </div>
  );
}
