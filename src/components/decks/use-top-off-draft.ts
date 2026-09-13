"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  encodeTopOffDraft,
  readTopOffDraft,
  type TopOffDraft,
  topOffDraftKey,
} from "../../lib/decks/top-off-draft";
import { readRaw, removeRaw, subscribeToKey, writeRaw } from "../ui/local-store";

const EMPTY: TopOffDraft = { ticked: new Set(), declined: new Set() };

export type TopOffDraftHandle = TopOffDraft & {
  /** Whether this player has already chosen against this deck. False on a
   *  first visit, true afterwards — including when they cleared every tick,
   *  which is a choice and not an absence. The strip reads it to decide
   *  whether to seed and which door note to print. */
  restored: boolean;
  setTicked: (next: Set<string>) => void;
  setDeclined: (next: Set<string>) => void;
  /** Forgets the selection outright, so the next open reads as a first visit.
   *  What this hook holds is an *uncommitted* selection; a landed pass is the
   *  one event that leaves nothing to hold. */
  discard: () => void;
};

/**
 * The uncommitted top-off selection for one deck, held in localStorage so it
 * survives a reload and reaches a second tab.
 *
 * localStorage rather than a table: this is scratch state that lives for the
 * minutes between opening the list and committing it, and a row per
 * half-finished selection would outlive the choosing. What it does not survive
 * is a second device, which is the trade — and the swap is behind this hook if
 * that ever matters.
 */
export function useTopOffDraft(deckId: string): TopOffDraftHandle {
  const key = topOffDraftKey(deckId);

  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToKey(key, onStoreChange),
    [key],
  );

  // The raw string is the snapshot rather than the parsed draft:
  // useSyncExternalStore compares snapshots by identity, and a fresh object
  // from every read would re-render forever. The server snapshot is null —
  // no selection — so the server render and the hydration pass agree, and the
  // restore lands after — the client snapshot runs on every render while this
  // hook is mounted, but never before hydration has agreed with the server.
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null,
  );

  const draft = useMemo(() => readTopOffDraft(raw), [raw]);

  const write = useCallback(
    (change: Partial<TopOffDraft>) => {
      // Read at call time rather than closing over `draft`: declining a ticked
      // candidate calls both setters inside one handler, before either
      // re-render, and a setter using the last render's snapshot would write
      // over the call beside it.
      const current = readTopOffDraft(readRaw(key)) ?? EMPTY;
      writeRaw(key, encodeTopOffDraft({ ...current, ...change }));
    },
    [key],
  );

  const setTicked = useCallback((next: Set<string>) => write({ ticked: next }), [write]);
  const setDeclined = useCallback((next: Set<string>) => write({ declined: next }), [write]);
  const discard = useCallback(() => removeRaw(key), [key]);

  return {
    ticked: draft?.ticked ?? EMPTY.ticked,
    declined: draft?.declined ?? EMPTY.declined,
    restored: draft !== null,
    setTicked,
    setDeclined,
    discard,
  };
}
