import type { deckTuningCopy } from "../copy/deck-tuning";
import { mentionsDate } from "./note-date";
import { escapeRegExp } from "./quote-match";

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
 *
 * A dated source (a game note) stays on the WHOLE path only — it is never partially matched,
 * because a game note's own quote must remain verbatim (round-1 review finding). Only an
 * UNDATED source (the intent, or this run's notes) may be cited in part.
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

  type Range = { start: number; end: number };

  // Every WHOLE-quotation occurrence of a known source, found by literal substring search (so a
  // source containing an embedded quote mark of its own, `I said "keep lands"`, is found intact
  // rather than split at its inner quote mark) — tried in all FOUR opener/closer combinations,
  // since the model may mix straight and curly quotes on the same line (round-1 review finding:
  // a same-style-only check let a mixed-style fabrication through completely undetected, never
  // flagged and never repaired). Tracked by RANGE, not by a global text replace: a literal span
  // repeated elsewhere in the text — once inside a validated whole quotation, once as a
  // separately quoted fragment — must never be conflated (round-1 review finding: a blind
  // `.split().join()` corrupted the inner text of an already-verbatim whole quotation when the
  // same words also appeared quoted again, standalone, later in the same rationale).
  const wholeRanges: Range[] = [];
  for (const q of quotable) {
    const forms = [`"${q.text}"`, `“${q.text}”`, `"${q.text}”`, `“${q.text}"`];
    for (const quoted of forms) {
      let from = 0;
      let idx: number;
      while ((idx = text.indexOf(quoted, from)) !== -1) {
        from = idx + quoted.length;
        const sourced = quotable.some((s) => s.text === q.text && (s.date === null || mentionsDate(text, s.date)));
        if (!sourced) {
          broken.push("quotedNote");
          return { broken, text };
        }
        wholeRanges.push({ start: idx, end: idx + quoted.length });
      }
    }
  }
  const insideWhole = (i: number) => wholeRanges.some((r) => i >= r.start && i < r.end);

  // Every quoted SPAN in `text` not already covered by a whole match above — straight, curly,
  // or mixed, for the same reason as above.
  const spanPattern = /"([^"“”]+)"|“([^"“”]+)”|"([^"“”]+)”|“([^"“”]+)"/g;
  const spans: (Range & { span: string })[] = [];
  for (const m of text.matchAll(spanPattern)) {
    const start = m.index;
    if (insideWhole(start)) continue;
    const span = (m[1] ?? m[2] ?? m[3] ?? m[4]).trim();
    if (span.length === 0) continue;
    spans.push({ start, end: start + m[0].length, span });
  }

  // A span is a genuine PART of an UNDATED source when it is found, as whole words, INSIDE that
  // source — never the reverse: a span merely containing a short real fragment plus fabricated
  // extra words (round-1 review finding: "go wide with dragons" against the intent "go wide"
  // would otherwise pass, since the span contains the source rather than the source containing
  // the span). A span naming no source at all, whole or part, is a misquote.
  const partial: (Range & { span: string })[] = [];
  for (const span of spans) {
    const isPart = quotable.some((q) => q.date === null && isGenuinePart(span.span, q.text));
    if (isPart) partial.push(span);
    else {
      broken.push("quotedNote");
      return { broken, text };
    }
  }

  // Read with the player's own quoted words taken out — whole quotations AND verified partial
  // ones alike, since both belong to the player, not the model's claim, even while still
  // wrapped in quote marks (round-1 review finding: only whole matches were masked here, so a
  // verified partial quote containing a claim word like "stronger" still tripped
  // `noResultClaim`, dropping a suggestion the citation check would have accepted).
  let ownWords = text;
  for (const r of [...wholeRanges, ...partial].sort((a, b) => b.start - a.start)) {
    ownWords = ownWords.slice(0, r.start) + " " + ownWords.slice(r.end);
  }
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

  // Every verified partial quote is repaired to its bare, unquoted form — Design's own shape
  // for a part-quote — by RANGE, working from the LAST match backward so an earlier match's
  // offsets stay valid as later ones are spliced out, never by a global string replace (the
  // corruption finding above).
  let repaired = text;
  for (const r of [...partial].sort((a, b) => b.start - a.start)) {
    repaired = repaired.slice(0, r.start) + r.span + repaired.slice(r.end);
  }

  return { broken, text: repaired };
}

/** Whether `span` is found, as whole words, inside `source` — the direction a genuine
 *  part-quote must satisfy; the reverse (a span that merely contains the source, plus
 *  anything else) is not the same claim and must never pass here. */
function isGenuinePart(span: string, source: string): boolean {
  if (!/[A-Za-z]{2,}/.test(span)) return false;
  return new RegExp(`(?<![\\w'])${escapeRegExp(span)}(?![\\w'])`).test(source);
}
