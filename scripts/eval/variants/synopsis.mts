import type { SynopsisFacts } from "../../../src/lib/synopsis/facts";

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

export function applySynopsisVariant(variant: SynopsisVariant, facts: SynopsisFacts, build: (f: SynopsisFacts) => Messages) {
  const shown = variant.facts ? variant.facts(facts) : facts;
  const built = build(shown);
  return { facts: shown, messages: variant.prompt ? variant.prompt(built, shown) : built };
}
