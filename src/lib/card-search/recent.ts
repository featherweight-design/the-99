// Recent cards (plan `2026-10-16-card-search.md`, PR C): the last cards opened from search, kept in this browser
// under the reader's own key, newest first, deduped, at most `RECENT_LIMIT`. Only what draws the row before its
// signals arrive is kept (id, name, art, the flavor name it matched by); ownership, decks and the wishlist are read
// fresh on every open (`cardSignalsAction`). Storage can be missing or throw (a private window, blocked site data),
// so every access is caught, and a broken entry reads as an empty list rather than an error.

// Not imported from `search.ts`, which reaches the database: this module runs in the browser. The test holds the
// two equal, since the signals read refuses more ids than `SIGNALS_LIMIT`.
export const RECENT_LIMIT = 8;

export type RecentCard = {
  oracleId: string;
  name: string;
  imageUri: string | null;
  flavorName: string | null;
};

export function recentKey(userId: string): string {
  return `card-search:recent:${userId}`;
}

function isRecent(v: unknown): v is RecentCard {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.oracleId === "string"
    && typeof r.name === "string"
    && (r.imageUri === null || typeof r.imageUri === "string")
    && (r.flavorName === null || typeof r.flavorName === "string")
  );
}

/** The stored list, newest first; empty when nothing is stored, storage is blocked, or the entry is not ours. */
export function readRecent(userId: string): RecentCard[] {
  try {
    const raw = window.localStorage.getItem(recentKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isRecent).slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

/** `card` moved (or added) to the front, the list cut to the limit. Pure. */
export function withRecent(list: readonly RecentCard[], card: RecentCard): RecentCard[] {
  const { oracleId, name, imageUri, flavorName } = card;
  return [{ oracleId, name, imageUri, flavorName }, ...list.filter((c) => c.oracleId !== oracleId)].slice(0, RECENT_LIMIT);
}

/** Records a card opened from search and returns the list as stored (the old one when storage refuses). */
export function pushRecent(userId: string, card: RecentCard): RecentCard[] {
  const next = withRecent(readRecent(userId), card);
  try {
    window.localStorage.setItem(recentKey(userId), JSON.stringify(next));
  } catch {
    // Storage full or blocked: the list simply does not grow.
  }
  return next;
}

/** Empties the reader's list: the sheet's Clear, and sign-out (README call 7). */
export function clearRecent(userId: string): void {
  try {
    window.localStorage.removeItem(recentKey(userId));
  } catch {
    // Nothing stored, or storage blocked: there is nothing to clear.
  }
}
