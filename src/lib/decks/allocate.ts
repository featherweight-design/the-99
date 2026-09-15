import type { ContestedClaimant } from "../collection/summary-read";

/**
 * Who holds each copy of a contested card, given what the player owns and what each committed
 * deck asks for.
 *
 * Reservations first: a granted copy is the player's own allocation and outranks seniority.
 * What is left after the grants goes down the seniority queue in `(since, deckId)` order, which
 * is the order the model itself uses and the order `claimants` arrives in. Commander copies are
 * NOT promoted: a commander claim is never reservable, but it holds its place in the queue like
 * any other, and it is paid for out of the same `owned` supply as everything else.
 *
 * EXTRACTED so there is exactly one of these. It was a private function in `summary-read.ts`, and
 * the optimistic preview in the chooser started life as a second implementation written from the
 * comments rather than the code — which diverged on all three counts above before it was opened
 * for review. A preview that disagrees with the server produces precisely the flicker it was
 * added to remove, so the two cannot be allowed to drift.
 */
export function allocate(
  owned: number,
  claimants: Omit<ContestedClaimant, "allocated">[],
): ContestedClaimant[] {
  const grantedTotal = claimants.reduce((n, c) => n + c.granted, 0);
  let left = Math.max(owned - grantedTotal, 0);
  return claimants.map((c) => {
    // The unreserved part of this deck's ask takes what the queue has left when its turn comes.
    const unreserved = Math.max(c.quantity - c.granted, 0);
    const fromQueue = Math.min(unreserved, left);
    left -= fromQueue;
    return { ...c, allocated: c.granted + fromQueue };
  });
}
