import type { StatusPill } from "./read";

/** The 99/99 reveal is a one-shot event, but statusPill() is a derived status
 *  that reads "Complete" forever. Gate on a persisted per-deck flag so the
 *  kaiju stays a rare win rather than permanent furniture.
 *
 *  Deliberately pure: the localStorage read stays at the component boundary so
 *  this decision is node-testable and has no DOM dependency. */
export function shouldCelebrate(args: {
  status: StatusPill;
  alreadyCelebrated: boolean;
}): boolean {
  return args.status === "Complete" && !args.alreadyCelebrated;
}

/** Per-deck localStorage key. Deck ids are `uuid().defaultRandom()` primary
 *  keys (src/db/schema.ts §decks) — never reused, so a stale entry left behind
 *  by a deleted deck is inert rather than a misfire on someone else's deck. */
export function celebrationKey(deckId: string): string {
  return `the99:celebrated:${deckId}`;
}
