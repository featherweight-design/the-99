/** A deck is 100 cards plus at most two commanders. Generous against that, and finite. */
export const MAX_DECK_SCOPE = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The combo scope as it arrives at a SERVER ACTION — a public endpoint, and this parameter
 * is new.
 *
 * Guarded by SHAPE before anything else: a crafted non-array throws on `.filter` before a
 * single id is looked at. Then by element type, then capped — an unbounded array is work the
 * caller chose for us rather than work the deck needs.
 *
 * Its own module because a `"use server"` file may export only async functions, and because
 * a test that restates the expression agrees with itself: this is the one the action calls.
 */
export function sanitizeDeckScope(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((id): id is string => typeof id === "string" && UUID.test(id))
    .slice(0, MAX_DECK_SCOPE);
}
