// Where an added copy went (plan `plan-added-copy-2026-10-12`, G1): one helper for every surface
// that reports an add. Pure, over the card's availability either side of the write.
import { allocate, allocateClaims } from "./allocate";
import type { Availability } from "./availability";
import type { ContestedClaimant } from "../collection/summary-read";

/** A deck now holding copies it did not hold before the add. */
export type HeldPlacement = {
  deckId: string;
  deckName: string;
  /** Copies this deck holds now that it did not hold before: a brew counts only granted copies. */
  copies: number;
  /** Its granted copies rose: the player picked this deck before the copy turned up. */
  picked: boolean;
};

export type Placement = {
  held: HeldPlacement[];
  /**
   * Brews whose SOFT share rose: they read a loose copy as theirs, and so does every other brew. Not
   * holders, so the line never says a copy `goes to` one of them.
   */
  soft: { deckId: string; deckName: string }[];
  /** Copies the add brought that no deck took, softly or otherwise counted above. */
  unplaced: number;
};

type Snap = Pick<Availability, "owned" | "claims"> | null;
type Claimant = ReturnType<typeof allocateClaims>[number];

/** What a deck HOLDS: a committed deck its allocation, a brew only what the player gave it. */
const heldBy = (c: Claimant) => (c.brew ? c.granted : c.allocated);
/** A brew's soft share: the leftover it reads as its own without holding it. */
const softOf = (c: Claimant) => (c.brew ? Math.max(c.allocated - c.granted, 0) : 0);

/**
 * Who took the copies an add brought, from `allocateClaims` run on both snapshots.
 *
 * A brew's soft share is not a copy taken (every brew reads the same leftover), so a brew lands in
 * `held` only for the copies the player gave it, and in `soft` when its share of the leftover rose.
 */
export function placementsOf(before: Snap, after: Snap): Placement {
  const was = new Map(before ? allocateClaims(before).map((c) => [c.deckId, c]) : []);
  const now = after ? allocateClaims(after) : [];
  const held: HeldPlacement[] = [];
  const soft: Placement["soft"] = [];
  for (const c of now) {
    const prior = was.get(c.deckId);
    const copies = heldBy(c) - (prior ? heldBy(prior) : 0);
    if (copies > 0) {
      held.push({ deckId: c.deckId, deckName: c.deckName, copies, picked: c.granted > (prior?.granted ?? 0) });
    } else if (softOf(c) > (prior ? softOf(prior) : 0)) {
      soft.push({ deckId: c.deckId, deckName: c.deckName });
    }
  }
  const added = Math.max((after?.owned ?? 0) - (before?.owned ?? 0), 0);
  const placed = held.reduce((n, h) => n + h.copies, 0);
  return { held, soft, unplaced: Math.max(added - placed, 0) };
}

/**
 * How many claimants the chooser folds into one `Show` row (G7): the committed decks, from the head
 * of the queue, that keep their copies whatever this pick does. Re-running the queue with the copies
 * in play taken out answers it: a deck still fully held then holds a copy no pick here can move.
 *
 * A granted deck never folds (it is the player's own choice and the row has to show it), and the
 * prefix stops at the first deck that is not folded, so the order stays the explanation.
 */
export function foldCount(
  claimants: ContestedClaimant[],
  copiesInPlay: number,
  owned: number,
): number {
  // The counterfactual drops every pick too: a pick is itself one of the moves in question, and a
  // reservation left in place would spend the reduced supply ahead of the decks that keep theirs.
  // The authored row is still read off the REAL claimant below, so a picked deck never folds.
  const picked = new Map(claimants.map((c) => [c.deckId, c.granted]));
  const without = allocate(Math.max(owned - copiesInPlay, 0), claimants.map((c) => ({ ...c, granted: 0 })));
  let n = 0;
  for (const c of without) {
    if (c.brew || (picked.get(c.deckId) ?? 0) > 0 || c.allocated < c.quantity) break;
    n++;
  }
  return n;
}
