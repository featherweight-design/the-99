"use client";

// The guided build's line on the deck's page (G6, STATES "Deck tile / page"): `Sharpening toward X · 0:05` while the run is going, after the
// player left the window, and a short or failed run's line for a day after it. It reads the run itself, so the deck page's cached payload
// never carries it; a deck with no run, or a run that kept its charge, draws nothing. A press opens the run's window.
import { useEffect, useState } from "react";
import { readGuidedStateAction } from "../../../app/decks/guided-actions";
import { guidedBuildCopy } from "../../../lib/copy/guided-build";
import { GUIDED_LINE_HOURS } from "../../../lib/guided/constants";
import type { GuidedState } from "../../../lib/guided/store";
import { GuidedRunDialog } from "./guided-run-view";
import { useGuidedRun } from "./use-guided-run";
import { useClock } from "../precons/upgrade/wait-view";

const copy = guidedBuildCopy.line;

/** Pure: whether the deck's page draws a line for this run. */
export function lineShows(run: GuidedState, now: number): boolean {
  if (run.state === "running") return true;
  if (run.state === "done") return false;
  return now - run.createdAt.getTime() < GUIDED_LINE_HOURS * 3_600_000;
}

/** The line when the deck was created but its guided run was refused at the start (`?guided=refused`): same shape and face as the failed line, nothing to open. */
export function RefusedLine() {
  return (
    <div data-testid="guided-refused-line" className="mx-auto flex w-full max-w-[1400px] items-center gap-[12px] border-b border-solid border-b-[color:var(--border)] bg-[color:var(--surface-sunken)] px-[16px] py-[8px] md:px-[24px]">
      <p role="alert" className="m-0 min-w-0 flex-1 font-mono text-[11.5px] leading-[1.5]" style={{ color: "var(--danger)" }}>{copy.refused}</p>
    </div>
  );
}

export function GuidedRunLine({ deckId, deckName, refused = false }: { deckId: string; deckName: string; refused?: boolean }) {
  const [initial, setInitial] = useState<GuidedState | null>(null);
  // The refused line waits for the read: a deck that does have a run must not flash it.
  const [read, setRead] = useState(false);
  useEffect(() => {
    let live = true;
    readGuidedStateAction(deckId).then((r) => { if (live) { if (r) setInitial(r); setRead(true); } }, () => { if (live) setRead(true); });
    return () => { live = false; };
  }, [deckId]);
  return (
    <>
      {refused && read && !initial && <RefusedLine />}
      {initial ? <Line key={initial.id} deckId={deckId} deckName={deckName} initial={initial} /> : null}
    </>
  );
}

function Line({ deckId, deckName, initial }: { deckId: string; deckName: string; initial: GuidedState }) {
  const g = useGuidedRun(deckId, initial);
  const [open, setOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const { run } = g;
  // A run that finishes while the window is shut retires its line; while it is open the window stays, and shows the result.
  if (!open && !lineShows(run, now)) return null;
  return (
    <>
      {lineShows(run, now) && <LineRow run={run} onOpen={() => setOpen(true)} />}
      {open && <GuidedRunDialog deckId={deckId} deckName={deckName} g={g} onClose={() => setOpen(false)} />}
    </>
  );
}

function RunningText({ run }: { run: GuidedState }) {
  const clock = useClock(run.createdAt.getTime());
  return <>{copy.running(run.strategyLabel, clock)}</>;
}

function LineRow({ run, onOpen }: { run: GuidedState; onOpen: () => void }) {
  const failed = run.state === "failed";
  return (
    <div data-testid="guided-run-line" className="mx-auto flex w-full max-w-[1400px] items-center gap-[12px] border-b border-solid border-b-[color:var(--border)] bg-[color:var(--surface-sunken)] px-[16px] py-[8px] md:px-[24px]">
      <p role={run.state === "running" ? undefined : failed ? "alert" : "status"} className="m-0 min-w-0 flex-1 font-mono text-[11.5px] leading-[1.5]" style={failed ? { color: "var(--danger)" } : { color: "var(--fg-body)" }}>
        {run.state === "running" ? <RunningText run={run} /> : failed ? copy.failed(run.strategyLabel) : copy.short(run.strategyLabel)}
      </p>
      <button type="button" onClick={onOpen} className="flex min-h-[44px] flex-none cursor-pointer items-center border-0 bg-transparent px-[2px] font-sans text-[12.5px] font-medium text-[color:var(--accent-text)] md:min-h-0">{copy.open}</button>
    </div>
  );
}
