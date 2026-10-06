import type { deckTuningCopy } from "../copy/deck-tuning";
import { mentionsDate } from "./note-date";
import { quotesPlayerText } from "./quote-match";

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

/** A numerator spelled as a word. `none` is zero; the rest stop at ten, as prose does. */
export const NUMBER_WORDS = "none|one|two|three|four|five|six|seven|eight|nine|ten";
const COUNT_WORDS = "two|three|four|five|six|seven|eight|nine|ten";

/**
 * A rationale may not name a bracket (`suggestionRules.noBracketClaim`): the APP flags a swap
 * that moves the bracket, through `slotDeck`, and the model is never shown a bracket figure to be
 * right about. The word itself in any case, and the four bracket names that cannot be ordinary
 * prose, capitalized as names are. `Core` is left out: "the core of the deck" is a sentence.
 */
const BRACKET_WORD = /\bbrackets?\b/i;
const BRACKET_NAME = /\b(?:Exhibition|Upgraded|Optimized|cEDH)\b/;

/**
 * Nor promise a result (`suggestionRules.noResultClaim`). The list is written down rather than
 * inferred, and deliberately narrow: a PREDICTION about games — a swap that "will win" or "would
 * lose" — and the comparative claims "win more", "lose less" and "stronger". A record already
 * logged ("won 1 of 5") is evidence, not a promise, and passes; so does ordinary prose about how
 * the deck plays ("a second way to win", "hard to beat"), which predicts nothing.
 */
const RESULT_CLAIM = /\b(?:will|would|should|could)\s+(?:win|lose|beat)\b|\b(?:win|wins|winning)\s+more\b|\blose\s+less\b|\bstronger\b/i;

/**
 * Something the player wrote that a suggestion may quote. A NOTE carries the date of its game,
 * and `suggestionRules.quotedNote` requires the date beside any quotation of it; the intent has
 * none.
 */
export type Quotable = { text: string; date: string | null };

/**
 * `quotable` is everything the player wrote: their game notes and their stated intent (and, for
 * a tuning run, this run's own notes). A quotation naming none of them, whole or in word-boundary
 * part, is a misquote, and a quoted note whose date is not in the same text breaks the rule too.
 *
 * Returns the REPAIRED text alongside the broken rules: a genuine part-quote wrapped in
 * quotation marks (the prompt allows citing "whole or a part" of the intent or this run's
 * notes — `tuning/prompt.ts`) is not a misquote, but Design's own format for a part is
 * UNQUOTED, never in quote marks (`suggestionRules.quotedNote`'s pinned tests). So a genuine
 * part found in quote marks is stripped to its bare form here rather than dropped; only a quote
 * that names no source at all — whole or part — is still flagged.
 */
export function presentationFailures(
  text: string,
  quotable: readonly Quotable[],
): { broken: RuleKey[]; text: string } {
  const broken: RuleKey[] = [];

  // A percentage in any spelling, and the proportion a "win rate" is.
  if (/%|\bper ?cent\b|\bwin[ -]?rate\b/i.test(text)) broken.push("noPercentage");

  // The word, or a SIGNED integer: `+2`, `-3`, `−1`. A hyphen between words is not a sign, and
  // Magic's own counter notation (`+1/+1`, `-1/-1`, `+2/+0`) is a card's words, not a figure.
  // A sign counts after anything but a word character or another sign — so `=-2`, `(+3` and a
  // line-leading `-1` are caught, while `two-mana` and a range like `1-2` are not.
  if (/\bnet\b/i.test(text) || /(^|[^\w+\-−/])[+\-−]\d+(?![\d/])/.test(text)) broken.push("noNet");

  // Read with the player's own quoted words taken out: an intent reading "I want to win late",
  // quoted back, is theirs and no claim of the model's.
  const ownWords = quotable.reduce(
    (t, q) => t.split(`"${q.text}"`).join(" ").split(`\u201c${q.text}\u201d`).join(" "),
    text,
  );
  if (BRACKET_WORD.test(ownWords) || BRACKET_NAME.test(ownWords)) broken.push("noBracketClaim");
  if (RESULT_CLAIM.test(ownWords)) broken.push("noResultClaim");

  // A counted noun must be preceded by `N of M`. `3 of 5 games` passes; `3 games` does not.
  // The numerator may be a word (`none of the 9 games`, `one of 11 cards`) and the denominator
  // may be possessed (`4 of your 99 cards`): each still states what it is a share of.
  // A count spelled as a word needs its denominator too: `three games` is `3 games`. `one` and
  // `none` are left out of the counted side only, where they read as "a" and "no" far more often
  // than as counts ("the one card that", "none of it").
  const counted = new RegExp(`\\b(\\d+|${COUNT_WORDS})\\s+${COUNTED}\\b`, "gi");
  for (const m of text.matchAll(counted)) {
    const before = text.slice(0, m.index);
    if (!new RegExp(`(?:\\d+|${NUMBER_WORDS})\\s+of\\s+(?:your\\s+|the\\s+)?$`, "i").test(before)) {
      broken.push("denominator");
      break;
    }
  }

  // Anything in quotation marks is a quotation of the player (a note, or their stated intent)
  // and must match one byte for byte. The KNOWN sources are matched first, whole, by their own
  // text — so a note with a quotation mark inside it (`I said "keep lands"`) is found intact
  // rather than split at its inner quote — and a quoted note must have its date in the same text.
  // Whatever is still in quotation marks once they are taken out is a misquote. Straight or
  // curly outer quotes, since the model may use either.
  // One text can have several sources — two notes alike, or a note that says what the intent
  // says — and the quotation stands when ANY of them is satisfied: the intent needs no date, a
  // note needs its own.
  let rest = text;
  for (const q of quotable) {
    for (const quoted of [`"${q.text}"`, `\u201c${q.text}\u201d`]) {
      if (!rest.includes(quoted)) continue;
      const sourced = quotable.some((s) => s.text === q.text && (s.date === null || mentionsDate(text, s.date)));
      if (!sourced) {
        broken.push("quotedNote");
        return { broken, text };
      }
      rest = rest.split(quoted).join(" ");
    }
  }
  // Whatever is still quoted after every WHOLE source is stripped may still be a genuine PART
  // of one. The content-excludes-quote-marks pattern below cannot segment a source that
  // contains an embedded quote mark of its own (the nested-note case above) \u2014 that case is
  // already handled, whole, by the literal search just above, and never reaches here.
  let repaired = text;
  const spanPattern = /"([^"\u201c\u201d]+)"|\u201c([^"\u201c\u201d]+)\u201d/g;
  for (const m of rest.matchAll(spanPattern)) {
    const span = m[1] ?? m[2];
    const partOf = quotable.find((q) => quotesPlayerText(q.text, span) && (q.date === null || mentionsDate(text, q.date)));
    if (!partOf) {
      broken.push("quotedNote");
      return { broken, text };
    }
    // Repaired to the bare, unquoted form \u2014 Design's own shape for a part-quote \u2014 rather than
    // dropped: the player's words, just not in quote marks.
    repaired = repaired.split(m[0]).join(span);
  }

  return { broken, text: repaired };
}
