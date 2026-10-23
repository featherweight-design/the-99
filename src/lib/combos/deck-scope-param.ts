/** A deck is 100 cards plus at most two commanders. Generous against that, and finite. */
export const MAX_DECK_SCOPE = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The combo scope as it arrives at `GET /api/card-detail` — a public endpoint, taking whatever
 * the caller put in the URL.
 *
 * Guarded by SHAPE before anything else: a crafted non-array throws on `.filter` before a
 * single id is looked at. Then by element type, then capped — an unbounded array is work the
 * caller chose for us rather than work the deck needs.
 *
 * Its own module because a test that restates the expression agrees with itself: this is the
 * one the route and the action call, and the one `fetchCardDetail`'s cap is read from.
 */
export function sanitizeDeckScope(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  // SLICED BEFORE FILTERED, which is the whole point of a cap on a public endpoint: applied
  // after, an arbitrarily large array is still traversed and regex-tested in full before the
  // limit takes effect, so the caller still chooses the work.
  //
  // A prefix of junk therefore yields fewer than the cap. That is the correct trade — the cap
  // bounds the WORK, not the yield, and nothing legitimate sends junk at all.
  return value
    .slice(0, MAX_DECK_SCOPE)
    .filter((id): id is string => typeof id === "string" && UUID.test(id));
}

/** A deck has one commander, or two partners. */
export const MAX_COMMANDER_SCOPE = 2;

/**
 * The scope's commanders as they arrive (combos close UI-3, OPEN-2): `loadCardCombos` holds a
 * command-zone-only piece only as a commander and reads the deck's colors from them. The same rule
 * as `sanitizeDeckScope`, shape first, sliced before filtered, at most two.
 */
export function sanitizeCommanderScope(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .slice(0, MAX_COMMANDER_SCOPE)
    .filter((id): id is string => typeof id === "string" && UUID.test(id));
}
