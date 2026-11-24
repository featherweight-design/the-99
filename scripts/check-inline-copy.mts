// pnpm check:inline-copy
// Every user-facing string lives in src/lib/copy/ (docs/agents/copy-sheet.md). This fails on any inline one in the whole
// tree: JSX text with words, aria-label/placeholder/title/alt, a toast or setError string, an action's `error: "two words"`.
// There is no allowlist and no baseline. Fix a failure by adding the string to the copy module and calling it.
// Data (card names, numbers) is not copy.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { findInline, inScope } from "./lib/inline-copy.mjs";

// Tracked files plus new untracked ones, so a file you have not added yet is still checked.
const list = (...args: string[]) =>
  execFileSync("git", ["-c", "core.quotePath=false", ...args, "--", "src"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).split("\n").filter(Boolean);
const tree = new Set([...list("ls-files"), ...list("ls-files", "--others", "--exclude-standard")]);

let bad = 0;
let files = 0;
for (const file of [...tree].sort()) {
  if (!inScope(file)) continue;
  files++;
  for (const h of findInline(file, readFileSync(file, "utf8"))) {
    bad++;
    console.error(`${file}:${h.line}  inline ${h.kind}: "${h.text}"`);
  }
}
if (bad > 0) {
  console.error(`\n${bad} inline string${bad === 1 ? "" : "s"}. Put each in src/lib/copy/ and call it (docs/agents/copy-sheet.md).`);
  process.exit(1);
}
console.log(`inline copy ok: ${files} source files, no inline string`);
