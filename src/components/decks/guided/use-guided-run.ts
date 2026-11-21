"use client";

// A guided build's run, read from the server while the player watches it (R1 to R5). The run is a row the server finishes in `after()`:
// this hook never runs anything, it reads that row every few seconds while it is going. No Overview is written for a run (Hugh,
// 2026-11-21): the player writes it with the Overview button. A retry is one press of `startGuidedAction` with the
// failed run's own picks.
import { useCallback, useEffect, useRef, useState } from "react";
import { readGuidedStateAction, startGuidedAction } from "../../../app/decks/guided-actions";
import type { GuidedState } from "../../../lib/guided/store";

/** How often the run is read. The same beat as Upgrade's wait. */
export const GUIDED_POLL_MS = 3000;
/** The longest a run is watched before the window stops asking: past the run's own worst case (230s) and the reaper's 5 minutes. */
export const GUIDED_WATCH_CAP_MS = 6 * 60 * 1000;
export type GuidedRun = {
  run: GuidedState;
  /** A retry is out. */
  starting: boolean;
  /** The last retry was refused: nothing was spent, the failed run stays on screen. */
  refused: boolean;
  retry: () => void;
};

/** Pure: the pick a retry sends again, from the run's own row. */
export function picksOfRun(run: GuidedState) {
  return { strategyKey: run.strategyKey, bracket: run.bracketTarget, poolMode: run.poolMode, budgetCents: run.budgetCents, kept: run.kept };
}

export function useGuidedRun(deckId: string, initial: GuidedState): GuidedRun {
  const [run, setRun] = useState(initial);
  const [starting, setStarting] = useState(false);
  const [refused, setRefused] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  // The run, while it is going.
  const runId = run.id;
  const going = run.state === "running";
  useEffect(() => {
    if (!going) return;
    const began = Date.now();
    const t = setInterval(async () => {
      if (Date.now() - began > GUIDED_WATCH_CAP_MS) { clearInterval(t); return; }
      const next = await readGuidedStateAction(deckId).catch(() => null);
      if (alive.current && next && (next.id !== runId || next.state !== "running")) setRun(next);
    }, GUIDED_POLL_MS);
    return () => clearInterval(t);
  }, [deckId, runId, going]);

  const retry = useCallback(() => {
    if (starting) return;
    setStarting(true);
    setRefused(false);
    startGuidedAction(deckId, picksOfRun(run))
      .then(async (r) => {
        // A started run is never called refused: a read that fails after `ok` is tried once more, and the run's own poll takes over.
        const read = () => readGuidedStateAction(deckId).catch(() => null);
        const next = r.ok ? (await read()) ?? (await read()) : null;
        if (!alive.current) return;
        if (next) { setRun(next); } else if (!r.ok) setRefused(true);
      })
      .catch(() => { if (alive.current) setRefused(true); })
      .finally(() => { if (alive.current) setStarting(false); });
  }, [deckId, run, starting]);

  return { run, starting, refused, retry };
}
