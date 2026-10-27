import { isUuid } from "../uuid";
import type { DeckAnswers } from "./fill-facts";
import { bracketOf } from "../bracket/rules";
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
  /** `own`: the 99 from the player's own cards. Absent is any cards. */
  pool?: "any" | "own";
  cardOracleId: string | null;
  budgetDollars: number | null;
  bracket: number | null;
  /** *Hit bracket N* on the hand-off (bracket reach PR 3b): buy the cards that reach the bracket.
   *  False for *From my collection*, and wherever no choice was drawn. */
  bracketBuys: boolean;
};

export type ValidAnswers = {
  themes: string[];
  themeJoin: "all" | "any";
  sets: string[];
  pool: "any" | "own";
  cardOracleId: string | null;
  budgetDollars: number | null;
  bracket: Bracket | null;
  /** Asked, with a bracket of 3 or more. `createDeck` still checks the switch and its own reach. */
  bracketBuys: boolean;
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
  if (raw.pool !== undefined && raw.pool !== "any" && raw.pool !== "own") throw new Error("pool is not valid");
  // Absent from an older client reads as not asked. Anything but a boolean is refused.
  if (raw.bracketBuys !== undefined && typeof raw.bracketBuys !== "boolean") throw new Error("bracket choice is not valid");
  return {
    themes: raw.themes.map((t) => t.trim()),
    themeJoin: raw.themeJoin ?? "all",
    sets: raw.sets ?? [],
    pool: raw.pool ?? "any",
    cardOracleId,
    budgetDollars,
    bracket: bracket as Bracket | null,
    // Only a bracket of 3 or more has anything to buy toward: under it the ask is ignored, not
    // refused, since the deck it would cost is the one the player asked for.
    bracketBuys: raw.bracketBuys === true && bracket !== null && bracket >= 3,
  };
}

export type AnswerColumns = {
  answerAsked?: boolean;
  answerBudgetCents?: number | null;
  answerBracket?: number | null;
  answerCardOracleId?: string | null;
  answerOwnedOnly?: boolean;
  answerBracketBuys?: boolean;
  answerBudgetRaised?: boolean;
};

/**
 * The deck columns a Help me choose create writes, on the filled path and the empty one alike.
 *
 * No `intent` any more (H35, ruling 3): the player's own description is the one line a reader
 * sees, and nothing is auto-written into it at create. `card` is the build-around card as the
 * create resolved it; null when it was refused.
 */
export function answerColumnsFor(
  asked: ValidAnswers,
  card: { oracleId: string; name: string } | null,
): AnswerColumns {
  return {
    answerAsked: true,
    answerBudgetCents: asked.budgetDollars === null ? null : asked.budgetDollars * 100,
    answerBracket: asked.bracket,
    answerCardOracleId: card?.oracleId ?? null,
    answerOwnedOnly: asked.pool === "own",
    // The ask as validated; `createDeck` writes what it honored on the filled path.
    answerBracketBuys: asked.bracketBuys,
  };
}

/** What a deck stored of its answers, as `fillDeck` reads them back. */
export type StoredAnswers = {
  answerAsked: boolean;
  answerBudgetCents: number | null;
  answerBracket: number | null;
  answerCardOracleId: string | null;
  answerBracketBuys: boolean;
  answerBudgetRaised: boolean;
};

/**
 * The answers a retry fills to (F1): exactly what the create handed the plan, or null for a deck
 * started any other way. A Help me choose deck that answered nothing gated still gets an answers
 * object, because the plan reads its presence as Help me choose ("Any cards" buys from the
 * commander's best-played list). A deck made before `answer_asked` existed counts as asked when it
 * stored any answer, which is the rule the retry used before the column.
 */
export function retryAnswersOf(deck: StoredAnswers): DeckAnswers | null {
  const budgetCents = deck.answerBudgetCents ?? null;
  const bracket = bracketOf(deck.answerBracket ?? null);
  const cardOracleId = deck.answerCardOracleId ?? null;
  if (!deck.answerAsked && budgetCents === null && bracket === null && cardOracleId === null) return null;
  return {
    budgetCents, bracket, cardOracleId,
    // *Hit bracket N*, as the create stored it, so the retry places the same set to buy.
    bracketBuys: deck.answerBracketBuys === true,
    budgetRaised: deck.answerBudgetRaised === true,
  };
}
