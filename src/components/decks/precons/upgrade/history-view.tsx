"use client";

// History (handoff History.dc, H1 and H0), modelled on Help me choose's: every kept upgrade of this precon, newest first, grouped by month. A row is the
// picks in words with the strategy glyph, then the commander's thumb, the swaps, the day and a chevron. A short run is listed as `9 swaps · credits back`.
// Opening a row costs nothing. No delete and no filter.
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";
import type { PanelRun, UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { StrategyIcon } from "../../strategy-icon";
import { leadOf, runDay } from "./result-view";
import type { UpgradeArt } from "./pick-steps";
import type { StrategyKey } from "@/lib/strategy/score";

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
            <h4 className="m-0 font-mono text-[9.5px] font-normal uppercase tracking-[0.1em] text-[color:var(--fg-faint)]">{g.month}</h4>
            <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
              {g.runs.map((r, ri) => {
                const lead = leadOf(panel, r);
                // The short name (before the comma), as the board writes it: `Rootha, Mastering the Moment` reads `Rootha`.
                const name = lead ? lead.cards.map((c) => c.name.split(",")[0]).join(" + ") : "";
                const uri = lead ? art.get(lead.cards[0]?.oracleId ?? "") ?? null : null;
                const key = r.strategyKey.split("/")[2] ?? "";
                return (
                  <li key={r.id} className="m-0">
                    <button
                      type="button"
                      onClick={() => onOpen(r.id)}
                      // The newest run keeps a stronger edge, as the board draws it.
                      className={"flex w-full cursor-pointer flex-col gap-[8px] rounded-[10px] border border-solid bg-[color:var(--surface)] p-[10px_12px] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] "
                        + (gi === 0 && ri === 0 ? "border-[color:var(--border-strong)]" : "border-[color:var(--border)]")}
                    >
                      <span className="flex items-center gap-[8px] text-[13px] font-semibold text-[color:var(--fg)]">
                        <StrategyIcon strategy={key as StrategyKey} size={14} className="flex-none text-[color:var(--fg-muted)]" />
                        <span className="min-w-0 flex-1 truncate">{copy.row(r.strategyLabel, name, r.bracketTarget ?? r.bracketAfter)}</span>
                      </span>
                      <span className="flex items-center gap-[10px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">
                        {uri ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={uri} alt="" loading="lazy" className="h-[26px] w-[26px] flex-none rounded-[4px] object-cover" />
                        ) : (
                          <span aria-hidden className="h-[26px] w-[26px] flex-none rounded-[4px] bg-[color:var(--surface-sunken)]" />
                        )}
                        <span className="min-w-0 flex-1">{r.refunded ? copy.short(r.pairs.length) : copy.swaps(r.pairs.length)}</span>
                        <span>{runDay(r.createdAt)} <span aria-hidden>›</span></span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
      <p className="m-0 font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">{copy.foot}</p>
    </div>
  );
}
