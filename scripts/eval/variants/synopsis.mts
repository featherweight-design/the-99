import type { SynopsisFacts } from "../../../src/lib/synopsis/facts";
import { CHAR_BUDGETS } from "../../../src/lib/synopsis/limits";

/**
 * Overview variants, each a TRANSFORM of the app's own work and never a copy of it: `facts` runs
 * on the facts `factsFor` built, before `buildSynopsisPrompt` renders them, and `prompt` runs on
 * what `buildSynopsisPrompt` returned. The validator checks against the facts the model was shown.
 */
export type Messages = { system: string; user: string };

export type SynopsisVariant = {
  id: string;
  reason: string;
  facts?: (facts: SynopsisFacts) => SynopsisFacts;
  prompt?: (messages: Messages, facts: SynopsisFacts) => Messages;
};

/** Reminder text: a parenthesized explanation of a keyword, never a rule of its own. */
export function stripReminders(text: string): string {
  return text.replace(/\s*\([^()]*\)/g, "").replace(/\s{2,}/g, " ").trim();
}

export const SYNOPSIS_VARIANTS: Record<string, SynopsisVariant> = {
  base: { id: "base", reason: "The shipped prompt, unchanged." },
  trim: {
    id: "trim",
    reason:
      "The rules text trimmed where it cannot inform the overview: reminder text in parentheses removed, and no rules text " +
      "for a basic land, whose type line already says what it taps for. Every card, name, type line and category stays.",
    facts: (facts) => ({
      ...facts,
      cards: facts.cards.map((c) => ({
        ...c,
        oracleText: /\bBasic\b/.test(c.typeLine) || c.oracleText === null ? null : stripReminders(c.oracleText) || null,
      })),
    }),
  },
};

/**
 * Round 1 (plan step 2b, applied to every model because the failure is not model-specific). On the
 * four DEVELOPMENT decks, 12 of 12 calibration answers had Key cards refused `over_budget`: the job
 * line ran 65 characters at the median against its 60, with 50 of 87 over. The primer failed on
 * mulligan lines (11 of 55 over 80) and tips (5 of 44 over 176). The budgets are read from
 * `CHAR_BUDGETS`, never restated, and are never loosened here: this asks for shorter text.
 */
const BUDGET_RULES = [
  "Lengths are counted in characters as the text renders ([[Name]] counts as the name alone). One item over its limit refuses its whole section, so stay well under:",
  `- a Key card's job: at most ${CHAR_BUDGETS.job} characters; write one short clause of about ${CHAR_BUDGETS.job - 20}. For example: "Ramps two lands a turn off the top." (35).`,
  `- a mulligan line: at most ${CHAR_BUDGETS.mulligan}; aim for about ${CHAR_BUDGETS.mulligan - 25}.`,
  `- a tip: at most ${CHAR_BUDGETS.tip}; aim for about ${CHAR_BUDGETS.tip - 50}.`,
  "Before you answer, count each job, mulligan line and tip, and shorten any that is near or over its limit.",
].join("\n");

SYNOPSIS_VARIANTS.budgets = {
  id: "budgets",
  reason: "Round 1: the character budgets restated with targets under each limit and one worked example. From the dev-deck calibration.",
  prompt: (m) => ({ system: `${m.system}\n${BUDGET_RULES}`, user: m.user }),
};

/**
 * Round 2. On the dev decks, round 1 fixed Key cards for both Sonnet cells (sonnet-low 8% to 75%
 * passing, job median 54 to 48 characters) but not for Haiku (median 80 to 65: it does not count
 * characters). What refused next, on the same decks: `uncomputed_figure` in the mulligan lines
 * (a turn number, or a count the facts do not hold), `strength_claim`, and `unmarked_card` (a deck
 * card named without its marks, the commander most often). So this adds a WORD target for the job
 * line, this deck's own allowed figures, the words the checker refuses, and the marking rule for
 * every mention. The figures are the facts' own `figures`, never restated.
 */
const PLUS_RULES = (facts: SynopsisFacts) => [
  "A Key card's job is 4 to 8 words.",
  `In the mulligan lines, every number, written as digits or as a word like "two", must be one of: ${facts.figures.join(", ")}. Do not name a turn number; say "early" or "late" instead.`,
  "Never use these words anywhere: strong, powerful, efficient, competitive, casual, optimized, tier, score, rating, bracket, power level, brutal, busted, oppressive, respectable.",
  "Mark EVERY mention of a card in the decklist, the commander included and every repeat: [[Name]] each time.",
].join("\n");

SYNOPSIS_VARIANTS["budgets-plus"] = {
  id: "budgets-plus",
  reason: "Round 2: round 1's budgets, plus a word target for the job line, the deck's own mulligan figures, the refused words, and marking every mention.",
  prompt: (m, facts) => ({ system: `${m.system}\n${BUDGET_RULES}\n${PLUS_RULES(facts)}`, user: m.user }),
};

export function applySynopsisVariant(variant: SynopsisVariant, facts: SynopsisFacts, build: (f: SynopsisFacts) => Messages) {
  const shown = variant.facts ? variant.facts(facts) : facts;
  const built = build(shown);
  return { facts: shown, messages: variant.prompt ? variant.prompt(built, shown) : built };
}

/**
 * Round 3, on contract v6 (orchestrator, 2026-09-24). The v6 re-measure lost 7 points of all four
 * to the primer, and the primer's overruns are its MULLIGAN lines: median 75 characters against an
 * 80 budget, 58 of 180 over, because a specific line names cards and runs longer. The shipped prompt
 * already says "aim for about 55", so this states the budget as words and as one idea per line, and
 * shows two lines sized to it. Neither example opens with the heading's word. Only the first names
 * a curve point, which cost the specific share on the dev decks (round 3b below). The
 * budget is read from `CHAR_BUDGETS`, never restated.
 */
const PRIMER_BUDGET_RULES = [
  `Mulligan lines are the tightest budget in the answer: at most ${CHAR_BUDGETS.mulligan} characters as rendered, and aim for about 50. Write 8 to 12 words, with ONE card or ONE point on the curve per line, never a list.`,
  "The land range the app shows above the Mulligan is not one of your lines and does not count toward any line's length.",
  'Two lines sized to the budget: "A two-mana rock plus an early play to build on." (47), and "Only expensive spells, with nothing to cast before the late game." (65).',
].join("\n");

SYNOPSIS_VARIANTS["primer-budget"] = {
  id: "primer-budget",
  reason: "Round 3 on v6: the mulligan budget as a word target, one idea per line, the land line not counted, and two worked lines sized to it. From the v6 held-out overruns.",
  prompt: (m) => ({ system: `${m.system}\n${PRIMER_BUDGET_RULES}`, user: m.user }),
};

/**
 * Round 3b. The first primer-budget run on the dev decks cut primer over_budget from 5 to 0 and
 * mulligan overruns from 17 to 1, but the specific share fell from 77% to 56%: the model copied the
 * second worked line, which names neither a card nor a curve point. So both worked lines now carry
 * one, the second a decklist mark, and the rule says every line must.
 */
const PRIMER_BUDGET_RULES_B = [
  `Mulligan lines are the tightest budget in the answer: at most ${CHAR_BUDGETS.mulligan} characters as rendered, and aim for about 50. Write 8 to 12 words.`,
  "Every mulligan line names ONE card from the decklist, as [[Name]], or ONE point on the curve (a two-drop, a three-mana play), never a list and never neither.",
  "The land range the app shows above the Mulligan is not one of your lines and does not count toward any line's length.",
  'Two lines sized to the budget: "A two-mana rock plus an early play to build on." (47), and "[[Sol Ring]] with no three-drop behind it stalls out." (49).',
].join("\n");

SYNOPSIS_VARIANTS["primer-budget-b"] = {
  id: "primer-budget-b",
  reason: "Round 3b on v6: primer-budget with every mulligan line naming a card or a curve point, and a worked line that names a card. The first version held the budget and lost the specific share.",
  prompt: (m) => ({ system: `${m.system}\n${PRIMER_BUDGET_RULES_B}`, user: m.user }),
};

/**
 * Round 3c (v2 of the patch). primer-budget-b's worked lines taught number words: "two-drop" and
 * "three-drop" read as 2 and 3 to the figures rule, so 22 of 184 held-out mulligan lines named a
 * figure the deck lacks and contract A dropped them unseen (0 of 180 under v6). The synopsis lane's
 * pre-open pass on #934 found it. So the worked lines carry no number at all, the rule restores the
 * app's "a line of play" rather than narrowing it, and the one length target is the app's own,
 * read from `CHAR_BUDGETS` as the system message already states it.
 *
 * Shipped as the app's own prompt in #934 (contract 7), so from then on `base` IS this text, and
 * these three budget variants add a second copy on top of it. They are kept to reproduce the
 * contract v6 measurements in the report, which were taken before it shipped.
 */
const PRIMER_BUDGET_RULES_C = [
  `Mulligan lines are the tightest budget in the answer: at most ${CHAR_BUDGETS.mulligan} characters as rendered, and aim for about ${CHAR_BUDGETS.mulligan - 25}. Write 8 to 12 words.`,
  "Every mulligan line names one card from the decklist, as [[Name]], a point on the curve, or a line of play, never a list of cards. Any number in it still has to be one of the mulligan figures.",
  "The land range the app shows above the Mulligan is not one of your lines and does not count toward any line's length.",
  'Two lines sized to the budget: "[[Sol Ring]] with nothing to cast after it stalls out." (50), and "Early ramp backed by a way to draw more cards." (46).',
].join("\n");

SYNOPSIS_VARIANTS["primer-budget-c"] = {
  id: "primer-budget-c",
  reason: "Round 3c on v6: primer-budget-b with number-free worked lines, the app's own length target, and 'a line of play' allowed. b's worked lines taught number words the figures rule drops.",
  prompt: (m) => ({ system: `${m.system}\n${PRIMER_BUDGET_RULES_C}`, user: m.user }),
};
