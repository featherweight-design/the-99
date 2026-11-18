"use client";

// Addendum fresh start (R1): one run as a row, shared by the start screen's "Your last upgrade" and History. History.dc's row (shipped
// history-view.tsx), with one addition on its second line: where the run went. Used in a deck, it names the deck (G26); not yet, it says so
// in --accent-text, because it can still be started or applied. Opening it costs nothing.
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";
import type { PanelRun, UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { StrategyIcon } from "../../strategy-icon";
import { leadOf, runDay } from "./result-view";
import type { UpgradeArt } from "./pick-steps";
import type { StrategyKey } from "@/lib/strategy/score";

const copy = preconUpgradeCopy.history;
export const freshCopy = {
  kicker: "Your last upgrade",
  inDeck: (deck: string) => `in ${deck}`,
  notYet: "no deck yet",
  usedNote: (deck: string) => `Already in ${deck}. Opening it again uses no credit.`,
};

export function RunRow({ panel, art, run, deck, strong, onOpen }: { panel: UpgradePanel; art: UpgradeArt; run: PanelRun; deck: string | null; strong: boolean; onOpen: () => void }) {
  const lead = leadOf(panel, run);
  const name = lead ? lead.cards.map((c) => c.name.split(",")[0]).join(" + ") : "";
  const uri = lead ? art.get(lead.cards[0]?.oracleId ?? "") ?? null : null;
  const key = run.strategyKey.split("/")[2] ?? "";
  return (
    <button
      type="button"
      onClick={onOpen}
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
        <span className="min-w-0 flex-1">
          {run.refunded ? copy.short(run.pairs.length) : copy.swaps(run.pairs.length)}
          {" · "}
          {deck ? freshCopy.inDeck(deck) : <span className="text-[color:var(--accent-text)]">{freshCopy.notYet}</span>}
        </span>
        <span className="flex-none">{runDay(run.createdAt)} <span aria-hidden>›</span></span>
      </span>
    </button>
  );
}

/** The start screen's acknowledgement: the newest kept run, above the intro. Only when there is one. */
export function LastRun({ panel, art, run, deck, onOpen }: { panel: UpgradePanel; art: UpgradeArt; run: PanelRun; deck: string | null; onOpen: () => void }) {
  return (
    <section className="flex flex-col gap-[8px]">
      <h4 className="m-0 font-mono text-[9.5px] font-normal uppercase tracking-[0.1em] text-[color:var(--fg-faint)]">{freshCopy.kicker}</h4>
      <RunRow panel={panel} art={art} run={run} deck={deck} strong onOpen={onOpen} />
    </section>
  );
}
