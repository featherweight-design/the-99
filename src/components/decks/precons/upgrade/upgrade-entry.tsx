"use client";

// E1, the page's one press (handoff Entry.dc, Hugh picked B): a bare button under the Overview, accent outline on a 10% accent tint, full width on
// a phone and its own width at 1300. No icon and no line beside it, because the flow's first screen explains it. The shipped `line-pulse` plays
// twice when it first scrolls into view on a visit, then rests (the stylesheet drops it under reduced motion).
import { useCallback, useEffect, useRef, useState } from "react";
import { pressUpgradeAction, readUpgradeAction } from "../../../../lib/precons/upgrade/actions";
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";
import { viewOf, type RunView } from "../../../../lib/precons/upgrade/flow";
import type { UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { runKey, type BracketTarget } from "../../../../lib/precons/upgrade/targets";
import { StartPreconDialog, type StartPreconProps, type UpgradeStart } from "../start-precon";
import { BRACKET_NAMES } from "../../../../lib/copy/deck-analysis";
import { UpgradeFlow } from "./upgrade-flow";
import { leadOf } from "./result-view";
import type { UpgradeArt } from "./pick-steps";
import { useClock } from "./wait-view";

const PULSE_GAP_MS = 560;

const POLL_MS = 3000;
const WATCH_MAX_MS = 6 * 60 * 1000;
type Picks = { commander: string; bracket: BracketTarget; strategy: string };

/** The press's label while a run is in flight: `Upgrading toward Spells · 0:04`, the clock running from when it began. */
function Running({ strategy, startedAt }: { strategy: string; startedAt: number }) {
  return <>{preconUpgradeCopy.entry.running(strategy, useClock(startedAt))}</>;
}

export function UpgradeEntry({ fileName, precon, panel: initial, art, start }: { fileName: string; precon: string; panel: UpgradePanel; art: UpgradeArt; start: StartPreconProps }) {
  const [panel, setPanel] = useState(initial);
  // What this tab's press made of the run, until the panel says the same; else the panel's own newest run (a pending one is the wait, a done one the result).
  const [local, setLocal] = useState<RunView | null>(null);
  const pending = panel.runs.find((r) => r.status === "pending") ?? null;
  // The press opens on the newest result until a deck is started from it (`started`), then on the intro; History still lists every run.
  const view: RunView = local ?? viewOf(pending ?? panel.runs.find((r) => r.status === "done" && !r.started) ?? null);
  const [open, setOpen] = useState(false);
  // The run a deck is being started from (the Start dialog over the flow), and its add-attempt slot, kept past the dialog so a retry lands on the deck it made.
  const [starting, setStarting] = useState<string | null>(null);
  // A plain map held in state (never replaced), one slot per run: a retry of one run lands on its deck, and another run never inherits its id.
  const [adds] = useState(() => new Map<string, { id: string | null }>());
  const openRef = useRef(false);
  useEffect(() => { openRef.current = open; }, [open]);

  // One read at a time, and only the newest answer lands: a slow read never overwrites a later one.
  const reading = useRef(false);
  const readSeq = useRef(0);
  const refresh = useCallback(async (force = false) => {
    // A poll skips a tick while one is in flight; a press's own read never does, or it would take a busy answer for a failed run.
    if (reading.current && !force) return null;
    reading.current = true;
    const seq = ++readSeq.current;
    try {
      const next = await readUpgradeAction(fileName).catch(() => null);
      if (next && seq === readSeq.current) setPanel(next);
      return next;
    } finally {
      reading.current = false;
    }
  }, [fileName]);

  // A run begun elsewhere (another tab, before a reload) is waited for by reading, never by pressing.
  const watching = pending !== null && local === null;
  useEffect(() => {
    if (!watching) return;
    // Past the reaper's five minutes a run that is still pending is dead and the next page read settles it, so the watch stops there.
    const until = Date.now() + WATCH_MAX_MS;
    const t = setInterval(() => { if (Date.now() > until) clearInterval(t); else void refresh(); }, POLL_MS);
    return () => clearInterval(t);
  }, [watching, refresh]);

  /** What the press made of the run, kept only while the flow is open: closed, the panel's own newest run says the rest. */
  const settle = (v: RunView) => setLocal(openRef.current ? v : null);

  const startingUpgrade = starting ? startFor(panel, starting, art) : null;

  async function confirm(picks: Picks) {
    setLocal({ kind: "wait", picks, startedAt: Date.now() });
    try {
      const res = await pressUpgradeAction(fileName, picks.commander, picks.bracket, picks.strategy);
      if (res.ok) {
        setPanel(res.panel);
        settle({ kind: "results", runId: res.run.id });
        return;
      }
      const next = await refresh(true);
      if (res.reason === "short") {
        // Under 12 held up: refunded, kept, and still startable (R2). The run is the one stored under these picks, never an older one.
        const key = runKey(picks.commander, picks.bracket, picks.strategy);
        const kept = next?.runs.find((r) => r.status === "done" && r.strategyKey === key);
        settle(kept ? { kind: "results", runId: kept.id } : { kind: "failed", picks });
      } else if (res.reason === "inFlight") setLocal(null);
      else if (res.reason === "allowance" || res.reason === "ownerShare" || res.reason === "paused") settle({ kind: "none" });
      else settle({ kind: "failed", picks });
    } catch {
      // A lapsed session or a lost connection: nothing is known of the run, so the flow offers the same picks again.
      settle({ kind: "failed", picks });
      void refresh(true);
    }
  }

  const [pulse, setPulse] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const played = useRef(false);

  useEffect(() => {
    const el = button.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watch = new IntersectionObserver((entries) => {
      if (played.current || !entries.some((e) => e.isIntersecting)) return;
      played.current = true;
      setPulse(1);
      timer = setTimeout(() => setPulse(2), PULSE_GAP_MS);
      watch.disconnect();
    });
    watch.observe(el);
    return () => { watch.disconnect(); if (timer) clearTimeout(timer); };
  }, []);

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
          {view.kind === "wait" ? <Running strategy={panel.runs.find((r) => r.id === pending?.id)?.strategyLabel ?? runningLabel(panel, view)} startedAt={view.startedAt} /> : preconUpgradeCopy.entry.press}
          {pulse > 0 && <span key={pulse} aria-hidden className="anim-line-pulse pointer-events-none absolute inset-0 rounded-[10px]" />}
        </button>
      </div>
      {open && (
        <UpgradeFlow
          key={view.kind === "results" ? `results:${view.runId}` : view.kind}
          precon={precon}
          panel={panel}
          art={art}
          view={view}
          // What this tab's press made is dropped once the flow closes (the run is in the panel by then), so a run begun elsewhere is read again.
          onClose={() => { setOpen(false); setLocal((l) => (l && l.kind !== "wait" ? null : l)); }}
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

/** The strategy of a run this tab started, by the picks: its label from the panel's own offer. */
function runningLabel(panel: UpgradePanel, view: Extract<RunView, { kind: "wait" }>): string {
  return panel.commanders.find((c) => c.key === view.picks.commander)?.strategies.find((s) => s.key === view.picks.strategy)?.label ?? "";
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
