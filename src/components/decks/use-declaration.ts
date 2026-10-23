"use client";

import { declareBracket } from "../../app/decks/declaration-actions";
import type { Bracket } from "../../lib/bracket/types";
import { useHeldPick } from "./use-held-pick";

/**
 * The deck's declaration, held for the visit and written through `declareBracket`.
 *
 * ONE OWNER FOR THE WHOLE SHELL. The verdict block draws the answer, and the Consider tile and
 * the top-off list read the same value for the card note. A player who answers on the Analysis
 * tab and then opens Consider has to see the answer they just gave, and three copies of it would
 * be three chances to disagree. The ordering rules (drawn at once, serialized, newest press
 * speaks, keyed on the deck) are `useHeldPick`'s.
 */
export function useDeclaration(
  deckId: string,
  stored: Bracket | null,
): {
  declared: Bracket | null;
  refused: boolean;
  declare: (bracket: Bracket) => void;
} {
  const { value, refused, pick } = useHeldPick<Bracket | null>(deckId, stored, async (forDeck, bracket) => {
    const result = await declareBracket(forDeck, bracket as Bracket);
    return result.ok ? { ok: true, value: result.declared } : { ok: false };
  });
  return { declared: value, refused, declare: pick };
}
