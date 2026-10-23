"use client";

import { useEffect, useRef, useState, useTransition } from "react";

/** What a pick's write answers: the value the server stored, or a refusal. Null is a request that failed. */
export type PickReply<T> = { ok: true; value: T } | { ok: false } | null;

/**
 * A per-deck pick held for the visit and written through a server action: the bracket declaration (`useDeclaration`)
 * and the strategy focus (`useStrategyFocus`) share it, so the ordering rules below are written once.
 *
 * ONE OWNER FOR THE WHOLE SHELL. The verdict block draws the answer, and the Consider tile and
 * the top-off list read the same value for the card note. A player who answers on the Analysis
 * tab and then opens Consider has to see the answer they just gave, and three copies of it would
 * be three chances to disagree.
 *
 * DRAWN AT ONCE, PUT BACK ON A REFUSAL. The answer replaces the chips in the same render as the
 * press, because the action's refusal rules are about requests that should never happen from
 * this surface: the chips are built from the verdict's own `permits`. When one does happen — the
 * deck was edited elsewhere and no longer permits the choice, or the request failed — the LAST
 * ANSWER THE SERVER CONFIRMED returns and `refused` says so.
 *
 * THE WRITES ARE SERIALIZED, so the database commits them in the order they were pressed. Two
 * presses can happen before the first reply (answer, `change`, answer again), and two requests
 * sent at once can reach the server in either order — the older could land second and leave the
 * column holding an answer the screen has moved past. Each write waits for the one before it,
 * so the last press is the last write.
 *
 * ONLY THE NEWEST PRESS SPEAKS. A reply to a superseded press never touches the screen — a
 * refusal of the first must not put it back over a second that succeeded — but a superseded
 * SUCCESS is still recorded as confirmed, because the database holds it, and a later refusal
 * restores to it rather than to something older.
 *
 * KEYED ON THE DECK. The shell survives a route change between two decks, so the held answer
 * and every reply are tagged with the deck they are about; a new deck starts from its own stored
 * value, and a reply for the deck the reader left is dropped. Comparing the stored VALUES alone
 * would miss the move between two decks that happen to hold the same answer.
 *
 * A FRESH SERVER VALUE WINS, adjusted during render rather than in an effect, so a navigation
 * that brings a different stored answer never paints the stale one first.
 */
export function useHeldPick<T>(
  deckId: string,
  stored: T,
  send: (deckId: string, value: T) => Promise<PickReply<T>>,
): { value: T; settled: T; revision: number; refused: boolean; pick: (value: T) => void } {
  const [value, setValue] = useState(stored);
  /** The value the server last confirmed for the newest press: what a reader that must not run ahead of the write
   *  (Suggested changes' gate) follows. */
  const [settled, setSettled] = useState(stored);
  /** Moves every time the newest press settles (or a fresh server value arrives), EVEN when `settled` comes back the
   *  value it already held: an A, B, A run of presses ends on the value it started from, and a read taken while the
   *  writes were queued may have seen the middle one, so a reader keyed on the value alone would never re-read. */
  const [revision, setRevision] = useState(0);
  const [seen, setSeen] = useState({ deckId, stored });
  const [refused, setRefused] = useState(false);
  const [, startTransition] = useTransition();
  /** Which press is the newest, and which deck the screen is on. Handler-only reads and writes. */
  const newest = useRef(0);
  const current = useRef(deckId);
  /**
   * The last value the server confirmed, and the press that confirmed it. REFS, because a
   * reply reads them after other replies may have moved them — values captured at press time
   * would be stale by then.
   */
  const confirmed = useRef({ press: 0, value: stored });
  /** The write in flight, which the next one waits behind. */
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    current.current = deckId;
    confirmed.current = { press: newest.current, value: stored };
  }, [deckId, stored]);

  if (deckId !== seen.deckId || stored !== seen.stored) {
    // A FRESH SERVER VALUE IS THE ANSWER, so a notice about an earlier refused write no longer
    // describes what is on screen.
    setSeen({ deckId, stored });
    setValue(stored);
    setSettled(stored);
    setRevision((r) => r + 1);
    setRefused(false);
  }

  const pick = (next: T) => {
    const press = ++newest.current;
    const forDeck = deckId;
    setValue(next);
    setRefused(false);
    const write = queue.current.then(() => send(forDeck, next).catch(() => null));
    queue.current = write;
    startTransition(async () => {
      const result = await write;
      if (forDeck !== current.current) return;
      if (result?.ok && press > confirmed.current.press) {
        confirmed.current = { press, value: result.value };
      }
      if (press !== newest.current) return;
      setRevision((r) => r + 1);
      if (result?.ok) setSettled(result.value);
      if (!result?.ok) {
        // What the server holds now: the last confirmed value, which a superseded success may have moved.
        setSettled(confirmed.current.value);
        setValue(confirmed.current.value);
        setRefused(true);
      }
    });
  };

  return { value, settled, revision, refused, pick };
}
