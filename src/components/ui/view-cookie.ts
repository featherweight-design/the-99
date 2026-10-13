// The two facts `/collection` needs at the server to draw the view the reader will see, kept as
// cookies because localStorage and `matchMedia` cannot reach a server render. Without them the
// server drew rows and the grid replaced them at hydration: 1.9 to 3.0s of rows on every cold
// desktop visit on the slow profile (`probe:view-flash`).
//
// HINTS, NEVER TRUSTED INPUT. Each is parsed to a closed set and anything else reads as absent,
// so a hand-edited or stale cookie can only cost the flash it exists to remove. Neither carries
// anything about the reader beyond a layout preference.
//
// No "use client": the parsers run in the page, and `writeViewCookie` touches `document` only
// when a client calls it.

/** The view the reader last chose on `/collection`, mirrored from localStorage. */
export const COLLECTION_VIEW_COOKIE = "collection_view";
/** Whether the reader's window was at least 768px wide on their last visit. "1" or "0". */
export const COLLECTION_WIDE_COOKIE = "collection_wide";

export type CollectionView = "grid" | "rows";

export function parseViewCookie(raw: string | undefined | null): CollectionView | null {
  return raw === "grid" || raw === "rows" ? raw : null;
}

export function parseWideCookie(raw: string | undefined | null): boolean | null {
  return raw === "1" ? true : raw === "0" ? false : null;
}

/** The view the reader last chose on `/decks/precons` (R4), mirrored from localStorage. Tiles or rows
 *  differ in height and in what art they ask for, so the server has to draw the stored one. */
export const PRECONS_VIEW_COOKIE = "precons_view";

export function parsePreconsViewCookie(raw: string | undefined | null): "tiles" | "rows" | null {
  return raw === "tiles" || raw === "rows" ? raw : null;
}

/** A year: the preference outlives a session, and a stale one costs only a flip. */
const MAX_AGE_S = 60 * 60 * 24 * 365;

export function writeViewCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${MAX_AGE_S}; SameSite=Lax`;
}

/** Which Stats cards the reader left open on `/decks` (G10), as `useDecksStatsFold` writes it. */
export const DECKS_STATS_OPEN_COOKIE = "decks_stats_open";

export type DecksView = "tiles" | "stats";

