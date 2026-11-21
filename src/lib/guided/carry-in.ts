import type { BracketTarget } from "../precons/upgrade/targets";
import { isBracketTarget } from "../precons/upgrade/targets";
import type { PoolMode } from "./constants";

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
  const theme = answers.themes.find((t) => offered.some((o) => o.key === t.slug || o.label.toLowerCase() === t.label.toLowerCase()));
  const strategy = theme ? offered.find((o) => o.key === theme.slug || o.label.toLowerCase() === theme.label.toLowerCase()) ?? null : null;
  const bracket = answers.bracket !== null && isBracketTarget(answers.bracket) ? answers.bracket : null;
  const budget = answers.budgetDollars !== null && answers.pool === "any" ? Math.round(answers.budgetDollars * 100) : null;
  return {
    strategyKey: strategy?.key ?? null,
    bracket,
    poolMode: answers.pool === "own" ? "owned" : budget !== null ? "budget" : null,
    budgetCents: budget,
    kept: answers.card ? [answers.card.oracleId] : [],
  };
}
