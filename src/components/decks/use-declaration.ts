"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { declareBracket } from "../../app/decks/declaration-actions";
import type { Bracket } from "../../lib/bracket/types";

/**
 * The deck's declaration, held for the visit and written through `declareBracket`.
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
export function useDeclaration(
  deckId: string,
  stored: Bracket | null,
): {
  declared: Bracket | null;
  refused: boolean;
  declare: (bracket: Bracket) => void;
} {
  const [declared, setDeclared] = useState(stored);
  const [seen, setSeen] = useState({ deckId, stored });
  const [refused, setRefused] = useState(false);
  const [, startTransition] = useTransition();
  /** Which press is the newest, and which deck the screen is on. Handler-only reads and writes. */
  const newest = useRef(0);
  const current = useRef(deckId);
  /**
   * The last answer the server confirmed, and the press that confirmed it. REFS, because a
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
    setDeclared(stored);
    setRefused(false);
  }

  const declare = (bracket: Bracket) => {
    const press = ++newest.current;
    const forDeck = deckId;
    setDeclared(bracket);
    setRefused(false);
    const write = queue.current.then(() => declareBracket(forDeck, bracket).catch(() => null));
    queue.current = write;
    startTransition(async () => {
      const result = await write;
      if (forDeck !== current.current) return;
      if (result?.ok && press > confirmed.current.press) {
        confirmed.current = { press, value: result.declared };
      }
      if (press !== newest.current) return;
      if (!result?.ok) {
        setDeclared(confirmed.current.value);
        setRefused(true);
      }
    });
  };

  return { declared, refused, declare };
}
