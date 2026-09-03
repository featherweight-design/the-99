"use client";

import { celebrationKey } from "../../lib/decks/celebration";
import { useLocalFlag } from "./use-local-flag";

/**
 * Returns `[alreadyCelebrated, markCelebrated, celebratedHere]` for this deck's
 * 99/99 reveal. The third is "this visit is the one that spent it", which keeps
 * the band on screen after it burns its own flag on sight.
 */
export function useCelebrated(deckId: string): [boolean, () => void, boolean] {
  const [isSet, set, setHere] = useLocalFlag(celebrationKey(deckId));
  return [isSet, set, setHere];
}
