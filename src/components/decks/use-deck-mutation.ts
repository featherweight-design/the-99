"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";

/**
 * Optimistic wrapper around a deck mutation server action.
 *
 * `committed` is the server-rendered truth; `applied` is what the row should
 * draw. React keeps the optimistic override alive until the transition ends —
 * which for a revalidating server action is once the new server HTML has
 * landed, not merely when the promise resolves, so the row never flashes back.
 */
export function useDeckMutation(committed: boolean, fallbackMessage: string) {
  const [applied, setApplied] = useOptimistic(committed);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // The server changing its mind settles the question the message was answering:
  // if the card is committed now, "we couldn't add that" is no longer true. The
  // row outlives revalidation, so without this the stale refusal stays on screen.
  const [lastCommitted, setLastCommitted] = useState(committed);
  if (lastCommitted !== committed) {
    setLastCommitted(committed);
    setError(null);
  }

  function run(mutate: () => Promise<DeckMutationResult | void>) {
    startTransition(async () => {
      setApplied(true);
      setError(null);
      const result = await mutate().catch(
        (): DeckMutationResult => ({ ok: false, message: fallbackMessage }),
      );
      if (result && !result.ok) setError(result.message);
    });
  }

  return { applied, isPending, error, run };
}
