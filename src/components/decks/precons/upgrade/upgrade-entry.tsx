"use client";

// E1, the page's one press (handoff Entry.dc, Hugh picked B): a bare button under the Overview, accent outline on a 10% accent tint, full width on
// a phone and its own width at 1300. No icon and no line beside it, because the flow's first screen explains it. The shipped `line-pulse` plays
// twice when it first scrolls into view on a visit, and twice again each time a run lands while the window is closed (addendum A3, G21), then
// rests (the stylesheet drops it under reduced motion).
import { useRef, useState } from "react";
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";
import type { UpgradePanel } from "../../../../lib/precons/upgrade/run";
import type { UpgradePicks } from "../../../../lib/precons/upgrade/apply";
import { StartPreconDialog, type StartPreconProps, type UpgradeStart } from "../start-precon";
import { BRACKET_NAMES } from "../../../../lib/copy/deck-analysis";
import { upgradeSetBracketAction } from "../../../../lib/precons/upgrade/actions";
import { UpgradeFlow } from "./upgrade-flow";
import { leadOf } from "./result-view";
import type { UpgradeArt } from "./pick-steps";
import { useClock } from "./wait-view";
import { runningLabel, useLinePulse, useUpgradeRun, type Picks } from "./use-upgrade-run";


/** The press's label while a run is in flight: `Upgrading toward Spells · 0:04`, the clock running from when it began. */
function Running({ strategy, startedAt }: { strategy: string; startedAt: number }) {
  return <>{preconUpgradeCopy.entry.running(strategy, useClock(startedAt))}</>;
}

export function UpgradeEntry({ fileName, precon, panel: initial, art, start }: { fileName: string; precon: string; panel: UpgradePanel; art: UpgradeArt; start: StartPreconProps }) {
  const { panel, view, pending, open, setOpen, close, refresh, confirm, landed, onSeen, savePicks } = useUpgradeRun(fileName, initial);
  // The run a deck is being started from (the Start dialog over the flow) with the adds and cuts picked on its result, and its
  // add-attempt slot, kept past the dialog so a retry lands on the deck it made.
  const [starting, setStarting] = useState<{ runId: string; picks: UpgradePicks } | null>(null);
  // A plain map held in state (never replaced), one slot per run: a retry of one run lands on its deck, and another run never inherits its id.
  const [adds] = useState(() => new Map<string, { id: string | null }>());
  // The picked set's bracket (fresh start R2), the read the result's bar makes: keyed on the run and picks it was read for, so a read
  // for another start never lands on this one. While it is read, or when it cannot be, the fact stays off.
  const [setRead, setSetRead] = useState<{ key: string; bracket: number | null } | null>(null);
  const startKey = starting ? readKey(starting.runId, starting.picks) : null;
  const full = starting ? allPicked(panel, starting.runId, starting.picks) : undefined;
  const setBracket = full !== undefined ? full : setRead !== null && setRead.key === startKey ? setRead.bracket : null;
  const startingUpgrade = starting ? startFor(panel, starting.runId, art, starting.picks, setBracket) : null;

  const onStart = (runId: string, picks: UpgradePicks) => {
    setStarting({ runId, picks });
    // Every swap picked plays at the run's own bracket, so there is nothing to read.
    if (allPicked(panel, runId, picks) !== undefined) return;
    const key = readKey(runId, picks);
    void upgradeSetBracketAction(fileName, runId, picks.adds, picks.cuts)
      .then((r) => setSetRead({ key, bracket: r?.bracket ?? null }), () => setSetRead({ key, bracket: null }));
  };

  const button = useRef<HTMLButtonElement>(null);
  const pulse = useLinePulse(button, landed);

  return (
    <>
      <div className="flex">
        <button
          ref={button}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="relative h-[46px] w-full cursor-pointer rounded-[10px] border border-solid border-[color:var(--accent)] bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)] px-[18px] font-sans text-[14px] font-semibold text-[color:var(--accent-text)] md:h-[40px] md:w-auto md:text-[13px]"
        >
          {view.kind === "wait" ? <Running strategy={runningLabel(panel, view, pending?.id ?? null)} startedAt={view.startedAt} /> : preconUpgradeCopy.entry.press}
          {pulse > 0 && <span key={pulse} aria-hidden className="anim-line-pulse pointer-events-none absolute inset-0 rounded-[10px]" />}
        </button>
      </div>
      {open && (
        <UpgradeFlow
          key={view.kind === "results" ? `results:${view.runId}` : view.kind}
          fileName={fileName}
          precon={precon}
          panel={panel}
          art={art}
          view={view}
          onClose={close}
          onReread={() => void refresh(true)}
          onSeen={onSeen}
          onConfirm={(p) => void confirm(p as Picks)}
          onRetry={view.kind === "failed" ? () => void confirm(view.picks) : undefined}
          onStart={onStart}
          onPicked={savePicks}
        />
      )}
      {startingUpgrade && (
        <StartPreconDialog
          {...start}
          // The run belongs to the plain edition's file whichever edition the page shows, so that is the file the start names.
          addFileName={fileName}
          addRef={{ current: slotFor(adds, startingUpgrade.runId) }}
          onDismiss={() => setStarting(null)}
          // A refusal means the run no longer fits: read the panel again so its Start goes off with the reason.
          onUnavailable={() => { void refresh(true); }}
          upgrade={startingUpgrade}
        />
      )}
    </>
  );
}

const readKey = (runId: string, picks: UpgradePicks) => `${runId}|${picks.adds.join(",")}|${picks.cuts.join(",")}`;

/** The run's own bracket when every one of its adds and cuts is picked; undefined when only some are (the set's bracket is read). */
function allPicked(panel: UpgradePanel, runId: string, picks: UpgradePicks): number | null | undefined {
  const run = panel.runs.find((r) => r.id === runId);
  if (!run) return undefined;
  const adds = new Set(run.pairs.map((p) => p.addId));
  const cuts = new Set(run.pairs.map((p) => p.cutId));
  const all = adds.size === picks.adds.length && cuts.size === picks.cuts.length
    && picks.adds.every((id) => adds.has(id)) && picks.cuts.every((id) => cuts.has(id));
  return all ? (run.bracketAfter ?? run.bracketTarget) : undefined;
}

/** The Start dialog's view of a run: who leads, the swaps picked, the picked set's bracket in the player's words (`after`, null
 *  leaves the fact off), and what is left to buy of the picked adds. The picks go to the start, which makes exactly those (fresh start R2). */
function startFor(panel: UpgradePanel, runId: string, art: UpgradeArt, picks: UpgradePicks, after: number | null): UpgradeStart | null {
  const run = panel.runs.find((r) => r.id === runId);
  const lead = run ? leadOf(panel, run) : null;
  const box = panel.commanders.find((c) => c.isFace);
  if (!run || !lead || !box) return null;
  const names = (c: typeof lead) => c.cards.map((k) => k.name).join(" + ");
  return {
    runId: run.id,
    lead: {
      name: names(lead),
      art: art.get(lead.cards[0]?.oracleId ?? "") ?? null,
      identity: [...new Set(lead.cards.flatMap((k) => panel.cards[k.oracleId]?.identity ?? []))],
    },
    boxCommander: names(box),
    changed: !lead.isFace,
    swaps: picks.adds.length,
    strategy: run.strategyLabel,
    bracket: after !== null && after in BRACKET_NAMES ? preconUpgradeCopy.start.bracketFact(run.bracketBefore, after, BRACKET_NAMES[after as 1 | 2 | 3 | 4 | 5]) : null,
    toBuy: picks.adds.filter((id) => !panel.cards[id]?.owned).length,
    picks,
  };
}

function slotFor(adds: Map<string, { id: string | null }>, runId: string): { id: string | null } {
  let slot = adds.get(runId);
  if (!slot) { slot = { id: null }; adds.set(runId, slot); }
  return slot;
}
