import type { StatusPill } from "./status";

/** The 99/99 reveal is a one-shot event, but statusPill() is a derived status
 *  that reads "Complete" forever. Gate on a persisted per-deck flag so the
 *  reveal stays a rare win rather than permanent furniture.
 *
 *  Deliberately pure: the localStorage read stays at the component boundary so
 *  this decision is node-testable and has no DOM dependency.
 *
 *  `arrivedFromImport` suppresses it (ruling of 2026-08-04): a clean 99-line
 *  import would otherwise spend the one-shot moment on a deck the player never
 *  built. The reveal waits for the first card they add themselves.
 *
 *  `completedByFill` suppresses it for the same reason the fill gives the deck:
 *  the reveal is a receipt for a deck the player built, and a two-click fill
 *  has not earned it — the fill's own receipt is its counts plus the provenance
 *  line. */
export function shouldCelebrate(args: {
  status: StatusPill;
  alreadyCelebrated: boolean;
  arrivedFromImport: boolean;
  completedByFill: boolean;
}): boolean {
  if (args.arrivedFromImport || args.completedByFill) return false;
  return args.status === "Complete" && !args.alreadyCelebrated;
}

/** Per-deck localStorage key. Deck ids are `uuid().defaultRandom()` primary
 *  keys (src/db/schema.ts §decks) — never reused, so a stale entry left behind
 *  by a deleted deck is inert rather than a misfire on someone else's deck. */
export function celebrationKey(deckId: string): string {
  return `the99:celebrated:${deckId}`;
}

/** Per-deck localStorage key recording that a fill placed the last card.
 *  Distinct from celebrationKey: reading celebrationKey here would open the
 *  reveal band rather than suppress it. Write-once per deck; persisted so the
 *  suppression survives a revalidation in the same frame that sets serverStatus
 *  to Complete. */
export function fillCompletedKey(deckId: string): string {
  return `the99:filled-by-fill:${deckId}`;
}
