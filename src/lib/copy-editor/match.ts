// Finds the copy rows a piece of visible text could be. Pure: the overlay hands it an element's text and the rows from
// `/api/copy-edit/rows`, and gets the keys back. Text with no match is not copy the editor knows (data such as a card or
// theme name) and is left alone, never outlined.
import type { EditorRow } from "./rows";

export type Match = { row: EditorRow; how: "exact" | "pattern" };

/** A pattern needs this many fixed LETTERS, or `{n}` and `{name}` would match every line on the page. */
const MIN_LITERAL = 3;

/** Longer text is matched exactly only: a pattern with several holes backtracks badly on a long line it does not fit. */
const MAX_PATTERN_TEXT = 240;

const squash = (s: string) => s.replace(/\s+/g, " ").trim();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type Pattern = { row: EditorRow; re: RegExp; literal: number };

export type RowIndex = { exact: Map<string, EditorRow[]>; patterns: Pattern[] };

export function indexRows(rows: readonly EditorRow[]): RowIndex {
  const exact = new Map<string, EditorRow[]>();
  const patterns: Pattern[] = [];
  for (const row of rows) {
    const text = squash(row.text);
    if (!text) continue;
    if (!/\{[^{}]+\}/.test(text)) {
      exact.set(text, [...(exact.get(text) ?? []), row]);
      continue;
    }
    // Letters, not characters: fixed text of only punctuation and spaces (". ", " · ", " of ") carries no words, so its pattern would fit almost any line.
    const literal = (text.replace(/\{[^{}]+\}/g, "").match(/\p{L}/gu) ?? []).length;
    if (literal < MIN_LITERAL) continue;
    const source = text.split(/\{[^{}]+\}/).map(escape).join("(.+?)");
    patterns.push({ row, re: new RegExp(`^${source}$`), literal });
  }
  return { exact, patterns };
}

/**
 * Every row the text can be: the rows with these exact words, then the templates they fit. Among patterns only the ones with the most fixed text
 * survive, so "Last active {ago}" beats "{who} {what}". More than one result is the which-key question: the same words
 * live under two keys (the editor asks which one this is).
 */
export function matchText(index: RowIndex, visible: string): Match[] {
  const text = squash(visible);
  if (!text) return [];
  const exact = (index.exact.get(text) ?? []).map((row) => ({ row, how: "exact" as const }));
  if (text.length > MAX_PATTERN_TEXT) return exact;
  const hits = index.patterns.filter((p) => p.re.test(text));
  const best = Math.max(0, ...hits.map((p) => p.literal));
  return [...exact, ...hits.filter((p) => p.literal === best).map((p) => ({ row: p.row, how: "pattern" as const }))];
}
