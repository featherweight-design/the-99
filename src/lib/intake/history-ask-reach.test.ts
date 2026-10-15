// The stored ask holds player-typed words. It is read back to NAME and REOPEN a run, and to nothing
// else: no prompt is built from it. The one road from a typed word to a model stays the press, through
// `playerText` in shortlistRequest and judgeRequest. This walks the tree (it names node:fs, so CI's
// always-set runs it) and fails when any other module reads the column.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

/** The modules allowed to name the column: its definition, its one writer, its one reader. */
const READERS = new Set([
  "db/schema.ts",
  "lib/intake/run-store.ts",
  "lib/intake/history-read.ts",
]);

describe("the stored ask", () => {
  const files = walk(SRC).map((f) => ({ rel: f.slice(SRC.length + 1), text: readFileSync(f, "utf8") }));

  it("is named by the schema, the run store and the History read, and no other module", () => {
    const naming = files.filter((f) => /\bintakeReads\b/.test(f.text) && /\bask\b/.test(f.text)).map((f) => f.rel);
    expect(naming.filter((r) => !READERS.has(r))).toEqual([]);
    expect(naming).toEqual(expect.arrayContaining(["lib/intake/run-store.ts", "lib/intake/history-read.ts"]));
  });

  it("is never imported by a prompt builder or the model client", () => {
    const builders = files.filter((f) => /^lib\/model\//.test(f.rel) || /^lib\/intake\/(the-read|read)[^/]*\.ts$/.test(f.rel));
    expect(builders.length).toBeGreaterThan(3);
    const reaching = builders.filter((f) => /history-read|from "\.\/history"|\bloadChooseHistory\b|\bshapeRun\b/.test(f.text)).map((f) => f.rel);
    expect(reaching).toEqual([]);
  });
});
