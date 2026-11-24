// pnpm check:test-copy-literals
// A test references the copy module instead of retyping what the app prints (docs/agents/copy-sheet.md). This fails when a
// diff ADDS a test string literal of two or more words equal to a copy leaf verbatim. It reads only the lines the diff
// adds, so the tests already written wait for their migration PRs; there is no allowlist. Import the leaf and assert on it.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { addedLines } from "./lib/inline-copy.mjs";
import { copyLeaves, findTestLiterals, inTestScope } from "./lib/test-copy-literals.mjs";

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).trim();
const base = process.env.CI ? "HEAD^1" : git("merge-base", "origin/main", "HEAD");
const added = addedLines(execFileSync("git", ["-c", "core.quotePath=false", "diff", "-U0", "--no-color", "--diff-filter=AMR", base, "--", "src", "scripts"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }));
for (const f of git("ls-files", "--others", "--exclude-standard", "--", "src", "scripts").split("\n").filter(Boolean)) {
  added.set(f, new Set(Array.from({ length: readFileSync(f, "utf8").split("\n").length }, (_, i) => i + 1)));
}

const tests = [...added].filter(([f, lines]) => inTestScope(f) && lines.size > 0);
let bad = 0;
if (tests.length > 0) {
  const leaves = copyLeaves(git("ls-files", "src/lib/copy").split("\n").filter((f) => /\.ts$/.test(f) && !/\.test\./.test(f)));
  for (const [file, lines] of tests) {
    for (const h of findTestLiterals(file, readFileSync(file, "utf8"), leaves)) {
      if (!lines.has(h.line)) continue;
      bad++;
      console.error(`${file}:${h.line}  "${h.text}" is copy (${h.key}): import it instead`);
    }
  }
}
if (bad > 0) {
  console.error(`\n${bad} test literal${bad === 1 ? "" : "s"} equal copy. Import the leaf from src/lib/copy/ and assert on it (docs/agents/copy-sheet.md).`);
  process.exit(1);
}
console.log(`test copy literals ok: ${tests.length} changed test file${tests.length === 1 ? "" : "s"}, no added literal equal to a copy leaf`);
