"use client";

import { useState, useTransition } from "react";

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
 * deck was edited elsewhere and no longer permits the choice, or the request failed — the
 * previous answer returns and `refused` says so.
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

  if (stored !== storedSeen) {
    setStoredSeen(stored);
    setDeclared(stored);
  }

  const declare = (bracket: Bracket) => {
    const previous = declared;
    setDeclared(bracket);
    setRefused(false);
    startTransition(async () => {
      const result = await declareBracket(deckId, bracket).catch(() => null);
      if (!result?.ok) {
        setDeclared(previous);
        setRefused(true);
      }
    });
  };

  return { declared, refused, declare };
}
