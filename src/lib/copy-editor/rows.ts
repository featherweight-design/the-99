// The copy editor's row list: what the overlay needs of each row `pnpm copy:sheet` would export, without the source
// positions. Built before the app builds (`scripts/copy-editor-rows.mts` writes `.generated/copy-rows.json`), never at
// request time, so the TypeScript compiler stays out of the route's trace.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type EditorRowKind = "text" | "branch" | "edit in code";

export type EditorRow = {
  /** `src/lib/copy/<file>#path.to.leaf`. */
  key: string;
  kind: EditorRowKind;
  /** Today's text, fill-ins written `{name}`. */
  text: string;
  placeholders: string[];
  /** The condition that selects a branch, or the call that makes a row read-only. */
  context: string;
  /** Empty when editable; otherwise why the row cannot be edited here. */
  readOnly: string;
};

export const ROWS_FILE = ".generated/copy-rows.json";

const memo = new Map<string, EditorRow[]>();

/** The generated rows, or null when the build step has not run. Read once per server instance, and on every call in development, where the copy files change under a running server. */
export async function readEditorRows(root: string = process.cwd()): Promise<EditorRow[] | null> {
  const cached = memo.get(root);
  if (cached) return cached;
  try {
    const parsed: unknown = JSON.parse(await readFile(join(root, ROWS_FILE), "utf8"));
    if (!Array.isArray(parsed)) return null;
    const rows = parsed as EditorRow[];
    if (process.env.NODE_ENV === "production") memo.set(root, rows);
    return rows;
  } catch {
    return null;
  }
}
