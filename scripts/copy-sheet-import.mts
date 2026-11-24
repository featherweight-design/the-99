// pnpm copy:import <edited.csv> [--root <dir>] [--dry]
// Applies the changed rows of an edited copy sheet to the copy files under --root (default: the current directory) and
// prints each old -> new pair. Any bad row (placeholders, em dash, banned word, stale sheet) fails the whole import with a
// line per row and changes nothing. PR 2 wraps this in its own worktree and branch.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { applySheet } from "./lib/copy-sheet/sheet.mjs";

const args = process.argv.slice(2);
const csvPath = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--root");
const rootAt = args.indexOf("--root");
const root = resolve(rootAt >= 0 ? args[rootAt + 1] : process.cwd());
if (!csvPath) {
  console.error("usage: pnpm copy:import <edited.csv> [--root <dir>] [--dry]");
  process.exit(2);
}
try {
  const { files, changes } = applySheet(readFileSync(resolve(csvPath), "utf8"), root);
  for (const c of changes) console.log(`${c.key}\n  - ${c.from}\n  + ${c.to}`);
  if (!args.includes("--dry")) for (const [file, src] of files) writeFileSync(join(root, file), src);
  console.log(`${changes.length} change${changes.length === 1 ? "" : "s"} in ${files.size} file${files.size === 1 ? "" : "s"}${args.includes("--dry") ? " (dry run, nothing written)" : ""}`);
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
