/**
 * The bracket choice beside a Suggested changes v2 request (Hugh, spec 2026-10-27 §5.4, §12 Q7; the handoff's Bracket
 * card: Keep at N, the default; Down to N; Up to N). Pure.
 *
 * `bracketAfter` is the shipped per-line flag (`bracket-shift.ts`): the brackets the deck permits with that one change,
 * or null when the change moves nothing. A deck whose reading is a range ("Exhibition or Core") permits more than one.
 *
 * - **Keep**: nothing suggested moves the deck out of its bracket. A line whose permits no longer include the bracket kept
 *   at is dropped (`bracketAim`). The player chose this, so the drop is a restriction, like a price cap (`charge.ts`).
 * - **Down**: additions stay inside the target; an addition whose permits exclude it is dropped. Cuts are steered by the
 *   prompt, never dropped for this.
 * - **Up**: nothing is dropped; an addition that reaches the target is flagged (`reachesAim`).
 *
 * This supersedes the 2026-09-23 "a suggestion that moves the bracket is shown, flagged" rule for v2 runs only, where the
 * player has stated an aim; v10 and Proposed cuts keep it.
 */
export type BracketChoice = "keep" | "down" | "up";
export type BracketAim = { choice: BracketChoice; target: number };

export function aimDrops(aim: BracketAim, side: "add" | "cut", bracketAfter: readonly number[] | null): boolean {
  if (bracketAfter === null) return false;
  if (aim.choice === "keep") return !bracketAfter.includes(aim.target);
  if (aim.choice === "down") return side === "add" && !bracketAfter.includes(aim.target);
  return false;
}

/** An addition that brings the deck within reach of an Up aim: the deck permits the target with it. */
export function reachesAim(aim: BracketAim, side: "add" | "cut", bracketAfter: readonly number[] | null): boolean {
  return aim.choice === "up" && side === "add" && bracketAfter !== null && bracketAfter.includes(aim.target);
}
