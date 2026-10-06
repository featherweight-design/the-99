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

type Range = { start: number; end: number };

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
 * because a game note's own quote must remain verbatim. EVERY check below — percentage, net,
 * denominator, bracket, result — runs on the REPAIRED text, since that is what the player
 * actually sees; a check against the original, still-quoted text could pass or fail on
 * characters a reader never sees at all.
 */
export function presentationFailures(
  text: string,
  quotable: readonly Quotable[],
): { broken: RuleKey[]; text: string } {
  const broken: RuleKey[] = [];

  // Every literal occurrence of every quotable's own full text, wrapped in any of the FOUR
  // opener/closer combinations (straight/curly, mixed either way — a same-style-only check let
  // a mixed-style fabrication through completely undetected). A candidate FULLY CONTAINED
  // inside another candidate's range is never checked on its own: one quotable's text can
  // coincidentally sit inside another's (`"keep lands"` inside `"I said \"keep lands\""`), and
  // that inner occurrence is not a quotation in its own right — only the MAXIMAL (outermost)
  // candidates are real whole quotations, each of which must still be sourced (a dated note's
  // date must be in the same text). Occurrences IDENTICAL in range (two undated sources sharing
  // the same words) are deduplicated. Two maximal candidates that OVERLAP without either
  // containing the other (both sources' literal text happening to overlap character-for-character
  // — pathological, but possible if a source itself contains a quote character) are rejected
  // outright rather than merged or resolved: a merged span would claim support no single source
  // actually supplied, and rejecting is the only answer that never persists corrupted text.
  type Candidate = Range & { sourced: boolean };
  const candidates: Candidate[] = [];
  for (const q of quotable) {
    const forms = [`"${q.text}"`, `“${q.text}”`, `"${q.text}”`, `“${q.text}"`];
    for (const quoted of forms) {
      let from = 0;
      let idx: number;
      while ((idx = text.indexOf(quoted, from)) !== -1) {
        from = idx + quoted.length;
        const sourced = quotable.some((s) => s.text === q.text && (s.date === null || mentionsDate(text, s.date)));
        candidates.push({ start: idx, end: idx + quoted.length, sourced });
      }
    }
  }
  const strictlyContains = (a: Range, b: Range) => a.start <= b.start && a.end >= b.end && (a.start < b.start || a.end > b.end);
  const maximal = candidates.filter((c) => !candidates.some((o) => strictlyContains(o, c)));
  const overlapsAmbiguously = (a: Range, b: Range) =>
    a !== b && a.start < b.end && b.start < a.end && !strictlyContains(a, b) && !strictlyContains(b, a)
    && !(a.start === b.start && a.end === b.end);
  const ambiguous = maximal.filter((c) => maximal.some((o) => overlapsAmbiguously(c, o)));
  // An ambiguous overlap is rejected outright, immediately — never silently dropped. Dropping it
  // without a verdict let the generic span scan rediscover fragments of the SAME ambiguous
  // sources on its own (each individually a coincidental word-boundary match), accept them as
  // genuine partials, and corrupt the text by unquoting all of it.
  if (ambiguous.length > 0) {
    broken.push("quotedNote");
    return { broken, text };
  }

  const wholeRanges: Range[] = [];
  const seenWhole = new Set<string>();
  for (const c of maximal) {
    if (!c.sourced) {
      broken.push("quotedNote");
      return { broken, text };
    }
    const key = `${c.start}:${c.end}`;
    if (seenWhole.has(key)) continue;
    seenWhole.add(key);
    wholeRanges.push({ start: c.start, end: c.end });
  }
  wholeRanges.sort((a, b) => a.start - b.start);

  // Every quoted SPAN, scanned only in the GAPS between whole ranges — never across or through
  // one, so a span-pairing scan can never mis-pair a delimiter that belongs to a whole
  // quotation with one from separate, later text. Within a gap, a span is the OUTERMOST pair of
  // matching delimiters: its content excludes only the SPECIFIC closing mark this pairing needs
  // (never both quote styles at once), so a genuinely nested, opposite-style quote inside it —
  // `“cut "Sol Ring"”` — is captured whole, as literal content, rather than fragmenting into
  // several smaller spans that each lose the surrounding structure.
  const spanPattern = /"([^"]+)"|“([^”]+)”|"([^”]+)”|“([^"]+)"/g;
  const gaps: Range[] = [];
  let cursor = 0;
  for (const r of wholeRanges) {
    gaps.push({ start: cursor, end: r.start });
    cursor = r.end;
  }
  gaps.push({ start: cursor, end: text.length });

  const spans: (Range & { span: string })[] = [];
  for (const gap of gaps) {
    const segment = text.slice(gap.start, gap.end);
    const matchedHere: Range[] = [];
    for (const m of segment.matchAll(spanPattern)) {
      const localStart = m.index!;
      const localEnd = localStart + m[0].length;
      matchedHere.push({ start: localStart, end: localEnd });
      const span = (m[1] ?? m[2] ?? m[3] ?? m[4]).trim();
      if (span.length === 0) continue;
      spans.push({ start: gap.start + localStart, end: gap.start + localEnd, span });
    }
    // A quote character left over in this gap, outside every matched span, is a DANGLING
    // delimiter: a fabricated wrapper whose own partner sits on the far side of a legitimate
    // whole quotation that just split this gap in two — e.g. a real "go wide" sitting inside a
    // fake "please … with dragons" wrapper. A well-formed citation never leaves one unpaired,
    // so its presence is a misquote rather than something to silently ignore.
    for (let i = 0; i < segment.length; i += 1) {
      const ch = segment[i];
      if (ch !== "\"" && ch !== "“" && ch !== "”") continue;
      if (!matchedHere.some((r) => i >= r.start && i < r.end)) {
        broken.push("quotedNote");
        return { broken, text };
      }
    }
  }

  // A span is a genuine PART of an UNDATED source when it is found, as whole words, INSIDE that
  // source — never the reverse: a span merely containing a short real fragment plus fabricated
  // extra words ("go wide with dragons" against the intent "go wide" must not pass just because
  // the span contains the source). A dated source is never eligible here — a game note's own
  // quote must stay verbatim, whole or not at all. A span naming no source, whole or part, is a
  // misquote.
  const partial: (Range & { span: string })[] = [];
  for (const span of spans) {
    const isPart = quotable.some((q) => q.date === null && isGenuinePart(span.span, q.text));
    if (isPart) partial.push(span);
    else {
      broken.push("quotedNote");
      return { broken, text };
    }
  }

  // Build the REPAIRED text and, alongside it, every masked range IN THE REPAIRED TEXT'S OWN
  // coordinates: a whole quotation is copied through unchanged (still quoted, embedded quote
  // marks and all); a verified partial quote is replaced by its own span text — its OUTER marks
  // only are gone, any embedded quote marks the span itself contained stay exactly as written.
  // Both lists are built in one left-to-right pass so a partial repair earlier in the line
  // correctly shifts the positions of everything after it.
  const masks = [
    ...wholeRanges.map((r) => ({ ...r, replacement: null as string | null })),
    ...partial.map((r) => ({ ...r, replacement: r.span as string | null })),
  ].sort((a, b) => a.start - b.start);
  let repaired = "";
  const maskedNew: Range[] = [];
  let pos = 0;
  for (const m of masks) {
    repaired += text.slice(pos, m.start);
    const replacementText = m.replacement ?? text.slice(m.start, m.end);
    const newStart = repaired.length;
    repaired += replacementText;
    maskedNew.push({ start: newStart, end: repaired.length });
    pos = m.end;
  }
  repaired += text.slice(pos);

  // Everything below runs on the REPAIRED text — what the player actually sees — never the
  // original, still-quoted one.

  // A percentage in any spelling, and the proportion a "win rate" is.
  if (/%|\bper ?cent\b|\bwin[ -]?rate\b/i.test(repaired)) broken.push("noPercentage");

  // The word, or a SIGNED integer: `+2`, `-3`, `−1`. A hyphen between words is not a sign, and
  // Magic's own counter notation (`+1/+1`, `-1/-1`, `+2/+0`) is a card's words, not a figure.
  // A sign counts after anything but a word character or another sign — so `=-2`, `(+3` and a
  // line-leading `-1` are caught, while `two-mana` and a range like `1-2` are not.
  if (/\bnet\b/i.test(repaired) || /(^|[^\w+\-−/])[+\-−]\d+(?![\d/])/.test(repaired)) broken.push("noNet");

  // A bracket/result claim is exempted only when the ENTIRE matched span is the player's own
  // words — fully inside a masked range — never when a claim merely OVERLAPS one: masking just
  // the single verified word "win" let the surrounding model words "will ... more" still form
  // the banned comparative claim undetected, because the word that made the regex match was
  // gone from the text being tested. Scanned at EVERY starting position, not only the
  // non-overlapping matches a single `matchAll` pass would find — two of this rule's own
  // alternatives can match overlapping spans ("will win" and "win more" over the same "win"),
  // and a plain global scan only ever sees whichever one starts first, silently hiding the
  // other.
  const fullyMasked = (start: number, end: number) => maskedNew.some((r) => r.start <= start && r.end >= end);
  if (hasUnmaskedMatch(repaired, BRACKET_WORD, fullyMasked) || hasUnmaskedMatch(repaired, BRACKET_NAME, fullyMasked)) {
    broken.push("noBracketClaim");
  }
  if (hasUnmaskedMatch(repaired, RESULT_CLAIM, fullyMasked)) broken.push("noResultClaim");

  // A counted noun must be preceded by `N of M`. `3 of 5 games` passes; `3 games` does not.
  // The numerator may be a word (`none of the 9 games`, `one of 11 cards`) and the denominator
  // may be possessed (`4 of your 99 cards`): each still states what it is a share of.
  // A count spelled as a word needs its denominator too: `three games` is `3 games`. `one` and
  // `none` are left out of the counted side only, where they read as "a" and "no" far more often
  // than as counts ("the one card that", "none of it").
  const counted = new RegExp(`\\b(\\d+|${COUNT_WORDS})\\s+${COUNTED}\\b`, "gi");
  for (const m of repaired.matchAll(counted)) {
    const before = repaired.slice(0, m.index);
    if (!new RegExp(`(?:\\d+|${NUMBER_WORDS})\\s+of\\s+(?:your\\s+|the\\s+)?$`, "i").test(before)) {
      broken.push("denominator");
      break;
    }
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

/** Whether `pattern` matches anywhere in `text` whose match span is NOT fully covered by
 *  `fullyMasked` — a claim entirely inside the player's own (quoted or repaired-partial) words
 *  is exempt; one that only partly overlaps is not. Checked at EVERY starting position (a
 *  sticky, position-by-position scan) rather than a single non-overlapping `matchAll` pass,
 *  since two of this rule's own alternatives can match overlapping spans of the same text and
 *  a plain scan only ever reports whichever one starts first. */
function hasUnmaskedMatch(text: string, pattern: RegExp, fullyMasked: (start: number, end: number) => boolean): boolean {
  const flags = pattern.flags.replace(/[gy]/g, "");
  const sticky = new RegExp(pattern.source, `${flags}y`);
  for (let i = 0; i < text.length; i += 1) {
    sticky.lastIndex = i;
    const m = sticky.exec(text);
    if (m && m[0].length > 0 && !fullyMasked(i, i + m[0].length)) return true;
  }
  return false;
}
