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
  // The stop must close a word, as `about/caption.ts` reads a first sentence.
  const sentence = /^.*?\S[.?!](?=\s|$)/.exec(text)?.[0] ?? text;
  if (sentence.length <= SHORT_REASON_MAX) return sentence;
  const clause = /^(.*?\S)[,;:](?=\s)/.exec(sentence)?.[1];
  if (clause && clause.length >= MIN_CLAUSE && clause.length <= SHORT_REASON_MAX) return clause;
  return cutAtWord(sentence, SHORT_REASON_MAX);
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
  return { ...line, rationaleShort: shortReasonFrom(line.rationale) };
}
