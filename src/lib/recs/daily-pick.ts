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
 * exists to answer. Walking a cycle gives every commander a fixed beat — a full tour
 * every `size / 2` days, since the pair turns over once per UTC day (four and a half
 * days at the nine this was written for, two weeks at the 28 the set holds since
 * 2026-09-27) — and two fresh cards each day at the sizes named below. Read the next paragraph before quoting any of those three: each one has
 * a condition, and this sentence used to claim all three unconditionally.
 *
 * WHERE "TWO FRESH CARDS" STOPS BEING TRUE, precisely: consecutive days are disjoint
 * only while `2 * count <= size`. At `count` 2 that means a set of FOUR or more, and
 * the one reachable exception is a set of exactly three, where two cards a day out of
 * three must repeat one — pigeonhole, not a defect, and no scheduling fixes it. Sets
 * of 0, 1 and 2 return early and do not rotate at all. So the guarantee reads: a full
 * set never repeats on consecutive days, an account with three ranked commanders repeats exactly
 * one card a day, and `ready-to-build.test.ts` sweeps every size between.
 *
 * WHY THE CYCLE WALKS A SHUFFLE. Walking the set in RANK order pairs adjacent
 * ranks — ranks 1&2, then 3&4, then 5&6, then 7&8 — so once every tour Home
 * draws the two weakest commanders of the set together, and the reader watches the
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
 * Fisher-Yates over a seeded xorshift32 — see the step itself for why NOT an LCG —
 * rather than `Math.random`: this runs on the server on every Home render, and a
 * permutation that changed between two renders of the same day would make the
 * rotation per-visit — the thing the daily boundary exists to prevent.
 *
 * Note what this does NOT depend on: the ranking. It reads the account and the set
 * SIZE, so an import that leaves nine commanders ranked returns the identical
 * permutation and only the contents of the positions move. That is the intended
 * behaviour — the permutation's job is to break rank adjacency, not to encode a
 * particular list — but it is not the "reshuffles on a new ranking" this comment
 * once claimed, and the difference is visible: a reader who imports a collection
 * sees new commanders in the same slot order, not a reshuffled rotation.
 */
function permutation(size: number, userId: string): number[] {
  const order = Array.from({ length: size }, (_, i) => i);
  let state = hash(`${userId}:order`) || 1;
  for (let i = size - 1; i > 0; i -= 1) {
    // xorshift32, not an LCG. A modulus-2^32 LCG's LOW bits have period 2^k, and
    // `state % (i + 1)` takes exactly those — so successive swap choices are
    // correlated and the reachable permutation space collapses. Measured over
    // 200,000 account seeds: 22,677 distinct permutations of nine from the LCG
    // against 153,805 from this, out of 9! = 362,880. Per-step marginals were
    // uniform either way, so nothing downstream LOOKED wrong; accounts were
    // simply sharing an order far more often than they should.
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    const j = state % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

const DAY_MS = 86_400_000;

/**
 * `count` items from `set` for the UTC day containing `now`, walking a per-account
 * cycle so every item comes up on a fixed beat — and, while `2 * count <= size`,
 * so no two consecutive days share one. The header states where that second half
 * stops holding; do not restate it here as unconditional, which is how it read
 * until review caught the copy the module header had already been corrected for.
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
 *
 * `novelty`, when given, is what the cycle LEANS on (Hugh, 2026-09-27: "I've seen the same
 * few rotate in and out"). It changes the order the cycle walks and nothing about the walk:
 * see `noveltyOrder`. Without it the walk is the per-account shuffle, as it always was.
 */
export function dailyPicks<T>(
  set: readonly T[],
  userId: string,
  now: Date,
  count: number,
  novelty?: (item: T) => number,
): T[] {
  if (set.length <= count) return [...set];

  const size = set.length;
  const shuffled = permutation(size, userId);
  const order = novelty ? noveltyOrder(shuffled, (i) => novelty(set[i])) : shuffled;
  const day = Math.floor(now.getTime() / DAY_MS);

  // No per-account phase offset here, deliberately. One was written and removed:
  // every account walks the same POSITIONS on the same day, but through its own
  // permutation, so what it draws is already its own. Adding an offset moved
  // nothing observable — the test that two accounts see different sequences
  // passes identically with and without it.

  // `(day * count + i) % size` is distinct for every `i < count` whenever
  // `count <= size`, which the guard above has established — so a day never draws
  // one commander twice. Consecutive DAYS are a stronger condition and need
  // `2 * count <= size`; see the header for the one size where that fails.
  return Array.from({ length: count }, (_, i) => set[order[(day * count + i) % size]]);
}

/**
 * The shuffle, re-ordered to lean on the new: positions sorted by how new each commander is
 * (the themes it plays that none of the reader's decks do, most first), then the newer half
 * INTERLEAVED with the rest, so the cycle's `(day * count + i)` walk puts one card from each
 * half on every day at `count` 2. Every guarantee in the header still holds, because only the
 * order moved and the walk did not.
 *
 * Ties keep the shuffle's order (Array.prototype.sort is stable), so two readers whose pools
 * are equally new still walk their own sequences, and the rank-neighbourhood clustering the
 * shuffle exists to break stays broken: novelty is not rank.
 */
export function noveltyOrder(shuffled: readonly number[], novelty: (index: number) => number): number[] {
  // Nothing to lean on (a pool with no new themes, or a map the read could not fill): the shuffle
  // exactly. Interleaving halves of a list sorted by nothing would only be a second shuffle.
  const first = shuffled.length ? novelty(shuffled[0]) : 0;
  if (shuffled.every((i) => novelty(i) === first)) return [...shuffled];
  const byNew = [...shuffled].sort((a, b) => novelty(b) - novelty(a));
  const half = Math.ceil(byNew.length / 2);
  const out: number[] = [];
  for (let i = 0; i < half; i += 1) {
    out.push(byNew[i]);
    if (i + half < byNew.length) out.push(byNew[i + half]);
  }
  return out;
}
