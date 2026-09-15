import type { ContestedClaimant } from "../collection/summary-read";
import { allocate } from "./allocate";

/**
 * The allocation a pick is about to produce, computed on the client so the marks move on the tap.
 *
 * WHY THIS IS ALLOWED TO EXIST, given that a client re-deriving the model's queue cost three
 * review rounds during the build. That mistake was predicting which of SEVERAL reservations the
 * server would evict — unanswerable here, because the server resolves those on `(created_at,
 * deck_id)`, which is not an order this row holds. This predicts something else: there is only
 * ever ONE authored reservation per card (a pick MOVES it rather than adding), so the pick's
 * outcome is the model's own allocation with one grant moved, and nothing about it is guessed.
 *
 * IT CALLS THE MODEL RATHER THAN MIRRORING IT. `allocate` is the same function the server runs;
 * the only thing computed here is where the grant goes. The first version of this file was a
 * second implementation written from `allocate`'s comments instead of its code, and it diverged
 * three ways at once — it distributed the copies in play rather than the copies owned, held
 * commander copies outside the supply, and re-sorted a list that already arrives in queue order.
 * Each divergence made the preview disagree with the answer arriving a moment later, which is the
 * flicker this whole change exists to remove, pointing the other way.
 *
 * It is a PREVIEW and never a source of truth. It is drawn only while the write is in flight and
 * is replaced by the server's own reading the instant one arrives, refused or not.
 *
 * @param claimants The row's claimants, in the order they arrive — `(since, deckId)`, the queue.
 * @param owned     Copies the collection holds. The supply `allocate` distributes.
 * @param chosenId  The deck the player just picked, or null when they cleared their pick.
 */
export function previewAllocation(
  claimants: ContestedClaimant[],
  owned: number,
  chosenId: string | null,
): ContestedClaimant[] {
  return allocate(
    owned,
    claimants.map((c) => ({
      ...c,
      // ONE COPY, TO ONE DECK. A pick moves the reservation rather than adding to it, so every
      // other deck's grant goes to nought — including one that held a grant a moment ago. A deck
      // asking for nothing cannot be granted anything, which is what the `min` guards.
      granted: c.deckId === chosenId ? Math.min(1, c.quantity) : 0,
    })),
  );
}
