"use client";

// E1, the page's one press (handoff Entry.dc, Hugh picked B): a bare button under the Overview, accent outline on a 10% accent tint, full width on
// a phone and its own width at 1300. No icon and no line beside it, because the flow's first screen explains it. The shipped `line-pulse` plays
// twice when it first scrolls into view on a visit, and twice again each time a run lands while the window is closed (addendum A3, G21), then
// rests (the stylesheet drops it under reduced motion).
import { useRef, useState } from "react";
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";
import type { UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { StartPreconDialog, type StartPreconProps, type UpgradeStart } from "../start-precon";
import { BRACKET_NAMES } from "../../../../lib/copy/deck-analysis";
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
  const { panel, view, pending, open, setOpen, close, refresh, confirm, landed } = useUpgradeRun(fileName, initial);
  // The run a deck is being started from (the Start dialog over the flow), and its add-attempt slot, kept past the dialog so a retry lands on the deck it made.
  const [starting, setStarting] = useState<string | null>(null);
  // A plain map held in state (never replaced), one slot per run: a retry of one run lands on its deck, and another run never inherits its id.
  const [adds] = useState(() => new Map<string, { id: string | null }>());
  const startingUpgrade = starting ? startFor(panel, starting, art) : null;

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
          onConfirm={(p) => void confirm(p as Picks)}
          onRetry={view.kind === "failed" ? () => void confirm(view.picks) : undefined}
          onStart={(id) => setStarting(id)}
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

/** The Start dialog's view of a run: who leads, the swaps, the bracket in the player's words, and what is left to buy. */
function startFor(panel: UpgradePanel, runId: string, art: UpgradeArt): UpgradeStart | null {
  const run = panel.runs.find((r) => r.id === runId);
  const lead = run ? leadOf(panel, run) : null;
  const box = panel.commanders.find((c) => c.isFace);
  if (!run || !lead || !box) return null;
  const after = run.bracketAfter ?? run.bracketTarget;
  if (after === null || !(after in BRACKET_NAMES)) return null;
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
    swaps: run.pairs.length,
    strategy: run.strategyLabel,
    bracket: preconUpgradeCopy.start.bracketFact(run.bracketBefore, after, BRACKET_NAMES[after as 1 | 2 | 3 | 4 | 5]),
    toBuy: run.toBuy.cards,
  };
}

function slotFor(adds: Map<string, { id: string | null }>, runId: string): { id: string | null } {
  let slot = adds.get(runId);
  if (!slot) { slot = { id: null }; adds.set(runId, slot); }
  return slot;
}
