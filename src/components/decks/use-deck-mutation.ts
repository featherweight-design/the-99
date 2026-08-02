"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
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
  //
  // Adjusting state during render, guarded by a comparison, is React's documented
  // way to derive state from a changed prop. It is not an effect: an effect paints
  // the stale message first and only then clears it, which is the flicker this
  // whole hook exists to avoid. The guard makes it converge in one extra pass.
  const [lastCommitted, setLastCommitted] = useState(committed);
  if (lastCommitted !== committed) {
    setLastCommitted(committed);
    setError(null);
  }

  // `run`'s closure captures the committed value from the click's render, which
  // a revalidation mid-flight can outdate. The revert below has to land on the
  // server's current answer, not the one that was true when the user clicked.
  const committedRef = useRef(committed);
  useEffect(() => {
    committedRef.current = committed;
  }, [committed]);

  function run(mutate: () => Promise<DeckMutationResult | void>) {
    startTransition(async () => {
      setApplied(true);
      setError(null);
      const result = await mutate().catch(
        (): DeckMutationResult => ({ ok: false, message: fallbackMessage }),
      );
      if (result && !result.ok) {
        // Drop the override in the same pass as the message. The transition's own
        // revert only lands when it ends, so without this there is a frame drawing
        // "✓ In deck" above the reason it could not be added.
        setApplied(committedRef.current);
        setError(result.message);
      }
    });
  }

  return { applied, isPending, error, run };
}
