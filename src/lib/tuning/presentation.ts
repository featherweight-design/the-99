import type { deckTuningCopy } from "../copy/deck-tuning";

/**
 * The text checks among the nine `suggestionRules`: the ones a string alone can fail. Pure.
 *
 * Each returns the RULE KEY it breaks, so a drop is named by the same text the model was
 * instructed with. The structural rules — `citation`, `colourIdentity`, `cutInDeck`, `onePair`,
 * `ownershipNotRanking` — are enforced by the schema and `validate.ts`, not here.
 */
export type RuleKey = keyof typeof deckTuningCopy.suggestionRules;

/** Nouns that count GAMES — the figures that need a denominator. `4 lands` in a decklist claim
 *  is a count of cards the deck holds and needs none. */
const COUNTED = "(?:games?|times|matches)";

export function presentationFailures(text: string, notes: readonly string[]): RuleKey[] {
  const broken: RuleKey[] = [];

  // A percentage in any spelling, and the proportion a "win rate" is.
  if (/%|\bper ?cent\b|\bwin ?rate\b/i.test(text)) broken.push("noPercentage");

  // The word, or a SIGNED integer: `+2`, `-3`, `−1`. A hyphen between words is not a sign.
  if (/\bnet\b/i.test(text) || /(^|[\s(:])[+\-−]\d/.test(text)) broken.push("noNet");

  // A counted noun must be preceded by `N of M`. `3 of 5 games` passes; `3 games` does not.
  const counted = new RegExp(`(\\d+)\\s+${COUNTED}\\b`, "gi");
  for (const m of text.matchAll(counted)) {
    const before = text.slice(0, m.index);
    if (!/\d+\s+of\s+$/i.test(before)) {
      broken.push("denominator");
      break;
    }
  }

  // Anything in quotation marks is a quotation of the player, and must be one of their notes
  // byte for byte. Straight or curly quotes, since the model may use either.
  for (const m of text.matchAll(/["“]([^"”]+)["”]/g)) {
    if (!notes.includes(m[1])) {
      broken.push("quotedNote");
      break;
    }
  }

  return broken;
}
