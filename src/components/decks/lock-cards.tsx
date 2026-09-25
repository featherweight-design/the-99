"use client";

/**
 * Locked (never cut), PR 4a: the deck page's lock state, and the context its rows read it from.
 *
 * WHY A LOCAL OVERRIDE, NOT `useOptimistic`. `setCardLocked` revalidates in `after()` (D7), so its
 * reply carries no fresh rows: an optimistic value dropped when the action's transition ends would
 * snap every lock back to the stale server list the moment the write succeeded. So a toggle lands
 * in a map held here, drawn over the list the shell already holds, and stays until a NEW server
 * list arrives. Any later write that re-renders the page reads the lock back from `deck_locks`, so
 * that list states the lock itself, and the override has nothing left to say.
 *
 * `ProxyControl`'s model otherwise: the press lands at once, a refusal reverts it and says why
 * under the row, and a card's writes are SERIALISED, one in flight at a time, so the final state is
 * the final press and a late refusal can never overwrite a newer one.
 *
 * Absent (null) with `NEVER_CUT_ENABLED` off, and every surface reading null draws nothing of the
 * lock: that is how the switch reaches a row without a prop threaded through every list between.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

import { setCardLocked } from "../../app/decks/actions";
import { printedFaceName } from "../../lib/collection/browse";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import type { DeckDetailCard } from "../../lib/decks/grouping";

export type LockCards = {
  /** The Lock cards mode: every row's ✕ is a lock toggle while it is on. */
  mode: boolean;
  /** Lock the card if it is unlocked, unlock it if it is locked. Ignored while its last press is in flight. */
  toggle: (card: DeckDetailCard) => void;
  /** Cards whose write is in flight. */
  pending: ReadonlySet<string>;
  /** A refused toggle's message, by card, drawn under its row. */
  errors: ReadonlyMap<string, string>;
};

const LockCardsContext = createContext<LockCards | null>(null);

export function LockCardsProvider({ value, children }: { value: LockCards | null; children: ReactNode }) {
  return <LockCardsContext.Provider value={value}>{children}</LockCardsContext.Provider>;
}

/** The deck page's lock state, or null when the switch is off (or outside a deck page). */
export function useLockCards(): LockCards | null {
  return useContext(LockCardsContext);
}

const NONE: ReadonlyMap<string, boolean> = new Map();
const NO_ERRORS: ReadonlyMap<string, string> = new Map();

/**
 * The shell's half. `cards` is the list the page draws (the optimistic one) and `serverCards` the
 * list it came from, whose identity changing is what retires the overrides. Returns that list with
 * every override drawn over it, so the rows, the key, the counts and the climb all read ONE answer.
 */
export function useCardLocks({
  enabled,
  deckId,
  cards,
  serverCards,
  announce,
}: {
  enabled: boolean;
  deckId: string;
  cards: DeckDetailCard[];
  serverCards: DeckDetailCard[];
  announce: (message: string) => void;
}) {
  // Held WITH its deck, as the swap receipts are: the builder survives a client navigation to
  // another deck, and a lock pressed on one must never paint on the other.
  const [held, setHeld] = useState<{ deckId: string; overrides: ReadonlyMap<string, boolean> }>({
    deckId,
    overrides: NONE,
  });
  const [errors, setErrors] = useState<ReadonlyMap<string, string>>(NO_ERRORS);
  const [mode, setModeState] = useState(false);
  // A ref for the serialisation, read and written synchronously in the press, and state for the
  // render: two presses inside one frame both read the ref, never a stale render's copy of it.
  const inFlight = useRef(new Set<string>());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  if (held.deckId !== deckId) {
    setHeld({ deckId, overrides: NONE });
    setErrors(NO_ERRORS);
    setModeState(false);
  }
  // Adjusted during render, not in an effect, so the stale override never paints over the new list.
  const [seenServer, setSeenServer] = useState(serverCards);
  if (seenServer !== serverCards) {
    setSeenServer(serverCards);
    // Only a write still in flight keeps its override: the list may have been rendered before it
    // committed, and a refreshed list must not yank a toggle back under the reader's finger.
    const kept = new Map([...held.overrides].filter(([id]) => pending.has(id)));
    if (kept.size !== held.overrides.size) setHeld({ deckId: held.deckId, overrides: kept });
    if (errors.size > 0) setErrors(NO_ERRORS);
  }

  const overrides = held.deckId === deckId ? held.overrides : NONE;
  const drawn = useMemo(
    () =>
      overrides.size === 0
        ? cards
        : cards.map((c) => (overrides.has(c.oracleId) ? { ...c, locked: overrides.get(c.oracleId) } : c)),
    [cards, overrides],
  );

  const setOverride = useCallback((forDeck: string, oracleId: string, on: boolean) => {
    // A write that lands after the builder moved to another deck is dropped, checked inside the
    // update against the deck the map is for at that moment.
    setHeld((h) => (h.deckId !== forDeck ? h : { ...h, overrides: new Map(h.overrides).set(oracleId, on) }));
  }, []);

  const toggle = useCallback(
    (card: DeckDetailCard) => {
      if (!enabled || inFlight.current.has(card.oracleId)) return;
      const id = card.oracleId;
      const next = !card.locked;
      const name = printedFaceName(card);
      const forDeck = deckId;
      inFlight.current.add(id);
      setPending(new Set(inFlight.current));
      setOverride(forDeck, id, next);
      setErrors((e) => {
        if (!e.has(id)) return e;
        const copy = new Map(e);
        copy.delete(id);
        return copy;
      });
      void (async () => {
        const result = await setCardLocked(forDeck, id, next).catch(() => ({
          ok: false as const,
          message: lockedCardsCopy.mode.refused,
        }));
        inFlight.current.delete(id);
        setPending(new Set(inFlight.current));
        if (!result.ok) {
          // The server refuses when the card left the deck between render and press, or the switch
          // is off. The lock reverts rather than showing a state the deck does not hold.
          setOverride(forDeck, id, !next);
          setErrors((e) => new Map(e).set(id, result.message));
          return;
        }
        // Announced on the transition, never from the state (ProxyControl's rule).
        announce(next ? lockedCardsCopy.mode.announceLocked(name) : lockedCardsCopy.mode.announceUnlocked(name));
      })();
    },
    [enabled, deckId, setOverride, announce],
  );

  /** T6: the button carries no pressed state, so the mode says itself here. */
  const setMode = useCallback(
    (on: boolean) => {
      if (!enabled || on === mode) return;
      setModeState(on);
      announce(on ? lockedCardsCopy.mode.announceEnter : lockedCardsCopy.mode.announceLeave);
    },
    [enabled, mode, announce],
  );

  const value = useMemo<LockCards | null>(
    () => (enabled ? { mode, toggle, pending, errors } : null),
    [enabled, mode, toggle, pending, errors],
  );

  return { cards: enabled ? drawn : cards, value, mode: enabled && mode, setMode };
}
