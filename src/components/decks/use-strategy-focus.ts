"use client";

import { setStrategyFocus } from "../../app/decks/strategy-actions";
import type { StrategyKey } from "../../lib/strategy/score";
import { useHeldPick } from "./use-held-pick";

/**
 * The deck's strategy focus, held for the visit and written through `setStrategyFocus`. Drawn at once on a press, put
 * back on a refusal; `null` is "Keep it balanced". The ordering rules are `useHeldPick`'s.
 */
export function useStrategyFocus(deckId: string, stored: StrategyKey | null) {
  const { value, refused, pick } = useHeldPick<StrategyKey | null>(deckId, stored, async (forDeck, key) => {
    const result = await setStrategyFocus(forDeck, key);
    return result.ok ? { ok: true, value: result.focus } : { ok: false };
  });
  return { focus: value, refused, setFocus: pick };
}
