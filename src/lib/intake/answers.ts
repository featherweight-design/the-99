import { seededAnswersIntent } from "../tuning/limits";
import { isUuid } from "../uuid";
import type { Bracket } from "./rank";

/**
 * Help me choose's answers on their way into `createDeck` (F1), and what the deck stores of them.
 * Pure.
 *
 * `createDeck` is a Server Action, so these arrive as whatever a request carried: each is checked
 * here, and a bad one refuses the create rather than being coerced.
 */
export type CreateAnswers = {
  /** Theme labels, for the brief only: they chose the commander and steer nothing after. */
  themes: string[];
  /** How the themes were joined, for the brief's wording alone. Absent is all of. */
  themeJoin?: "all" | "any";
  /** Set codes, for the brief's wording alone. */
  sets?: string[];
  cardOracleId: string | null;
  budgetDollars: number | null;
  bracket: number | null;
};

export type ValidAnswers = {
  themes: string[];
  themeJoin: "all" | "any";
  sets: string[];
  cardOracleId: string | null;
  budgetDollars: number | null;
  bracket: Bracket | null;
};

/** Whole dollars, as the column's check requires, and no more than any real budget. */
export const MAX_BUDGET_DOLLARS = 100_000;
/** The most theme labels a create takes: they write the brief, and the fill reads none of them. */
export const MAX_THEMES = 8;
/** The most set codes a create takes, for the brief. */
export const MAX_SETS = 8;
const MAX_THEME_LABEL = 60;

export function validateCreateAnswers(raw: CreateAnswers): ValidAnswers {
  const { budgetDollars, bracket, cardOracleId } = raw;
  if (budgetDollars !== null && !(Number.isInteger(budgetDollars) && budgetDollars >= 1 && budgetDollars <= MAX_BUDGET_DOLLARS)) {
    throw new Error("budget must be whole dollars");
  }
  if (bracket !== null && !(Number.isInteger(bracket) && bracket >= 1 && bracket <= 5)) {
    throw new Error("bracket must be 1 to 5");
  }
  // The shape only: that the card exists, is legal here and is not a basic land needs its catalog
  // row, and `createDeck` reads that row (a basic named as the answer is dropped there).
  if (cardOracleId !== null && !isUuid(cardOracleId)) throw new Error("card not found");
  if (!Array.isArray(raw.themes) || raw.themes.length > MAX_THEMES
    || raw.themes.some((t) => typeof t !== "string" || t.trim().length === 0 || t.length > MAX_THEME_LABEL || /[\r\n]/.test(t))) {
    throw new Error("themes are not valid");
  }
  if (raw.themeJoin !== undefined && raw.themeJoin !== "all" && raw.themeJoin !== "any") throw new Error("themes are not valid");
  if (raw.sets !== undefined && (!Array.isArray(raw.sets) || raw.sets.length > MAX_SETS
    || raw.sets.some((c) => typeof c !== "string" || !/^[a-z0-9]{2,8}$/.test(c)))) {
    throw new Error("sets are not valid");
  }
  return {
    themes: raw.themes.map((t) => t.trim()),
    themeJoin: raw.themeJoin ?? "all",
    sets: raw.sets ?? [],
    cardOracleId,
    budgetDollars,
    bracket: bracket as Bracket | null,
  };
}

export type AnswerColumns = {
  answerBudgetCents?: number | null;
  answerBracket?: number | null;
  answerCardOracleId?: string | null;
  intent?: string;
  intentSeeded?: boolean;
};

/**
 * The deck columns a Help me choose create writes, on the filled path and the empty one alike.
 *
 * THE BRIEF IS WRITTEN AT CREATE, on both paths. It is the player's own answers, true whether or
 * not the fill ran, and at create nobody has had the chance to edit it. It is also the one moment
 * the themes are known. A retry (`fillDeck`) writes no intent, by the rule that path already
 * keeps: by then a player may have written a line and cleared it, and a cleared line reads exactly
 * like one never written.
 *
 * `card` is the build-around card as the create resolved it; null when it was refused.
 */
export function answerColumnsFor(
  asked: ValidAnswers,
  card: { oracleId: string; name: string } | null,
  commanderNames: readonly string[],
): AnswerColumns {
  return {
    answerBudgetCents: asked.budgetDollars === null ? null : asked.budgetDollars * 100,
    answerBracket: asked.bracket,
    answerCardOracleId: card?.oracleId ?? null,
    intent: seededAnswersIntent(commanderNames, {
      themes: asked.themes, themeJoin: asked.themeJoin, sets: asked.sets, cardName: card?.name ?? null, budgetDollars: asked.budgetDollars, bracket: asked.bracket,
    }),
    intentSeeded: true,
  };
}
