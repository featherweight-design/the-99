// pnpm copy:import <edited.csv> [--dry] [--no-pr]
// Safe to run from any checkout, on any branch, with a dirty tree: it never touches the checkout it ran from. It makes its
// own worktree and branch from origin/main, applies the changed rows of the sheet, runs typecheck and lint, pushes, opens
// the PR with the old -> new list, and removes the worktree. The CSV is never committed.
//   --dry     validate and print the old -> new list against origin/main; push nothing
//   --no-pr   stop after the commit (the worktree and branch stay for you)
//   --local [--root <dir>]   apply in place to a tree you name, no git (what the tests and a hand edit use)
//   --branch copy-edit-YYYYMMDD-HHMMSS   name the branch (the copy editor's workflow does, so the editor can find the PR)
// Only `git fetch`, `git push` and `gh pr create` see a token in the environment (GH_TOKEN, GITHUB_TOKEN, COPY_EDIT_PR_TOKEN,
// GIT_CONFIG_COUNT/KEY_0/VALUE_0): the install, typecheck, lint and commit hooks run with those removed, so no dependency script can read one.
// A bad row (placeholders, em dash, banned word, stale sheet) fails the whole import and leaves nothing behind.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { branchName, commitMessage, prBody } from "./lib/copy-sheet/land.mjs";
import { applySheet } from "./lib/copy-sheet/sheet.mjs";
import { EDIT_BRANCH_RE } from "./lib/copy-sheet/submission.mjs";
import { rewriteTests, testsSection, type TestRewrite } from "./lib/copy-sheet/test-rewrite.mjs";

const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const rootAt = args.indexOf("--root");
const branchAt = args.indexOf("--branch");
const givenBranch = branchAt >= 0 ? args[branchAt + 1] : undefined;
const csvPath = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--root" && args[i - 1] !== "--branch");
if (!csvPath || (branchAt >= 0 && !EDIT_BRANCH_RE.test(givenBranch ?? ""))) {
  console.error("usage: pnpm copy:import <edited.csv> [--dry] [--no-pr] [--branch copy-edit-YYYYMMDD-HHMMSS] | --local [--root <dir>]");
  process.exit(2);
}
const csv = readFileSync(resolve(csvPath), "utf8");

function fail(e: unknown): never {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}

// `env -u` rather than a filtered copy of process.env: the flag-read guard (rightly) refuses code that hands the environment on.
const UNSET = ["GH_TOKEN", "GITHUB_TOKEN", "COPY_EDIT_PR_TOKEN", "GIT_CONFIG_COUNT", "GIT_CONFIG_KEY_0", "GIT_CONFIG_VALUE_0"].flatMap((k) => ["-u", k]);

/** Runs a command with no token variable in its environment. */
const run = (cmd: string, a: string[], cwd: string, stdio: "pipe" | "inherit" = "pipe") =>
  execFileSync("env", [...UNSET, cmd, ...a], { cwd, stdio, encoding: "utf8" })?.toString().trim() ?? "";
/** Runs `git fetch`, `git push` or `gh`, the only commands that need the token. */
const runAuth = (cmd: string, a: string[], cwd: string) => execFileSync(cmd, a, { cwd, stdio: "pipe", encoding: "utf8" })?.toString().trim() ?? "";

function printChanges(changes: { key: string; from: string; to: string }[]) {
  for (const c of changes) console.log(`${c.key}\n  - ${c.from}\n  + ${c.to}`);
}

/** Tests that hold a changed row's old words are rewritten to read the leaf; the rest are named for a hand edit. */
function withTests(root: string, applied: ReturnType<typeof applySheet>): { files: Map<string, string>; tests: TestRewrite } {
  const tests = rewriteTests(applied.changes, root);
  console.log(testsSection(tests).join("\n"));
  return { files: new Map([...applied.files, ...tests.files]), tests };
}

if (flag("--local")) {
  const root = resolve(rootAt >= 0 ? args[rootAt + 1] : process.cwd());
  try {
    const applied = applySheet(csv, root);
    const { changes } = applied;
    printChanges(changes);
    const { files } = withTests(root, applied);
    for (const [file, src] of files) writeFileSync(join(root, file), src);
    console.log(`${changes.length} change${changes.length === 1 ? "" : "s"} in ${files.size} file${files.size === 1 ? "" : "s"}`);
  } catch (e) {
    fail(e);
  }
  process.exit(0);
}

// Every git command below runs from the common repo (works from a worktree too) and names its own worktree, so the
// caller's branch, index and dirty files are never read or written.
const here = process.cwd();
let repo = here;
let tree = "";
let branch = "";
let made = false;
let keepBranch = false;
let pushed = false;
const scratch = mkdtempSync(join(tmpdir(), "copy-import-"));
const cleanup = () => {
  rmSync(scratch, { recursive: true, force: true });
  if (!made) return;
  try {
    run("git", ["worktree", "remove", "--force", tree], repo);
  } catch {
    rmSync(tree, { recursive: true, force: true });
  }
  if (!keepBranch) {
    try {
      run("git", ["branch", "-D", branch], repo);
    } catch {
      /* already gone */
    }
  }
  made = false;
};
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    cleanup();
    process.exit(130);
  });
}
try {
  const common = resolve(here, run("git", ["rev-parse", "--git-common-dir"], here));
  repo = common.endsWith(".git") ? resolve(common, "..") : common;
  runAuth("git", ["fetch", "-q", "origin", "main"], repo);
  branch = givenBranch ?? branchName(new Date());
  tree = join(repo, ".worktrees", branch);
  if (existsSync(tree)) throw new Error(`${tree} already exists: one import a minute; wait or remove it`);
  run("git", ["worktree", "add", "-q", "-b", branch, tree, "origin/main"], repo);
  made = true;
  const applied = applySheet(csv, tree);
  const { changes } = applied;
  printChanges(changes);
  if (changes.length === 0) {
    console.log("No changed rows: nothing to do.");
    cleanup();
    process.exit(0);
  }
  const { files, tests } = withTests(tree, applied);
  if (flag("--dry")) {
    console.log(`${changes.length} change${changes.length === 1 ? "" : "s"} in ${files.size} file${files.size === 1 ? "" : "s"} (dry run, nothing pushed)`);
    cleanup();
    process.exit(0);
  }
  for (const [file, src] of files) writeFileSync(join(tree, file), src);
  console.log("Installing and checking (typecheck, lint) in the new worktree...");
  run("pnpm", ["install", "--frozen-lockfile"], tree);
  run("pnpm", ["typecheck"], tree, "inherit");
  run("pnpm", ["lint"], tree, "inherit");
  const names = [...files.keys()];
  run("git", ["add", ...names], tree);
  writeFileSync(join(scratch, "m.txt"), commitMessage(changes, names.length));
  run("git", ["commit", "-q", "-F", join(scratch, "m.txt")], tree);
  keepBranch = true;
  if (flag("--no-pr")) {
    console.log(`Committed on ${branch} in ${tree}. Push and open the PR yourself.`);
    rmSync(scratch, { recursive: true, force: true });
    process.exit(0);
  }
  runAuth("git", ["push", "-q", "-u", "origin", branch], tree);
  pushed = true;
  writeFileSync(join(scratch, "b.md"), prBody(changes, names, tests));
  const url = runAuth("gh", ["pr", "create", "--title", `Copy sheet: ${changes.length} wording change${changes.length === 1 ? "" : "s"}`, "--body-file", join(scratch, "b.md")], tree);
  console.log(`Opened ${url}. Copy-review the old -> new list in the body before it lands.`);
  cleanup();
} catch (e) {
  cleanup();
  if (pushed) console.error(`The branch ${branch} is pushed but the PR was not opened: open it from that branch (the worktree is removed).`);
  fail(e);
}
