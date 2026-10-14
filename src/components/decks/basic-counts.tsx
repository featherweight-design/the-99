"use client";

import { createContext, useContext } from "react";

import type { BasicQuantityOutcome } from "../../lib/decks/set-basic-quantity";

/** Quiet time after the last press before the one save goes (plan `2026-10-14-basic-lands-stepper.md`). */
export const SETTLE_MS = 600;

export type BasicCountResult = { kind: "ok"; n: number } | { kind: "refused" } | { kind: "thrown" };

type Entry = {
  target: number;
  /** The deck's count when this burst began: the row's `from N` reads it. */
  base: number;
  timer: ReturnType<typeof setTimeout> | null;
  wake: ((settled: boolean) => void) | null;
  taken: boolean;
  done: Promise<void>;
};

export type BasicCounts = {
  /** A press or a typed figure. Opens a burst, or moves the open one's target and restarts its settle. */
  set: (oracleId: string, n: number, base: number) => void;
  /** The ✕ at 1 inside an open burst: cancel it, sending nothing more and saying nothing. */
  takeOver: (oracleId: string) => boolean;
  /** Settle every open burst now and wait for every save: before a write that would race them. */
  flush: () => Promise<void>;
  /** The base of the open burst for this card, or null. */
  base: (oracleId: string) => number | null;
  /** The views of a card hear its burst's outcome here, whichever of them is mounted when it lands. */
  subscribe: (oracleId: string, listener: (r: BasicCountResult) => void) => () => void;
  /** This render's save, prediction, transition and refresh, set after each commit (never during render). */
  configure: (deps: Deps) => void;
};

type Deps = {
  save: (oracleId: string, n: number) => Promise<BasicQuantityOutcome>;
  /** The deck-wide prediction, inside a transition. */
  predict: (oracleId: string, n: number) => void;
  /** Runs the burst as one async transition, so the prediction stands until the save has answered. */
  transition: (fn: () => Promise<void>) => void;
  refresh: () => void;
};

/**
 * The basics stepper's save queue, ONE PER DECK (round 2 of #1752): a row and a tile are two views of one card,
 * and List ↔ Card swaps one for the other mid-burst, so the queue cannot live in either. It also has to be
 * reachable by the deck's other writers to the same row: Clear auto sweeps a fill-added basic the stepper has
 * just claimed, and the Add panel adds one copy to the count the stepper is about to overwrite, so both `flush`
 * first.
 *
 * Each card's burst is one async transition: the prediction stands until its save has answered and the page
 * has revalidated. A press during a save restarts the settle and the next save carries the newer figure. A
 * returned refusal and a thrown save are told apart, because only the first may say the deck is unchanged.
 */
export function createBasicCounts(initial?: Deps): BasicCounts {
  let deps: Deps = initial ?? {
    save: async () => ({ ok: false, reason: "not-in-deck" }),
    predict: () => {},
    transition: (fn) => void fn(),
    refresh: () => {},
  };
  const entries = new Map<string, Entry>();
  const listeners = new Map<string, Set<(r: BasicCountResult) => void>>();
  const tell = (oracleId: string, r: BasicCountResult) => {
    for (const l of listeners.get(oracleId) ?? []) l(r);
  };

  function quiet(entry: Entry): Promise<boolean> {
    return new Promise((resolve) => {
      entry.wake = (settled) => {
        if (entry.timer) clearTimeout(entry.timer);
        entry.timer = null;
        entry.wake = null;
        resolve(settled);
      };
      entry.timer = setTimeout(() => entry.wake?.(true), SETTLE_MS);
    });
  }

  function open(oracleId: string, n: number, base: number) {
    let finish!: () => void;
    const entry: Entry = { target: n, base, timer: null, wake: null, taken: false, done: new Promise((r) => (finish = r)) };
    entries.set(oracleId, entry);
    deps.transition(async () => {
      deps.predict(oracleId, n);
      let result: BasicCountResult = { kind: "ok", n };
      try {
        for (;;) {
          if (!(await quiet(entry))) {
            if (entry.taken) break;
            continue;
          }
          const saved = entry.target;
          let outcome: BasicQuantityOutcome;
          try {
            outcome = await deps.save(oracleId, saved);
          } catch {
            result = { kind: "thrown" };
            break;
          }
          if (entry.taken) break;
          if (entry.target !== saved) continue;
          result = outcome.ok ? { kind: "ok", n: saved } : { kind: "refused" };
          break;
        }
      } finally {
        entries.delete(oracleId);
        finish();
      }
      if (entry.taken) return;
      if (result.kind === "thrown") deps.refresh();
      tell(oracleId, result);
    });
  }

  return {
    set(oracleId, n, base) {
      const entry = entries.get(oracleId);
      if (!entry) return open(oracleId, n, base);
      entry.target = n;
      deps.transition(async () => deps.predict(oracleId, n));
      entry.wake?.(false);
    },
    takeOver(oracleId) {
      const entry = entries.get(oracleId);
      if (!entry) return false;
      entry.taken = true;
      entry.wake?.(false);
      return true;
    },
    async flush() {
      const open = [...entries.values()];
      for (const e of open) e.wake?.(true);
      await Promise.all(open.map((e) => e.done));
    },
    base(oracleId) {
      return entries.get(oracleId)?.base ?? null;
    },
    configure(next) {
      deps = next;
    },
    subscribe(oracleId, listener) {
      const set = listeners.get(oracleId) ?? new Set();
      set.add(listener);
      listeners.set(oracleId, set);
      return () => set.delete(listener);
    },
  };
}

const BasicCountsContext = createContext<BasicCounts | null>(null);

export const BasicCountsProvider = BasicCountsContext.Provider;

/** Null outside the deck builder: a row mounted alone keeps a queue of its own. */
export function useBasicCounts(): BasicCounts | null {
  return useContext(BasicCountsContext);
}

/** Settles the stepper's open bursts before a write that would race them; resolves at once outside the builder. */
export function useFlushBasicCounts(): () => Promise<void> {
  const counts = useContext(BasicCountsContext);
  return counts ? counts.flush : async () => {};
}
