import type { BracketTarget } from "../precons/upgrade/targets";
import { isBracketTarget } from "../precons/upgrade/targets";
import { BUDGET_MAX_CENTS, BUDGET_MIN_CENTS, type PoolMode } from "./constants";

/**
 * Help me choose's answers as the Guided sheet's starting picks (H2 to H4): each step opens pre-picked and marked `from your answers`.
 * Pure. A step the answers do not settle stays null (nothing pre-picked), and a card the answers name is kept (the build-around card).
 */
export type CarryIn = {
  strategyKey: string | null;
  bracket: BracketTarget | null;
  poolMode: PoolMode | null;
  budgetCents: number | null;
  kept: string[];
};

export type CarryAnswers = {
  themes: readonly { slug: string; label: string }[];
  pool: "any" | "own";
  card: { oracleId: string } | null;
  budgetDollars: number | null;
  bracket: number | null;
};

export const NO_CARRY: CarryIn = { strategyKey: null, bracket: null, poolMode: null, budgetCents: null, kept: [] };

/** The first answered theme the offer backs, by the index's slug or its label; the bracket only if it is one Guided offers (2 to 4). */
export function carryIn(answers: CarryAnswers | null, offered: readonly { key: string; label: string }[]): CarryIn {
  if (answers === null) return NO_CARRY;
  const same = (o: { key: string; label: string }, t: { slug: string; label: string }) => o.key === t.slug || o.label.trim().toLowerCase() === t.label.trim().toLowerCase();
  let strategy: { key: string } | null = null;
  for (const t of answers.themes) {
    strategy = offered.find((o) => same(o, t)) ?? null;
    if (strategy) break;
  }
  const bracket = answers.bracket !== null && isBracketTarget(answers.bracket) ? answers.bracket : null;
  const cents = answers.budgetDollars !== null && answers.pool === "any" ? Math.round(answers.budgetDollars * 100) : null;
  // A budget Guided would refuse (zero, negative, not a number, past the cap) pre-picks nothing.
  const budget = cents !== null && Number.isFinite(cents) && cents >= BUDGET_MIN_CENTS && cents <= BUDGET_MAX_CENTS ? cents : null;
  return {
    strategyKey: strategy?.key ?? null,
    bracket,
    poolMode: answers.pool === "own" ? "owned" : budget !== null ? "budget" : null,
    budgetCents: budget,
    kept: answers.card ? [answers.card.oracleId] : [],
  };
}
