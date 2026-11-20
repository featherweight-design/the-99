"use client";

// One kept run as a row (addendum fresh start, call 4): History's row, shared by History and the start screen's `Your last upgrade`, so the
// two always agree. The picks in words with the strategy glyph, then the commander's thumb, the swaps, the day and a chevron. Its mono second
// line also says where the run went: `in <deck>` (faint) once a deck was started from it or it was applied, else `no deck yet` in
// --accent-text, because it can still be started or applied. That line wraps on a phone rather than cutting the deck's name. Opening it is free.
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";
import type { PanelRun, UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { StrategyIcon } from "../../strategy-icon";
import { leadOf, runDay } from "./result-view";
import type { UpgradeArt } from "./pick-steps";
import type { StrategyKey } from "@/lib/strategy/score";

const copy = preconUpgradeCopy.history;

/** The month heads' mono kicker (History's and the start screen's). */
export const KICKER = "m-0 font-mono text-[9.5px] font-normal uppercase tracking-[0.1em] text-[color:var(--fg-faint)]";

/** `strong`: the newest kept run's stronger `--border-strong` edge, in History and on the start screen. */
export function RunRow({ panel, art, run, strong, onOpen }: { panel: UpgradePanel; art: UpgradeArt; run: PanelRun; strong: boolean; onOpen: () => void }) {
  const lead = leadOf(panel, run);
  // The short name (before the comma), as the board writes it: `Rootha, Mastering the Moment` reads `Rootha`.
  const name = lead ? lead.cards.map((c) => c.name.split(",")[0]).join(" + ") : "";
  const uri = lead ? art.get(lead.cards[0]?.oracleId ?? "") ?? null : null;
  const key = run.strategyKey.split("/")[2] ?? "";
  return (
    <button
      type="button"
      onClick={onOpen}
      data-run-row={run.id}
      className={"flex w-full cursor-pointer flex-col gap-[8px] rounded-[10px] border border-solid bg-[color:var(--surface)] p-[10px_12px] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] "
        + (strong ? "border-[color:var(--border-strong)]" : "border-[color:var(--border)]")}
    >
      <span className="flex items-center gap-[8px] text-[13px] font-semibold text-[color:var(--fg)]">
        <StrategyIcon strategy={key as StrategyKey} size={14} className="flex-none text-[color:var(--fg-muted)]" />
        <span className="min-w-0 flex-1 truncate">{copy.row(run.strategyLabel, name, run.bracketTarget ?? run.bracketAfter)}</span>
      </span>
      <span className="flex items-center gap-[10px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">
        {uri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={uri} alt="" loading="lazy" className="h-[26px] w-[26px] flex-none rounded-[4px] object-cover" />
        ) : (
          <span aria-hidden className="h-[26px] w-[26px] flex-none rounded-[4px] bg-[color:var(--surface-sunken)]" />
        )}
        <span data-run-went className="min-w-0 flex-1 break-words">
          {run.refunded ? copy.short(run.pairs.length) : copy.swaps(run.pairs.length)}
          {" · "}
          {run.deck ? copy.inDeck(run.deck.name) : <span className="text-[color:var(--accent-text)]">{copy.notYet}</span>}
        </span>
        <span className="flex-none">{runDay(run.createdAt)} <span aria-hidden>›</span></span>
      </span>
    </button>
  );
}

/** The newest kept run, the one the start screen names: by when it was made, as History orders them. Null when none is kept. */
export function lastRun(runs: readonly PanelRun[]): PanelRun | null {
  let newest: PanelRun | null = null;
  for (const r of runs) {
    if (r.status === "done" && (!newest || new Date(r.createdAt).getTime() > new Date(newest.createdAt).getTime())) newest = r;
  }
  return newest;
}

/** The start screen's acknowledgement (call 2): the kicker over the newest kept run's row, at its stronger edge, above the intro's lead. */
export function LastRun({ panel, art, run, onOpen }: { panel: UpgradePanel; art: UpgradeArt; run: PanelRun; onOpen: () => void }) {
  return (
    <section data-last-run className="flex flex-col gap-[8px]">
      <h4 className={KICKER}>{copy.kicker}</h4>
      <RunRow panel={panel} art={art} run={run} strong onOpen={onOpen} />
    </section>
  );
}
