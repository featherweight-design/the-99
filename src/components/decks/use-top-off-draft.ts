"use client";

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import {
  encodeTopOffDraft,
  readTopOffDraft,
  type TopOffDraft,
  topOffDraftKey,
} from "../../lib/decks/top-off-draft";
import { readRaw, removeRaw, subscribeToKey, writeRaw } from "../ui/local-store";

const EMPTY: TopOffDraft = { ticked: new Set(), declined: new Set() };

/**
 * Whether the store answered at all, as opposed to answering "nothing".
 *
 * `readRaw` returns null for both, deliberately — see its own comment — so this
 * asks the one question it folds away: did the read THROW? Safari's private mode
 * and a locked-down cookie policy both throw here, and neither is a player
 * clearing their selection.
 *
 * Not in `local-store.ts`: every other caller of `readRaw` is right to treat the
 * two as one answer, and widening that module's contract for one value would put
 * this distinction in front of all of them.
 */
function storeReadable(key: string): boolean {
  try {
    localStorage.getItem(key);
    return true;
  } catch {
    return false;
  }
}

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

  const parsed = useMemo(() => readTopOffDraft(raw), [raw]);

  // AN UNREADABLE WRITE IS NOT A CLEAR, and the difference is a player's
  // in-progress selection.
  //
  // `subscribeToKey` delivers another tab's writes, and during a deployment the
  // other tab can be running the PREVIOUS build: it writes the old unversioned
  // shape, this tab parses it to null, and the strip — whose `seeded` ref is
  // already spent — shows an empty list it will not reseed. The selection is
  // gone with no event the player caused.
  //
  // So the two ways to arrive at null are told apart. A REMOVED key is a real
  // clear: `discard()` is the committed pass, and nothing should survive it. A
  // key that is PRESENT and unreadable is a write this build cannot interpret,
  // and the last snapshot it could is closer to the truth than an empty one.
  //
  // A ref rather than state: this corrects a derived value during render and
  // must not schedule one — the same rule the list caches follow. It is written
  // only when the parse succeeded, so it can never hold a value this build
  // rejected.
  //
  // A null `raw` is TWO answers, and `readRaw` collapses them by design: it says
  // a store that refuses to be read is the same answer as an empty one, and
  // leaves the caller to decide what absence means for its own value. For this
  // value they are opposite. A key another tab REMOVED is a cleared selection
  // and this tab should agree. A store that could not be read is a question that
  // went unanswered, and throwing away an in-progress selection over it is the
  // loss the ref exists to prevent.
  //
  // So the null path asks the store directly, which is the one place the
  // difference is visible. Only on that path, so a healthy read costs nothing.
  const lastGood = useRef<TopOffDraft | null>(null);
  if (parsed !== null) lastGood.current = parsed;
  else if (raw === null && storeReadable(key)) lastGood.current = null;
  const draft = parsed ?? lastGood.current;

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
  // The committed pass. It clears the held snapshot as well as the key, rather
  // than leaving that to the read above: a discard on a device whose store has
  // gone unreadable would otherwise hand the next render the selection it just
  // committed.
  const discard = useCallback(() => {
    lastGood.current = null;
    removeRaw(key);
  }, [key]);

  return {
    ticked: draft?.ticked ?? EMPTY.ticked,
    declined: draft?.declined ?? EMPTY.declined,
    restored: draft !== null,
    setTicked,
    setDeclined,
    discard,
  };
}
