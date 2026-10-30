import { cutAtWord } from "../../public/preview";

/**
 * A v2 line's short reason, made from its full rationale when the model's is empty or degenerate. Pure.
 *
 * The prompt v14 eval (22 first calls) had 6 replies with one line whose `rationaleShort` was "" (and a refill with "x"),
 * every other field of the line valid. The SDK sends `min(1)` only as a description hint (`zodOutputFormat` moves
 * `minLength` into `description`), so the API never enforced it, and the line parse then dropped a good card over its
 * phone summary. A line keeps its card; only the summary is rebuilt, from the rationale the line already carries.
 */

/** The field's cap (`lineSchema.rationaleShort`'s `max`). */
export const SHORT_REASON_MAX = 80;

/** Fewer than this many letters says nothing: "", " ", "x", "-", "?". */
const MIN_LETTERS = 3;

/** A clause shorter than this is a fragment ("It is cheap"), so the sentence is cut at a word instead. */
const MIN_CLAUSE = 20;

/** Whether a model's short reason is unusable: not a string, or fewer than three letters. */
export function isDegenerateShortReason(value: unknown): boolean {
  if (typeof value !== "string") return true;
  return (value.match(/\p{L}/gu) ?? []).length < MIN_LETTERS;
}

/**
 * The rationale's first sentence when it fits the cap, else its first clause (up to a comma, semicolon or colon) when that
 * is long enough to stand alone and fits, else the first sentence cut at a word with an ellipsis (`cutAtWord`, the card
 * page's description cut). Whitespace runs read as one space.
 */
export function shortReasonFrom(rationale: string): string {
  const text = rationale.replace(/\s+/g, " ").trim();
  const sentence = firstSentence(text);
  if (sentence.length <= SHORT_REASON_MAX) return closedQuotes(sentence);
  const clause = /^(.*?\S)[,;:](?=\s)/.exec(sentence)?.[1];
  if (clause && clause.length >= MIN_CLAUSE && clause.length <= SHORT_REASON_MAX) return closedQuotes(clause);
  return closedQuotes(cutAtWord(sentence, SHORT_REASON_MAX));
}

/** Titles a card name opens with ("Dr. Julius Jumblemorph", "Mr. Orfeo, the Boulder"): their stop ends no sentence. */
const ABBREVIATION = /(?:^|\s)(?:Dr|Mr|Mrs|Ms|St|Jr|Sr|vs)\.$/;

/** The text up to its first stop that closes a word (as `about/caption.ts` reads a first sentence), past a title's stop. */
function firstSentence(text: string): string {
  for (const m of text.matchAll(/\S[.?!](?=\s|$)/g)) {
    const end = m.index + m[0].length;
    if (!ABBREVIATION.test(text.slice(0, end))) return text.slice(0, end);
  }
  return text;
}

/** A cut that leaves a quote open ends before that quote instead: the line check (`presentationFailures`) drops a line
 *  with an unmatched quote mark, which would lose the card this rebuild keeps. */
function closedQuotes(cut: string): string {
  const marks = [...cut.matchAll(/["“”]/g)];
  if (marks.length % 2 === 0) return cut;
  const before = cut.slice(0, marks[marks.length - 1].index).replace(/[\s,;:(\-–]+$/, "");
  return before.length > 0 ? `${before}…` : cut;
}

/**
 * A raw streamed line with its short reason rebuilt when it is degenerate and the line has a rationale to build it from.
 * Anything else is returned as it came, so the line schema judges it exactly as before (a bad rationale still fails).
 */
export function withShortReason(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
  const line = raw as Record<string, unknown>;
  if (!isDegenerateShortReason(line.rationaleShort)) return raw;
  if (typeof line.rationale !== "string" || line.rationale.trim() === "") return raw;
  const rebuilt = shortReasonFrom(line.rationale);
  // A rationale too thin to summarize ("It.") rebuilds nothing usable: the line is judged as it came.
  if (isDegenerateShortReason(rebuilt)) return raw;
  return { ...line, rationaleShort: rebuilt };
}
