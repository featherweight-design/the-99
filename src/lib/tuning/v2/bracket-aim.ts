import { permitsOf, type GateFacts } from "../../intake/fill-gate";

/**
 * The bracket choice beside a Suggested changes v2 request (Hugh, spec 2026-10-27 §5.4, §12 Q7; the handoff's Bracket
 * card: Keep at N, the default; Down to N; Up to N). Pure.
 *
 * `bracketAfter` is the shipped per-line flag (`bracket-shift.ts`): the brackets the deck permits with that one change,
 * or null when the change moves nothing. A deck whose reading is a range ("Exhibition or Core") permits more than one.
 *
 * - **Keep**: nothing suggested moves the deck out of its bracket. A line whose permits no longer reach the bracket kept
 *   at is dropped (`bracketAim`). A deck read as a range keeps the whole range (d9, 2026-10-28): `target` is its top and
 *   `low` its bottom, and a line is dropped only when none of its permits fall in [low, target]; a single bracket sends no
 *   `low`, so it keeps exactly its own. The player chose this, so the drop is a restriction, like a price cap (`charge.ts`).
 * - **Down**: additions stay inside the target. An addition is dropped when its permits exclude the target, or when the
 *   card ALONE cannot sit in a deck at the target (`cardFloor`, the lowest bracket a deck holding it can be: a second Game
 *   Changer leaves a bracket-3 deck's permits at [3], so the delta alone would let it through). Cuts are steered by the
 *   prompt, never dropped for this.
 * - **Up**: nothing is dropped; an addition that reaches the target is flagged (`reachesAim`).
 *
 * This supersedes the 2026-09-23 "a suggestion that moves the bracket is shown, flagged" rule for v2 runs only, where the
 * player has stated an aim; v10 and Proposed cuts keep it.
 */
export type BracketChoice = "keep" | "down" | "up";
export type BracketAim = { choice: BracketChoice; target: number; /** Keep on a range: its bottom. */ low?: number };

export function aimDrops(
  aim: BracketAim, side: "add" | "cut", bracketAfter: readonly number[] | null,
  /** For an addition: the lowest bracket any deck holding this card can be (null when the card bars none). */
  cardFloor: number | null = null,
): boolean {
  if (aim.choice === "keep") {
    const low = aim.low ?? aim.target;
    return bracketAfter !== null && !bracketAfter.some((b) => b >= low && b <= aim.target);
  }
  if (aim.choice === "down" && side === "add") {
    return (bracketAfter !== null && !bracketAfter.includes(aim.target)) || (cardFloor !== null && cardFloor > aim.target);
  }
  return false;
}

/** An addition that brings the deck within reach of an Up aim: the deck permits the target with it. */
export function reachesAim(aim: BracketAim, side: "add" | "cut", bracketAfter: readonly number[] | null): boolean {
  return aim.choice === "up" && side === "add" && bracketAfter !== null && bracketAfter.includes(aim.target);
}

/**
 * `cardFloor` for `aimDrops`' Down rule (H3): the lowest bracket ANY deck holding this card can be, by the analysis's own
 * arithmetic (`permitsOf`, `fill-gate.ts`) over a list of the card alone. A Game Changer floors at 3 however many the deck
 * already holds, which `bracketAfter` cannot see when the deck's permits do not move; a card's combos need a partner, so
 * they are `bracketAfter`'s question, not this one. `facts` is `loadBracketGateFacts([oracleId])`.
 */
export function cardFloorOf(oracleId: string, facts: GateFacts): number {
  return Math.min(...permitsOf([], [oracleId], facts));
}
