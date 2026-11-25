// The copy editor's edits: what an admin has changed in this browser and not yet submitted, the variations a line
// edits together, and the rule check an edit must pass. The rules are the copy sheet's own (`problems()`), never a
// second set: the same function the import runs on the server.
import { problems, wordCap, wordCount } from "../../../scripts/lib/copy-sheet/validate.mts";
import type { EditorRow } from "./rows";

/** One edit: the row, the text it was made against (the stale check compares it with main), and the new text. */
export type Edit = { key: string; from: string; to: string };

export const EDITS_STORAGE_KEY = "the99.copyEdits";

/** The edits kept in this browser (Q2: across pages and reloads, until submitted or cleared). Never throws. */
export function readEdits(): Edit[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(EDITS_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is Edit => !!e && typeof e.key === "string" && typeof e.from === "string" && typeof e.to === "string");
  } catch {
    return [];
  }
}

export function writeEdits(edits: readonly Edit[]): void {
  try {
    window.localStorage.setItem(EDITS_STORAGE_KEY, JSON.stringify(edits));
  } catch {
    // Storage blocked or full: the edits live for this page only.
  }
}

/** A function leaf holding several texts has `#t<n>` appended to its key; those rows are one line's variations. */
export const baseKey = (key: string) => key.replace(/#t\d+$/, "");

/** The rows an editor edits together with this one: its variations in source order, or just itself. */
export function variationsOf(rows: readonly EditorRow[], row: EditorRow): EditorRow[] {
  if (row.kind !== "branch") return [row];
  const base = baseKey(row.key);
  const all = rows.filter((r) => r.kind === "branch" && baseKey(r.key) === base);
  return all.length > 1 ? all : [row];
}

/**
 * What a variation is for, from the condition the export records ("(n) when n === 1"): "When n is 1", "Otherwise" for a
 * negation, "When <condition>" for any other, and "Variation <i>" when the export recorded none.
 */
export function variationLabel(context: string, index: number, when: (cond: string) => string, otherwise: string, fallback: (i: number) => string): string {
  const cond = /\bwhen (.+)$/.exec(context.split(" | ")[0])?.[1]?.trim();
  if (!cond) return fallback(index + 1);
  if (/^not \(.+\)$/.test(cond)) return otherwise;
  return when(cond.replace(/\s*===\s*/g, " is "));
}

export type Check = { problems: string[]; words: number; cap: number | undefined };

/** The copy sheet's refusals for a new text, and its word count with fill-ins counted as one. */
export function check(row: EditorRow, next: string): Check {
  // `problems` reads only `key`, `placeholders` and `readOnly`; the source span fields belong to the build step.
  return { problems: problems(row as unknown as Parameters<typeof problems>[0], next), words: wordCount(next), cap: wordCap(row.key).cap };
}

/** An edit is worth keeping only when it says something other than today's words. */
export const changed = (row: EditorRow, to: string) => to !== row.text;
