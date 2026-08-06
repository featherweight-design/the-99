"use client";

import { celebrationKey } from "../../lib/decks/celebration";
import { useLocalFlag } from "./use-local-flag";

/** Returns `[alreadyCelebrated, markCelebrated]` for this deck's 99/99 reveal. */
export function useCelebrated(deckId: string): [boolean, () => void] {
  return useLocalFlag(celebrationKey(deckId));
}
