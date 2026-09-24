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

/**
 * How the card words its bracket flag, against the reading on screen now (READINESS-r3-audit.md,
 * note 1). Both sides are permit SETS, and a swap can widen or narrow a range as well as move it,
 * so the LOWEST permitted bracket decides: higher raises, lower lowers, and an equal lowest with
 * a different set changes. Null when there is no flag, or the stored flag agrees with the reading
 * the reader sees now (the deck moved since the run, and the swap no longer shifts anything).
 */
export function bracketShift(
  now: readonly number[],
  after: readonly number[] | null,
): "raises" | "lowers" | "changes" | null {
  if (after === null || after.length === 0 || now.length === 0) return null;
  if (after.length === now.length && after.every((x, i) => x === now[i])) return null;
  const was = Math.min(...now);
  const would = Math.min(...after);
  return would > was ? "raises" : would < was ? "lowers" : "changes";
}
