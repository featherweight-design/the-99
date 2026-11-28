// The copy editor's edits: what an admin has changed in this browser and not yet submitted, the variations a line
// edits together, and the rule check an edit must pass. The rules are the copy sheet's own (`problems()`), never a
// second set: the same function the import runs on the server.
import { fillsOf, problems, wordCap, wordCount } from "../../../scripts/lib/copy-sheet/validate.mts";
import type { EditorRow } from "./rows";

export { EDITS_STORAGE_KEY, readEdits, writeEdits, type Edit } from "./edits-store";

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
  // `problems` reads only `key`, `placeholders`, `fills` and `readOnly`; the source span fields belong to the build step.
  return { problems: problems(row as unknown as Parameters<typeof problems>[0], next), words: wordCount(next), cap: wordCap(row.key).cap };
}

/** An edit is worth keeping only when it says something other than today's words. */
export const changed = (row: EditorRow, to: string) => to !== row.text;

/** The line's own fill-ins its text uses, each once, in the order they appear: one note line each. A name the line does not supply gets none (its refusal says why). */
export function usedFills(row: EditorRow, text: string): string[] {
  const fills = new Set(fillsOf(row));
  return [...new Set([...text.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]))].filter((f) => fills.has(f));
}

/** The fill-ins this line may use that the text does not, in the order the line offers them: what an insert control lists. */
export function unusedFills(row: EditorRow, text: string): string[] {
  const used = new Set([...text.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]));
  return fillsOf(row).filter((f) => !used.has(f));
}
