import type { ContestedClaimant } from "../collection/summary-read";
import type { Availability } from "./availability";

/**
 * Who holds each copy of a contested card, given what the player owns and what each deck asks
 * for.
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
    // A BREW (no version, so no `since`) is behind every committed deck and claims the rest
    // SOFTLY: it reads what the committed queue leaves without taking it from another brew,
    // which is how the model's brew branch measures it (each brew against the hard claims
    // alone). Only its granted copies are held, and those came off the top with the others.
    if (c.since !== null) left -= fromQueue;
    return { ...c, allocated: c.granted + fromQueue };
  });
}

/**
 * Who holds each copy, read straight off an availability.
 *
 * Every claim in seniority order (brews last) with `allocate` applied, which is the pair every
 * caller wants and the pair that has to stay together: `allocate` is documented as taking its
 * claimants in `(since, deckId)` order, and `claims` arrives ordered by deck NAME. A caller
 * that forgot the sort would get a plausible allocation in the wrong queue order, which is
 * the quietest possible way to hand the copy to the wrong deck.
 *
 * Brews are included and sort LAST, behind every committed deck: since 2026-10-11 a brew can be
 * given a copy (all-decks cart, Hugh's answer 2), and the player chooses among every deck that
 * wants the card. A brew has no `since`, which is what both the sort and `allocate` read.
 */
export function allocateClaims(a: Pick<Availability, "owned" | "claims">): ContestedClaimant[] {
  const claimants = a.claims
    .map((c) => ({
      deckId: c.id,
      deckName: c.name,
      quantity: c.quantity,
      commanderCopies: c.commanderCopies ?? (c.commander ? 1 : 0),
      granted: c.granted ?? 0,
      since: c.since ?? null,
      versionNumber: c.versionNumber ?? null,
    }))
    // Commit order, per card; a brew's null `since` sorts last. Two brews tie on Infinity, and
    // `Infinity - Infinity` is NaN, so the sort reads each side's brewness rather than subtracting.
    .sort((x, y) => {
      if (x.since === null || y.since === null) {
        if (x.since !== y.since) return x.since === null ? 1 : -1;
      } else if (x.since !== y.since) {
        return x.since - y.since;
      }
      return x.deckId.localeCompare(y.deckId);
    });
  return allocate(a.owned, claimants);
}
