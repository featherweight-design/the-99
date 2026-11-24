// pnpm check:inline-copy
// Every user-facing string lives in src/lib/copy/ (docs/agents/copy-sheet.md). This fails when a diff ADDS one inline:
// JSX text with words, aria-label/placeholder/title/alt, a toast or setError string, an action's `error: "two words"`.
// It reads only the lines the diff adds, so the strings still inline wait for their move PRs; there is no allowlist.
// Fix a failure by adding the string to the copy module and calling it. Data (card names, numbers) is not copy.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { addedLines, findInline, inScope } from "./lib/inline-copy.mjs";

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).trim();
// CI checks out the PR's merge commit with depth 2, so its first parent is the base; locally the base is the merge base
// with origin/main, and the diff includes uncommitted edits.
const base = process.env.CI ? "HEAD^1" : git("merge-base", "origin/main", "HEAD");
const added = addedLines(execFileSync("git", ["-c", "core.quotePath=false", "diff", "-U0", "--no-color", "--diff-filter=AMR", base, "--", "src"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }));
for (const f of git("ls-files", "--others", "--exclude-standard", "--", "src").split("\n").filter(Boolean)) {
  added.set(f, new Set(Array.from({ length: readFileSync(f, "utf8").split("\n").length }, (_, i) => i + 1)));
}

let bad = 0;
let files = 0;
for (const [file, lines] of added) {
  if (!inScope(file) || lines.size === 0) continue;
  files++;
  for (const h of findInline(file, readFileSync(file, "utf8"))) {
    if (!lines.has(h.line)) continue;
    bad++;
    console.error(`${file}:${h.line}  inline ${h.kind}: "${h.text}"`);
  }
}
if (bad > 0) {
  console.error(`\n${bad} inline string${bad === 1 ? "" : "s"} added. Put each in src/lib/copy/ and call it (docs/agents/copy-sheet.md).`);
  process.exit(1);
}
console.log(`inline copy ok: ${files} changed source file${files === 1 ? "" : "s"}, no added inline string`);
