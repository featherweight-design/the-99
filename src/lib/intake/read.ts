import { z } from "zod";

import { oneLine } from "../tuning/prompt";
import { phraseKey, type Chip, type PhraseIndex } from "./match";

/**
 * The deeper look (brief §2 ruling 3, §6; handoff §3): one model read of everything the player
 * wrote, turned into answer chips from vocabularies the app already holds. Pure: the prompt, the
 * reply's shape, and the validator that decides what of the reply counts. The run store and the
 * call live beside it.
 *
 * THE MODEL NEVER NAMES A COMMANDER (brief §1). It maps the player's words onto theme labels, card
 * names, a budget and a bracket, and nothing it returns is trusted:
 *  - a theme counts only when it is one of the offered labels (or a singular of one);
 *  - a card counts only when it resolves in the catalog, as the free match resolves a typed name;
 *  - a budget must be whole dollars of at least $1, and a bracket 1 to 5.
 * All of it goes through the free match's own phrase index, so a chip from the deeper look is the
 * same chip the player would have got by typing the label.
 *
 * CONTROL BEATS WORDS (plan decision 2): a budget or bracket the reply reads that disagrees with a
 * control the player set goes under Not used, never over the control.
 *
 * A READ WITH NOTHING VALID IS REFUNDED (F4): `validateRead` reports whether any chip survived, and
 * the run store settles on that, BEFORE it settles the unit.
 */

export const READ_MAX_THEMES = 6;
export const READ_MAX_CARDS = 3;

export const readResponseSchema = z.object({
  themes: z.array(z.string().min(1).max(80)).max(READ_MAX_THEMES),
  cards: z.array(z.string().min(1).max(200)).max(READ_MAX_CARDS),
  budgetDollars: z.number().int().nullable(),
  bracket: z.number().int().nullable(),
  /** The player's phrases the read could not map onto anything, verbatim. */
  notUnderstood: z.array(z.string().min(1).max(120)).max(10),
});
export type ReadResponse = z.infer<typeof readResponseSchema>;

const SYSTEM = [
  "You read what a Magic: The Gathering Commander player wrote about the deck they want, and map it onto a fixed vocabulary so the app can search for commanders.",
  "Never suggest a commander, and never add anything the player did not write or clearly describe. You are reading their words, not recommending.",
  "themes: labels copied exactly from the theme list you are given, for every theme the words describe, including ones described without the label's own word (\"big dumb lizards\" is Dinosaurs). At most six.",
  "cards: the exact printed names of cards the player names or unmistakably describes. At most three. A card you are not sure of does not go here.",
  "budgetDollars: the most they want to spend on cards they do not own, in whole US dollars, or null if they gave none.",
  "bracket: a Commander bracket from 1 to 5 if they stated one or described one plainly (\"casual, no combos\" is not a number and stays null unless they name a bracket), otherwise null.",
  "notUnderstood: short phrases from their words, copied verbatim, that you could not map onto any of the above.",
  "Words that only talk about the deck (\"I want a deck\", \"something fun\") are neither mapped nor listed.",
].join("\n");

export function buildReadPrompt(words: string, themeLabels: readonly string[]): { system: string; user: string } {
  return {
    system: SYSTEM,
    // The player's words last and unwrapped, as one line, so no delimiter can be closed by them.
    user: [
      "Theme list (copy labels exactly):",
      themeLabels.join(" | "),
      "",
      `The player's words, verbatim after the colon: ${oneLine(words)}`,
    ].join("\n"),
  };
}

/** Whether `phrase` is a run of the player's own words, compared in the free match's one form. */
function wrote(words: string, phrase: string): boolean {
  const key = phraseKey(phrase);
  return key.length > 0 && ` ${phraseKey(words)} `.includes(` ${key} `);
}

export type ReadResult = {
  /** The chips that survived, each marked as the deeper look's. */
  chips: Chip[];
  /** Figures the reply read that a set control overrode, as the player would see them. */
  notUsed: string[];
  notUnderstood: string[];
  /** False when no chip survived: the read is refunded (F4). */
  useful: boolean;
};

export function validateRead(args: {
  reply: ReadResponse;
  /** The player's words, which every Not understood phrase must come from. */
  words: string;
  index: PhraseIndex;
  /** What the player set with the controls, which beats anything read from words. */
  controls: { budgetDollars: number | null; bracket: number | null };
}): ReadResult {
  const { reply, index, controls, words } = args;
  const chips: Chip[] = [];
  const notUsed: string[] = [];
  const has = (c: Chip) => chips.some((x) => JSON.stringify(x) === JSON.stringify(c));
  const push = (c: Chip) => { if (!has(c)) chips.push(c); };

  const resolve = (text: string, kind: "theme" | "card") =>
    (index.targets.get(phraseKey(text)) ?? []).find((t) => t.kind === kind) ?? null;

  for (const label of reply.themes) {
    const t = resolve(label, "theme");
    if (t && t.kind === "theme") push({ kind: "theme", slug: t.slug, label: t.label });
  }
  for (const name of reply.cards) {
    const t = resolve(name, "card");
    if (t && t.kind === "card") push({ kind: "card", oracleId: t.oracleId, name: t.name });
  }

  const budget = reply.budgetDollars;
  if (budget !== null && Number.isInteger(budget) && budget >= 1) {
    if (controls.budgetDollars !== null && controls.budgetDollars !== budget) notUsed.push(`$${budget}`);
    else if (controls.budgetDollars === null) push({ kind: "budget", dollars: budget });
  }
  const bracket = reply.bracket;
  if (bracket !== null && Number.isInteger(bracket) && bracket >= 1 && bracket <= 5) {
    if (controls.bracket !== null && controls.bracket !== bracket) notUsed.push(`bracket ${bracket}`);
    else if (controls.bracket === null) push({ kind: "bracket", bracket: bracket as 1 | 2 | 3 | 4 | 5 });
  }

  return {
    chips,
    notUsed,
    // Only phrases the player wrote, since the prompt asks for them verbatim and nothing the model
    // adds may be shown as the player's own words; and never one the vocabulary maps, which is a
    // chip rather than something not understood.
    notUnderstood: [...new Set(reply.notUnderstood.map((p) => oneLine(p).trim()).filter((p) =>
      p.length > 0 && wrote(words, p) && !index.targets.has(phraseKey(p))))],
    useful: chips.length > 0,
  };
}
