// pnpm check:test-copy-literals
// A test references the copy module instead of retyping what the app prints (docs/agents/copy-sheet.md). This fails when any
// test file in the tree holds a string literal of two or more words equal to a copy leaf verbatim. Whole tree, no allowlist,
// no baseline: the one skip is the scope rule in `inTestScope` (a copy module's own tests pin the copy itself). Import the
// leaf and assert on it; a status or domain value is read from its own source (`TO_BUY_STATUS`), never typed.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { copyLeaves, findTestLiterals, inTestScope } from "./lib/test-copy-literals.mjs";

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).trim();
const tracked = (...paths: string[]) => git("ls-files", "--cached", "--others", "--exclude-standard", "--", ...paths).split("\n").filter(Boolean);

const tests = tracked("src", "scripts").filter(inTestScope);
const leaves = copyLeaves(tracked("src/lib/copy").filter((f) => /\.ts$/.test(f) && !/\.test\./.test(f)));
let bad = 0;
for (const file of tests) {
  for (const h of findTestLiterals(file, readFileSync(file, "utf8"), leaves)) {
    bad++;
    console.error(`${file}:${h.line}  "${h.text}" is copy (${h.key}): import it instead`);
  }
}
if (bad > 0) {
  console.error(`\n${bad} test literal${bad === 1 ? "" : "s"} equal copy. Import the leaf from src/lib/copy/ and assert on it (docs/agents/copy-sheet.md).`);
  process.exit(1);
}
console.log(`test copy literals ok: ${tests.length} test files, none holds a literal equal to a copy leaf`);
