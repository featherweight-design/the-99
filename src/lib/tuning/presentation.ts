import type { deckTuningCopy } from "../copy/deck-tuning";

/**
 * The text checks among the nine `suggestionRules`: the ones a string alone can fail. Pure.
 *
 * Each returns the RULE KEY it breaks, so a drop is named by the same text the model was
 * instructed with. The structural rules — `citation`, `colourIdentity`, `cutInDeck`, `onePair`,
 * `ownershipNotRanking` — are enforced by the schema and `validate.ts`, not here.
 */
export type RuleKey = keyof typeof deckTuningCopy.suggestionRules;

/** Nouns whose count needs a denominator: games, and cards. `34 lands against a target of 37`
 *  is a type line the deck holds and is left alone; `add 2 cards` is a count that must say of
 *  what — `2 of 99 cards`. */
const COUNTED = "(?:games?|times|matches|cards?)";

/**
 * Something the player wrote that a suggestion may quote. A NOTE carries the date of its game,
 * and `suggestionRules.quotedNote` requires the date beside any quotation of it; the intent has
 * none.
 */
export type Quotable = { text: string; date: string | null };

/**
 * `quotable` is everything the player wrote: their game notes and their stated intent. A
 * quotation matching none of them byte for byte is a misquote, and a quoted note whose date is
 * not in the same text breaks the rule too.
 */
export function presentationFailures(text: string, quotable: readonly Quotable[]): RuleKey[] {
  const broken: RuleKey[] = [];

  // A percentage in any spelling, and the proportion a "win rate" is.
  if (/%|\bper ?cent\b|\bwin ?rate\b/i.test(text)) broken.push("noPercentage");

  // The word, or a SIGNED integer: `+2`, `-3`, `−1`. A hyphen between words is not a sign, and
  // Magic's own counter notation (`+1/+1`, `-1/-1`, `+2/+0`) is a card's words, not a figure.
  // A sign counts after anything but a word character or another sign — so `=-2`, `(+3` and a
  // line-leading `-1` are caught, while `two-mana` and a range like `1-2` are not.
  if (/\bnet\b/i.test(text) || /(^|[^\w+\-−/])[+\-−]\d+(?![\d/])/.test(text)) broken.push("noNet");

  // A counted noun must be preceded by `N of M`. `3 of 5 games` passes; `3 games` does not.
  const counted = new RegExp(`(\\d+)\\s+${COUNTED}\\b`, "gi");
  for (const m of text.matchAll(counted)) {
    const before = text.slice(0, m.index);
    if (!/\d+\s+of\s+$/i.test(before)) {
      broken.push("denominator");
      break;
    }
  }

  // Anything in quotation marks is a quotation of the player (a note, or their stated intent)
  // and must match one byte for byte. Straight or curly quotes, since the model may use either.
  //
  // A note that itself contains a double quote can never be quoted cleanly: the pattern closes on
  // its inner quote and reads a fragment. That errs toward dropping the suggestion, never toward
  // accepting a misquote.
  for (const m of text.matchAll(/["“]([^"”]+)["”]/g)) {
    const source = quotable.find((q) => q.text === m[1]);
    if (!source || (source.date !== null && !text.includes(source.date))) {
      broken.push("quotedNote");
      break;
    }
  }

  return broken;
}
