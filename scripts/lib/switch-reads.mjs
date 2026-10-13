// Under `src/`, a feature switch is decided from the READER's resolved env (`requestSwitchEnv`), never
// from the environment alone (admin plan PR 4 and 5 to 7). Since admin PR 7a every flag function takes
// its `env` as a required argument, so leaving it out no longer compiles; what still compiles is handing
// it `process.env` itself, which reads the environment and skips every override. This check holds that
// half: under `src/`, the `process.env` OBJECT never travels anywhere (an argument, a spread or copy, an
// object property, a variable, a return value, a JSX prop), outside the resolver (`src/lib/switches/`),
// tests, and the ALLOWED list below.
//
// Deliberately wider than "a flag function's argument": telling a flag call or an `env` parameter apart
// needs the type checker over the whole program, which is slow, and a value bound to a local first
// (`const e = process.env; fooEnabled(e)`) would pass a call-site check anyway. Tracking the object
// itself catches both, and a legitimate non-switch use goes on ALLOWED with its reason.
//
// What is NOT a finding: a member read (`process.env.FOO`, `process.env[key]`), `key in process.env`, a
// destructuring read (`const { FOO } = process.env`), and a PARAMETER DEFAULT (`env = process.env`, or
// `{ env = process.env }` destructured from props):
// the readers' defaults are removed by admin PRs 7b to 7d, after which omitting the env is a compile
// error. What it cannot see: the environment reached another way (`globalThis.process.env`, an alias of
// `process` itself, `require("process").env`), or a flag function handed an env object someone BUILT by
// hand from individual member reads.
import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import ts from "typescript";

/**
 * Files in `src/` that hand on `process.env` and are right to, each with a reason a reviewer can check.
 * Keep it small: an entry is a claim that no reader's switches apply on that path.
 */
export const ALLOWED = [
  {
    path: "src/proxy.ts",
    count: 1,
    reason:
      "a signed-out request: `resolveSwitchEnv` needs an account, and every read of `env` below it sits behind `userId` (or after `if (!userId) return pass()`), so the environment it binds is never read",
  },
];

/**
 * Files that still fall back to the environment, each removed by a named later PR. The check fails when a
 * file's count moves either way, so the list only shrinks by being edited.
 */
export const PENDING = [
  { path: "src/lib/decks/availability-query.ts", count: 1, pr: "7b", reason: "`opts?.env ?? process.env`, the claim model's optional env" },
  { path: "src/lib/tuning/cuts-run-store.ts", count: 1, pr: "7b", reason: "`opts.env ?? process.env` into `assertSomeCardOpen`" },
  { path: "src/lib/tuning/run-store.ts", count: 1, pr: "7b", reason: "`opts.env ?? process.env` into `assertSomeCardOpen`" },
  { path: "src/lib/profile/stored.ts", count: 4, pr: "7d", reason: "`REQUEST_DEPS`, `storedBasisMoved`'s default basis and `deps.env ?? process.env`" },
];

const EXEMPT = (path) => path.startsWith("src/lib/switches/");
const isTest = (path) => /\.test\.(?:t|j)sx?$|\.test\.mts$/.test(path);

/** `process.env`, written as a property or element access on the bare `process`. */
function isProcessEnv(node) {
  const onProcess = (expr) => ts.isIdentifier(expr) && expr.text === "process";
  if (ts.isPropertyAccessExpression(node)) return onProcess(node.expression) && node.name.text === "env";
  if (ts.isElementAccessExpression(node)) {
    return onProcess(node.expression) && ts.isStringLiteralLike(node.argumentExpression) && node.argumentExpression.text === "env";
  }
  return false;
}

/** Whether this occurrence only READS the environment rather than handing the object on. */
function onlyReads(node) {
  const parent = node.parent;
  if (!parent) return false;
  // `process.env.FOO`, `process.env[key]`.
  if ((ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) && parent.expression === node) return true;
  // `key in process.env`.
  if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.InKeyword && parent.right === node) return true;
  // `const { FOO } = process.env`.
  if (ts.isVariableDeclaration(parent) && parent.initializer === node && !ts.isIdentifier(parent.name)) return true;
  // A parameter default, or a destructured one (`{ env = process.env }`, a component's prop), which admin
  // PRs 7b to 7d remove.
  if ((ts.isParameter(parent) || ts.isBindingElement(parent)) && parent.initializer === node) return true;
  return false;
}

/** The findings for one file's source, as `{ line, why }`. Exported for the tests. */
export function switchReadsIn(path, source) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, /x$/.test(path) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const findings = [];
  const visit = (node) => {
    if (isProcessEnv(node)) {
      if (!onlyReads(node)) {
        const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
        const at = node.parent.getText(file).replace(/\s+/g, " ").slice(0, 80);
        findings.push({ line, why: `hands on process.env (${at})` });
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return findings;
}

const gone = (err) => err?.code === "ENOENT";

async function walk(dir, top = true) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    // Never the root: a scan that cannot find `src` must fail, not report zero files and pass.
    if (!top && gone(err)) return out;
    throw err;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path, false)));
    else if (/\.(?:ts|tsx|mts)$/.test(entry.name)) out.push(path);
  }
  return out;
}

/**
 * Every finding under `root`'s `src`, and every ALLOWED or PENDING entry whose count no longer matches
 * (`drift`). A file listed in either is held to its count exactly: one more is a new finding, one fewer
 * is an entry to edit.
 */
export async function switchReadFindings(root, { allowed = ALLOWED, pending = PENDING, dir = "src" } = {}) {
  const files = await walk(join(root, dir));
  const byPath = new Map();
  let read = 0;
  for (const file of files) {
    const path = relative(root, file).split(sep).join("/");
    if (EXEMPT(path) || isTest(path)) continue;
    let source;
    try {
      source = await readFile(file, "utf8");
    } catch (err) {
      if (gone(err)) continue;
      throw err;
    }
    read += 1;
    const found = switchReadsIn(path, source);
    if (found.length) byPath.set(path, found);
  }
  const listed = new Map([...allowed, ...pending].map((e) => [e.path, e]));
  const findings = [];
  const drift = [];
  for (const [path, found] of byPath) {
    const entry = listed.get(path);
    if (!entry) findings.push(...found.map((f) => ({ path, ...f })));
    else if (found.length !== entry.count) drift.push({ path, expected: entry.count, found: found.length, lines: found.map((f) => f.line) });
  }
  for (const entry of listed.values()) {
    if (!byPath.has(entry.path)) drift.push({ path: entry.path, expected: entry.count, found: 0, lines: [] });
  }
  return { files: read, findings, drift };
}
