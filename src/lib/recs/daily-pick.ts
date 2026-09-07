/**
 * Which commander the home hero shows today.
 *
 * The hero used to render `items[0]` forever, which is #345's complaint: the one
 * surface meant to introduce you to your collection never changed. Rotation is
 * daily rather than per-visit so the card is something you can point a friend at,
 * and daily rather than tied to collection changes because a collection can sit
 * still for weeks between CSV imports — which is the same complaint again.
 *
 * The pick is derived, not stored. Nothing is written and no extra query runs;
 * the ranked list is already in hand by the time this is called.
 */

/**
 * How far down the ranking the hero will reach.
 *
 * Five because every one of the top five is a defensible recommendation, and
 * reaching further would put the home screen's single pick behind commanders the
 * ranking itself does not stand behind.
 */
export const ROTATION_WINDOW = 5;

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
 * The pick for `userId` on the UTC day containing `now`, or null when there are no
 * candidates.
 *
 * The day boundary is UTC rather than the reader's zone because this runs on the
 * server, where the reader's zone is not known at render time. The cost is that the
 * card turns over mid-evening for readers west of UTC rather than at their midnight.
 *
 * The seed carries `userId` as well as the date so two accounts looking at the same
 * ranking on the same day are not locked to the same commander.
 */
export function dailyPick<T>(items: readonly T[], userId: string, now: Date): T | null {
  if (items.length === 0) return null;
  const window = Math.min(items.length, ROTATION_WINDOW);
  const day = now.toISOString().slice(0, 10);
  return items[hash(`${userId}:${day}`) % window];
}
