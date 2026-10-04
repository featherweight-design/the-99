// The hand-picked card lists a `list:<name>` labels scope reads (`src/lib/labels/scope.ts`).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The oracle ids a `list:<name>` scope names, read from `scripts/data/label-lists/<name>.json`: an
 * array of `{ oracleId }` rows, with whatever else a reader of the file needs beside each. The name
 * was already held to lowercase words and hyphens by `parseScope`, so it cannot leave that folder.
 */
export function readLabelList(name: string, dir = resolve(import.meta.dirname, "../data/label-lists")): string[] {
  const rows: unknown = JSON.parse(readFileSync(resolve(dir, `${name}.json`), "utf8"));
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(`label list ${name} is not a non-empty array`);
  const ids = rows.map((r, i) => {
    const id = (r as { oracleId?: unknown } | null)?.oracleId;
    if (typeof id !== "string" || !UUID.test(id)) throw new Error(`label list ${name}, row ${i}: no oracleId uuid`);
    return id;
  });
  if (new Set(ids).size !== ids.length) throw new Error(`label list ${name} names an oracle id twice`);
  return ids;
}

/** Case-insensitive, as `scope.ts`'s deck guard is. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
