import type { ContestedClaimant } from "../collection/summary-read";

/**
 * The allocation a pick is about to produce, computed on the client so the marks move on the tap.
 *
 * WHY THIS IS ALLOWED TO EXIST, given that a client re-deriving the model's queue cost three
 * review rounds during the build. That mistake was predicting which of SEVERAL reservations the
 * server would evict — unanswerable here, because the server resolves those on `(created_at,
 * deck_id)`, which is not an order this row holds. This function predicts something else: there
 * is only ever ONE authored reservation per card (a pick MOVES it rather than adding), so after
 * a pick the allocation is fully determined by two facts the row already carries — the chosen
 * deck, and every claimant's `since`.
 *
 * It is a PREVIEW and never a source of truth. It is drawn only while the write is in flight and
 * is replaced by the server's own reading the instant one arrives, refused or not.
 *
 * The server's rule, mirrored here:
 *   1. A commander's copies are never reservable and never move.
 *   2. The reservation is granted next, one copy, out of what is left.
 *   3. Everything still unallocated goes by seniority — `(since, deckId)` ascending, which is
 *      the same tuple `senior_hard` orders on in `availability-query.ts`.
 *
 * @param claimants The row's claimants, in the order the row draws them (commit order).
 * @param inPlay    Copies that can actually move — the row's own figure, commanders excluded.
 * @param chosenId  The deck the player just picked, or null when they cleared their pick.
 */
export function previewAllocation(
  claimants: ContestedClaimant[],
  inPlay: number,
  chosenId: string | null,
): ContestedClaimant[] {
  // Commander copies first: they are held whatever anyone picks, and they do not come out of
  // `inPlay`, which already excludes them.
  const allocated = new Map(
    claimants.map((c) => [c.deckId, Math.min(c.commanderCopies, c.quantity)]),
  );
  let left = inPlay;

  const give = (deckId: string, n: number) => {
    const c = claimants.find((x) => x.deckId === deckId);
    if (!c || n <= 0 || left <= 0) return;
    const held = allocated.get(deckId) ?? 0;
    const room = Math.max(c.quantity - held, 0);
    const take = Math.min(n, room, left);
    allocated.set(deckId, held + take);
    left -= take;
  };

  // The reservation, one copy, ahead of every unreserved claim however senior.
  if (chosenId) give(chosenId, 1);

  // Then seniority. A null `since` sorts last: it means the deck has not sleeved the card, so
  // everyone who has is ahead of it — the same reading `senior_hard` takes.
  const bySeniority = [...claimants].sort((a, b) => {
    if (a.since !== b.since) {
      if (a.since === null) return 1;
      if (b.since === null) return -1;
      return a.since - b.since;
    }
    return a.deckId < b.deckId ? -1 : a.deckId > b.deckId ? 1 : 0;
  });
  for (const c of bySeniority) give(c.deckId, c.quantity);

  return claimants.map((c) => ({ ...c, allocated: allocated.get(c.deckId) ?? 0 }));
}
