// The mechanical half of /copy-review, run on every changed row of the sheet. Only rules a machine can decide live here
// (the em-dash, tell and US-spelling rules, length caps where the key's own name says what the string is, and the
// placeholders); voice and vocabulary stay with the reviewer, who reads the PR body's old -> new list before merge.
import type { CopyRow } from "./walk.mjs";

const BANNED = /\b(simply|just|easily|seamlessly|effortlessly)\b/i;
const TELLS = [/whether you['’]re\b/i, /it['’]s not just\b.*,\s*it['’]s\b/i];
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

const sorted = (a: readonly string[]) => [...a].sort().join("\u0000");

/** The word cap the key's own name sets (its last path segment, `#t<n>` aside), or undefined when it sets none. */
export function wordCap(key: string): { seg: string; cap: number | undefined } {
  const seg = key.split("#")[1]?.split(/[.\[#]/).filter(Boolean).filter((s) => !/^t\d+$/.test(s)).pop() ?? "";
  return { seg, cap: CAPS[seg] };
}

/** Why a new text cannot replace the row's, or [] when it can. */
export function problems(row: CopyRow, next: string): string[] {
  const out: string[] = [];
  if (row.readOnly) return [`this row is read-only (${row.readOnly})`];
  if (/[\r\n]/.test(next)) out.push("a line break in the text");
  if (next !== next.trim()) out.push("leading or trailing space");
  const holes = [...next.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]);
  if (sorted(holes) !== sorted(row.placeholders)) out.push(`placeholders must be exactly ${row.placeholders.length ? row.placeholders.map((p) => `{${p}}`).join(" ") : "none"}, found ${holes.length ? holes.map((p) => `{${p}}`).join(" ") : "none"}`);
  if (row.placeholders.length === 0 && /[{}]/.test(next)) out.push("braces in text that has no placeholders");
  if (next.includes("—") && next !== "—") out.push("an em dash (use a period, comma or colon)");
  if (/!/.test(next)) out.push("an exclamation mark in system copy");
  const banned = next.match(BANNED);
  if (banned) out.push(`the word "${banned[0]}"`);
  for (const re of TELLS) if (re.test(next)) out.push("a stock phrase the copy rules ban");
  for (const [re, us] of BRITISH) if (re.test(next)) out.push(`British spelling (US: ${us})`);
  const { seg, cap } = wordCap(row.key);
  if (cap !== undefined && wordCount(next) > cap) out.push(`${wordCount(next)} words in a "${seg}" (cap ${cap})`);
  return out;
}
