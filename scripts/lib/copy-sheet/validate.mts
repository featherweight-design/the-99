// The mechanical half of /copy-review, run on every changed row of the sheet. Only rules a machine can decide live here
// (the em-dash and US-spelling rules, length caps where the key's own name says what the string is, and the
// fill-ins); voice and vocabulary stay with the reviewer, who reads the PR body's old -> new list before merge.
import type { CopyRow } from "./walk.mjs";

/** British spellings the app does not use. A short list on purpose: a long one flags legitimate words. */
const BRITISH: [RegExp, string][] = [
  [/\bcolou?rs?\b(?<=colour|colours)/i, "color"],
  [/\bfavourite/i, "favorite"],
  [/\borganis/i, "organiz"],
  [/\bcentre/i, "center"],
  [/\bcancelled\b/i, "canceled"],
  [/\bgrey\b/i, "gray"],
  [/\bbehaviour/i, "behavior"],
  [/\blicence\b/i, "license"],
  [/\bcatalogue/i, "catalog"],
  [/\bminimis|\bmaximis|\brecognis|\bcustomis|\banalys(e|ed|es|ing)\b/i, "the -ize / -yze spelling"],
];
/** A cap, in words, where the last segment of the key names the kind of string. A hole counts as one word. */
const CAPS: Record<string, number> = { label: 3, cta: 3, button: 3, chip: 3, title: 8, head: 8, eyebrow: 5 };

export const wordCount = (t: string) => t.replace(/\{[^{}]+\}/g, "x").trim().split(/\s+/).filter(Boolean).length;

/** The fill-ins a new text may use; a row built before `fills` existed offers only its own placeholders. */
export const fillsOf = (row: Pick<CopyRow, "placeholders"> & { fills?: readonly string[] }): readonly string[] => row.fills ?? row.placeholders;

/** The word cap the key's own name sets (its last path segment, `#t<n>` aside), or undefined when it sets none. */
export function wordCap(key: string): { seg: string; cap: number | undefined } {
  const seg = key.split("#")[1]?.split(/[.\[#]/).filter(Boolean).filter((s) => !/^t\d+$/.test(s)).pop() ?? "";
  return { seg, cap: CAPS[seg] };
}

/** Why a new text cannot replace the row's, or [] when it can. */
export function problems(row: CopyRow, next: string): string[] {
  const out: string[] = [];
  if (row.readOnly) return [`this row is read-only (${row.readOnly})`];
  if (next === "") out.push("no text (a line cannot be emptied)");
  if (/[\r\n]/.test(next)) out.push("a line break in the text");
  if (next !== next.trim()) out.push("leading or trailing space");
  // Any fill-in the line's code passes may be used, moved, repeated or dropped; a name it does not pass is refused, which is
  // also how an edit made under a name since renamed is refused.
  const fills = fillsOf(row);
  const unknown = [...new Set([...next.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]).filter((h) => !fills.includes(h)))];
  if (unknown.length) out.push(`${unknown.map((h) => `{${h}}`).join(" ")} ${unknown.length === 1 ? "is not a fill-in" : "are not fill-ins"} this line has (${fills.length ? fills.map((p) => `{${p}}`).join(" ") : "it has none"})`);
  if (/[{}]/.test(next.replace(/\{[^{}]*\}/g, ""))) out.push("a brace that is not part of a fill-in");
  if (next.includes("—") && next !== "—") out.push("an em dash (use a period, comma or colon)");
  if (/!/.test(next)) out.push("an exclamation mark in system copy");
  for (const [re, us] of BRITISH) if (re.test(next)) out.push(`British spelling (US: ${us})`);
  const { seg, cap } = wordCap(row.key);
  if (cap !== undefined && wordCount(next) > cap) out.push(`${wordCount(next)} words in a "${seg}" (cap ${cap})`);
  return out;
}
