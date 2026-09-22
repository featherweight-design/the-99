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
 * ONLY THE NEWEST PRESS SPEAKS. Two presses can be in flight at once (answer, `change`, answer
 * again), and replies arrive in any order. A reply to a press that has since been superseded is
 * dropped whatever it says — a slow refusal of the first must not put the screen back over a
 * second that succeeded. What a refusal restores is the last CONFIRMED value, never the value on
 * screen when that press was made, which may itself have been an unconfirmed answer.
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
  const [storedSeen, setStoredSeen] = useState(stored);
  const [refused, setRefused] = useState(false);
  const [, startTransition] = useTransition();
  /** Which press is the newest. Read and written in handlers only, never during render. */
  const newest = useRef(0);
  /**
   * The last answer the server confirmed. A REF, because a reply reads it after other replies
   * may have moved it — a value captured at press time would be stale by then.
   */
  const confirmed = useRef(stored);
  useEffect(() => {
    confirmed.current = stored;
  }, [stored]);

  if (stored !== storedSeen) {
    setStoredSeen(stored);
    setDeclared(stored);
  }

  const declare = (bracket: Bracket) => {
    const press = ++newest.current;
    setDeclared(bracket);
    setRefused(false);
    startTransition(async () => {
      const result = await declareBracket(deckId, bracket).catch(() => null);
      if (press !== newest.current) return;
      if (result?.ok) {
        confirmed.current = result.declared;
      } else {
        setDeclared(confirmed.current);
        setRefused(true);
      }
    });
  };

  return { declared, refused, declare };
}
