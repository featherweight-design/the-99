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

export function applySynopsisVariant(variant: SynopsisVariant, facts: SynopsisFacts, build: (f: SynopsisFacts) => Messages) {
  const shown = variant.facts ? variant.facts(facts) : facts;
  const built = build(shown);
  return { facts: shown, messages: variant.prompt ? variant.prompt(built, shown) : built };
}
