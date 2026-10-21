import type { BracketReach } from "./bracket-reach";
import type { Bracket } from "./rank";
import type { CardChip } from "./rows";

/**
 * What the hand-off's Bracket row says (bracket reach PR 3b, Design R1b board C), for the deck
 * `createDeck` would build from these answers. Pure and client-safe: the action reads the trial,
 * this decides the state.
 *
 * Null draws today's ceiling line: no bracket of 3 or more, the switch off, the fixed cards already
 * inside the target or above it, or a deck that reaches the target with no card placed to get there
 * (an "any cards" fill can buy a Game Changer the gate admits). Otherwise:
 *  - REACHED (`permits` includes `target`): the line names the owned cards the fill placed;
 *  - SHORT with `buy`: the choice, *From my collection* (lands in `permits`) or *Hit bracket N*;
 *  - SHORT with no `buy`: a statement only, nothing reaches it.
 */
export type HandOffReach = {
  target: Bracket;
  /** The brackets the deck permits as the create would build it with no choice made. */
  permits: Bracket[];
  /** The owned cards the fill placed to reach a bracket, each marked when it is a Game Changer. */
  placed: (CardChip & { gameChanger: boolean })[];
  /** What *Hit bracket N* buys, when the deck falls short and buying reaches the target. */
  buy: {
    cards: CardChip[];
    cents: number;
    /** Costs more than the budget LEFT once the build-around card is charged (audit item 10). */
    overBudget: boolean;
    /** By how much; 0 when within the budget. */
    overCents: number;
    /** The budget the create stores when Hit is picked over it (G1); null when no raise. */
    raisedBudgetCents: number | null;
  } | null;
};

export function handOffReachOf(args: {
  target: Bracket;
  permits: readonly Bracket[];
  reach: BracketReach | null;
  placedRaisers: readonly string[];
  budgetCents: number | null;
  budgetLeftCents: number | null;
  chipOf: (oracleId: string) => CardChip | null;
  isGameChanger: (oracleId: string) => boolean;
}): HandOffReach | null {
  const { target, reach } = args;
  if (target < 3 || !reach || reach.kind === "fixed" || reach.kind === "above") return null;
  const permits = [...args.permits].sort((a, b) => a - b);
  const placed = args.placedRaisers.flatMap((id) => {
    const chip = args.chipOf(id);
    return chip ? [{ ...chip, gameChanger: args.isGameChanger(id) }] : [];
  });
  if (permits.includes(target)) return placed.length > 0 ? { target, permits, placed, buy: null } : null;
  if (reach.kind !== "short" || !reach.buy) return { target, permits, placed, buy: null };
  const cards = reach.buy.raisers.flatMap((id) => args.chipOf(id) ?? []);
  // A set the screen cannot name is not a choice it can offer: the statement stands instead.
  if (cards.length !== reach.buy.raisers.length) return { target, permits, placed, buy: null };
  const cents = reach.buy.buyCents;
  const overCents = args.budgetLeftCents === null ? 0 : Math.max(0, cents - args.budgetLeftCents);
  return {
    target, permits, placed,
    buy: {
      cards, cents,
      overBudget: overCents > 0,
      overCents,
      // Whole dollars, up, as `buildFillPlan` stores it (`decks_answer_budget_check`).
      raisedBudgetCents: overCents > 0 && args.budgetCents !== null ? Math.ceil((args.budgetCents + overCents) / 100) * 100 : null,
    },
  };
}

/** What *From my collection* submits as the bracket: the highest the deck permits, so the create
 *  (and a retry) builds that deck rather than reaching for a target it cannot hit. */
export function fromMineBracket(r: HandOffReach): Bracket {
  return Math.max(...r.permits) as Bracket;
}
