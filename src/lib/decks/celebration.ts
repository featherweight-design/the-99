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
 *  built. The reveal waits for the first card they add themselves. */
export function shouldCelebrate(args: {
  status: StatusPill;
  alreadyCelebrated: boolean;
  arrivedFromImport: boolean;
}): boolean {
  if (args.arrivedFromImport) return false;
  return args.status === "Complete" && !args.alreadyCelebrated;
}

/** Per-deck localStorage key. Deck ids are `uuid().defaultRandom()` primary
 *  keys (src/db/schema.ts §decks) — never reused, so a stale entry left behind
 *  by a deleted deck is inert rather than a misfire on someone else's deck. */
export function celebrationKey(deckId: string): string {
  return `the99:celebrated:${deckId}`;
}
