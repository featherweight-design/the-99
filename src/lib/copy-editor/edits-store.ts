// The copy editor's edits as the browser keeps them: light enough for the door to read before the overlay loads.
// `edits.ts` re-exports these and adds the validator the editor needs.

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
