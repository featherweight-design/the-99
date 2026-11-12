"use client";

// The run behind an Upgrade precon press, wherever the press sits: the precon page's entry (E1) and the deck page's band
// (addendum A2c). One run belongs to the precon, so both read the same panel and press the same action; this is the state
// they share: the panel, what this tab's press made of the run, the watch on a run begun elsewhere, and the confirm.
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { pressUpgradeAction, readUpgradeAction } from "../../../../lib/precons/upgrade/actions";
import { viewOf, type RunView } from "../../../../lib/precons/upgrade/flow";
import type { UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { runKey, type BracketTarget } from "../../../../lib/precons/upgrade/targets";

const POLL_MS = 3000;
const WATCH_MAX_MS = 6 * 60 * 1000;
export type Picks = { commander: string; bracket: BracketTarget; strategy: string };

export function useUpgradeRun(fileName: string, initial: UpgradePanel) {
  const [panel, setPanel] = useState(initial);
  // What this tab's press made of the run, until the panel says the same; else the panel's own newest run (a pending one is the wait, a done one the result).
  const [local, setLocal] = useState<RunView | null>(null);
  const pending = panel.runs.find((r) => r.status === "pending") ?? null;
  // The press opens on the newest result until a deck is started from it (`started`), then on the intro, whatever older runs hold; History still lists every run.
  const newestDone = panel.runs.find((r) => r.status === "done") ?? null;
  // Closed after going through History: the player backed out of the past runs, so the next press starts a new upgrade
  // rather than reopening the newest result (Hugh, 2026-11-12, bug d). A run in flight still shows its wait.
  const [fresh, setFresh] = useState(false);
  const view: RunView = local ?? viewOf(pending ?? (!fresh && newestDone && !newestDone.started ? newestDone : null));
  const [open, setOpen] = useState(false);
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

  // A run begun elsewhere (another tab, another page, before a reload) is waited for by reading, never by pressing.
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

  async function confirm(picks: Picks) {
    setFresh(false);
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

  /** The flow closes: what this tab's press made is dropped (the run is in the panel by then), so a run begun elsewhere is read again. */
  const close = (how?: { afterHistory: boolean }) => {
    setOpen(false);
    setLocal((l) => (l && l.kind !== "wait" ? null : l));
    if (how?.afterHistory) setFresh(true);
  };

  return { panel, view, pending, open, setOpen, close, refresh, confirm };
}

/** The strategy of a run in flight: the pending run's label, or for one this tab started, its label from the panel's own offer. */
export function runningLabel(panel: UpgradePanel, view: Extract<RunView, { kind: "wait" }>, pendingId: string | null): string {
  return panel.runs.find((r) => r.id === pendingId)?.strategyLabel
    ?? panel.commanders.find((c) => c.key === view.picks.commander)?.strategies.find((s) => s.key === view.picks.strategy)?.label
    ?? "";
}

const PULSE_GAP_MS = 560;

/**
 * The press's eye-catch: the shipped `line-pulse` plays twice the first time the press scrolls into view on a visit, then rests
 * (the stylesheet drops it under reduced motion). The count keys the pulse's span, so each play is a fresh animation.
 */
export function useLinePulse(ref: RefObject<HTMLElement | null>): number {
  const [pulse, setPulse] = useState(0);
  const played = useRef(false);
  useEffect(() => {
    const el = ref.current;
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
  }, [ref]);
  return pulse;
}
