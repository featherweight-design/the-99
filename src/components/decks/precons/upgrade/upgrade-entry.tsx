"use client";

// E1, the page's one press (handoff Entry.dc, Hugh picked B): a bare button under the Overview, accent outline on a 10% accent tint, full width on
// a phone and its own width at 1300. No icon and no line beside it, because the flow's first screen explains it. The shipped `line-pulse` plays
// twice when it first scrolls into view on a visit, then rests (the stylesheet drops it under reduced motion).
import { useCallback, useEffect, useRef, useState } from "react";
import { pressUpgradeAction, readUpgradeAction } from "../../../../lib/precons/upgrade/actions";
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";
import { viewOf, type RunView } from "../../../../lib/precons/upgrade/flow";
import type { UpgradePanel } from "../../../../lib/precons/upgrade/run";
import type { BracketTarget } from "../../../../lib/precons/upgrade/targets";
import { UpgradeFlow } from "./upgrade-flow";
import type { UpgradeArt } from "./pick-steps";
import { useClock } from "./wait-view";

const PULSE_GAP_MS = 560;

const POLL_MS = 2000;
type Picks = { commander: string; bracket: BracketTarget; strategy: string };

/** The press's label while a run is in flight: `Upgrading toward Spells · 0:04`, the clock running from when it began. */
function Running({ strategy, startedAt }: { strategy: string; startedAt: number }) {
  return <>{preconUpgradeCopy.entry.running(strategy, useClock(startedAt))}</>;
}

export function UpgradeEntry({ fileName, precon, panel: initial, art }: { fileName: string; precon: string; panel: UpgradePanel; art: UpgradeArt }) {
  const [panel, setPanel] = useState(initial);
  // What this tab's press made of the run, until the panel says the same; else the panel's own newest run (a pending one is the wait, a done one the result).
  const [local, setLocal] = useState<RunView | null>(null);
  const pending = panel.runs.find((r) => r.status === "pending") ?? null;
  const view: RunView = local ?? viewOf(pending ?? panel.runs.find((r) => r.status === "done") ?? null);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    const next = await readUpgradeAction(fileName).catch(() => null);
    if (next) setPanel(next);
    return next;
  }, [fileName]);

  // A run begun elsewhere (another tab, before a reload) is waited for by reading, never by pressing.
  const watching = pending !== null && local === null;
  useEffect(() => {
    if (!watching) return;
    const t = setInterval(() => { void refresh(); }, POLL_MS);
    return () => clearInterval(t);
  }, [watching, refresh]);

  async function confirm(picks: Picks) {
    setLocal({ kind: "wait", picks, startedAt: Date.now() });
    try {
      const res = await pressUpgradeAction(fileName, picks.commander, picks.bracket, picks.strategy);
      if (res.ok) {
        setPanel(res.panel);
        setLocal({ kind: "results", runId: res.run.id });
        return;
      }
      const next = await refresh();
      if (res.reason === "short") {
        // Under 12 held up: refunded, kept, and still startable (R2).
        const kept = next?.runs.find((r) => r.status === "done");
        setLocal(kept ? { kind: "results", runId: kept.id } : { kind: "failed", picks });
      } else if (res.reason === "inFlight") setLocal(null);
      else if (res.reason === "allowance" || res.reason === "ownerShare" || res.reason === "paused") setLocal({ kind: "none" });
      else setLocal({ kind: "failed", picks });
    } catch {
      // A lapsed session or a lost connection: nothing is known of the run, so the flow offers the same picks again.
      setLocal({ kind: "failed", picks });
      void refresh();
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
          onClose={() => setOpen(false)}
          onConfirm={(p) => void confirm(p as Picks)}
          onRetry={view.kind === "failed" ? () => void confirm(view.picks) : undefined}
        />
      )}
    </>
  );
}

/** The strategy of a run this tab started, by the picks: its label from the panel's own offer. */
function runningLabel(panel: UpgradePanel, view: Extract<RunView, { kind: "wait" }>): string {
  return panel.commanders.find((c) => c.key === view.picks.commander)?.strategies.find((s) => s.key === view.picks.strategy)?.label ?? "";
}
