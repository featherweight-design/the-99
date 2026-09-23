import { slotDeck } from "../bracket/slot";
import type { Bracket, DeckProfile } from "../profile/types";

/**
 * The bracket flag on a suggestion (Hugh, 2026-09-23: a swap that moves the deck's bracket is
 * SHOWN, FLAGGED — never dropped, never silent). Pure.
 *
 * It compares two verdicts, both from `slotDeck` — the verdict's own function — so the flag and
 * the Analysis tab can never disagree about what a deck is. `after` is the REAL profile of the
 * post-swap list, built by the same loader as `before` (the caller, `runTuning`, builds it from
 * the swapped head). An approximation that edited `before`'s bracket group was tried and
 * dropped: a combo the add completes needs its tutor reaches rebuilt, which only the loader's
 * classifiers can do, and without them the flag named the wrong bracket. `bracketDelta` is
 * never read; its `[3] → [4]` transition is unreachable, and two direct verdicts have no gap.
 *
 * Null when the swap moves nothing, otherwise the permits the deck would have.
 */
export function bracketAfter(args: {
  before: DeckProfile;
  after: DeckProfile;
  declared: Bracket | null;
}): Bracket[] | null {
  const was = slotDeck(args.before, args.declared).permits;
  const would = slotDeck(args.after, args.declared).permits;
  return sameBrackets(was, would) ? null : would;
}

function sameBrackets(a: readonly Bracket[], b: readonly Bracket[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
