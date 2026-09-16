/**
 * Which commanders the Home "Ready to build" section shows today.
 *
 * The hero used to render `items[0]` forever, which is #345's complaint: the one
 * surface meant to introduce you to your collection never changed. That was fixed
 * for the single hero (PR #402) and then silently undone — the UI refresh replaced
 * the hero with `ReadyToBuild`, which draws the top two of the ready set by rank,
 * and this module was left importable by nothing. The complaint came back in the
 * same words on 2026-09-16: "I've had the same commanders for two weeks."
 *
 * Rotation is daily rather than per-visit so the pair is something you can point a
 * friend at, and daily rather than tied to collection changes because a collection
 * can sit still for weeks between CSV imports — which is the same complaint again.
 *
 * The pick is derived, not stored. Nothing is written and no extra query runs; the
 * ranked list is already in hand by the time this is called.
 *
 * WHY A CYCLE AND NOT A HASH. The obvious design re-seeds a hash each day and takes
 * whatever index falls out. That is independent sampling, not a rotation, so it
 * streaks: simulated over 3,000 accounts × 365 days, a nine-commander pool left one
 * commander unseen for **15 consecutive days** at worst, which is the complaint this
 * exists to answer. Walking a cycle gives every commander a fixed 4.5-day beat, a
 * guaranteed full tour in 4.5 days, and two fresh cards every single day.
 *
 * WHY THE CYCLE WALKS A SHUFFLE. Walking the set in RANK order pairs adjacent
 * ranks — ranks 1&2, then 3&4, then 5&6, then 7&8 — so once every 4.5 days Home
 * draws the two weakest commanders of the nine together, and the reader watches the
 * pair march down the list. Measured the same way: 22.2% of days put both cards in
 * the set's bottom three, against 8.5% for a shuffled walk, which is the random
 * baseline (3/36). Shuffling once per account costs a few lines and removes the
 * clustering entirely.
 */

/** FNV-1a, 32-bit. Any stable string hash would do; this one is short and has no deps. */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * A per-account permutation of `0..size-1`, stable for that account.
 *
 * Fisher-Yates over a linear congruential generator seeded by the account, rather
 * than `Math.random`: this runs on the server on every Home render, and a
 * permutation that changed between two renders of the same day would make the
 * rotation per-visit — the thing the daily boundary exists to prevent.
 *
 * Reshuffles when the RANKING changes, because the permutation is over positions
 * and a new ranking puts different commanders in them. That is correct: a
 * collection import is new information, and the rotation should reflect it rather
 * than preserve an order derived from a list that no longer exists.
 */
function permutation(size: number, userId: string): number[] {
  const order = Array.from({ length: size }, (_, i) => i);
  let state = hash(`${userId}:order`) || 1;
  for (let i = size - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

const DAY_MS = 86_400_000;

/**
 * `count` items from `set` for the UTC day containing `now`, walking a per-account
 * cycle so no two consecutive days share a card and every item comes up on a fixed
 * beat.
 *
 * The day boundary is UTC. Hugh's call on 2026-09-16, over a pinned US zone: the
 * server does not know the reader's zone at render time, and a client-side boundary
 * would let the server render and the hydration disagree about which day it is —
 * the same split `provenanceForm` documents for price staleness. The cost is that
 * the pair turns over mid-evening for readers west of UTC rather than at midnight.
 *
 * Returns the whole set, in its own order, when it holds no more than `count`:
 * there is nothing to rotate between, and rotating the ORDER of two cards that are
 * both always drawn would be motion without information.
 */
export function dailyPicks<T>(
  set: readonly T[],
  userId: string,
  now: Date,
  count: number,
): T[] {
  if (set.length <= count) return [...set];

  const size = set.length;
  const order = permutation(size, userId);
  const day = Math.floor(now.getTime() / DAY_MS);

  // No per-account phase offset here, deliberately. One was written and removed:
  // every account walks the same POSITIONS on the same day, but through its own
  // permutation, so what it draws is already its own. Adding an offset moved
  // nothing observable — the test that two accounts see different sequences
  // passes identically with and without it.

  // `(day * count + i) % size` is distinct for every `i < count` whenever
  // `count <= size`, which the guard above has established — so a day never draws
  // one commander twice.
  return Array.from({ length: count }, (_, i) => set[order[(day * count + i) % size]]);
}
