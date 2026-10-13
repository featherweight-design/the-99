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
// What is NOT a finding: a member read (`process.env.FOO`, `process.env[key]`), `key in process.env`, and
// a destructuring read (`const { FOO } = process.env`; a REST element, `const { ...e } = process.env`, is a
// copy and is a finding). A PARAMETER DEFAULT (`env = process.env`, or `{ env = process.env }` destructured
// in a parameter, a component's prop) is not a finding either, but is counted per file and held to
// DEFAULTS_PENDING, so no new one lands while admin PRs 7b to 7d remove them; a binding default in a
// VARIABLE (`const { env = process.env } = opts`) is a finding. What it cannot see: the environment
// reached another way (`globalThis.process.env`, an alias of `process` itself, `require("process").env`),
// or a flag function handed an env object someone BUILT by hand from individual member reads.
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

/**
 * Parameter defaults of `process.env` (`env = process.env`, or `{ env = process.env }` destructured in a
 * parameter), held per file at an exact count, the same way as PENDING: a new default fails, and a removed one
 * fails until its entry shrinks. Admin PRs 7b, 7c and 7d each empty their own entries; `keep` names a default
 * that reads the environment on purpose, with its reason. Seeded from the tree at admin PR 7a.
 */
/** @type {Record<string, { count: number, pr: string, reason?: string }>} */
export const DEFAULTS_PENDING = {
  "src/components/about/about-page.tsx": { count: 1, pr: "7d" },
  "src/lib/about/visible.ts": { count: 1, pr: "7d" },
  "src/lib/cards/chain-art.ts": { count: 1, pr: "7d" },
  "src/lib/collection/card-detail.ts": { count: 2, pr: "7c" },
  "src/lib/collection/summary-read.ts": { count: 3, pr: "7c" },
  "src/lib/commander-change/candidates.ts": { count: 1, pr: "7c" },
  "src/lib/commander-change/draft-rows.ts": { count: 1, pr: "7c" },
  "src/lib/commander-change/mix-key.ts": { count: 1, pr: "7c" },
  "src/lib/commanders/rankings.ts": { count: 2, pr: "7d" },
  "src/lib/decks/availability-query.ts": { count: 1, pr: "7b" },
  "src/lib/decks/cart-read.ts": { count: 1, pr: "7b" },
  "src/lib/decks/cuts-read.ts": { count: 2, pr: "7b" },
  "src/lib/decks/draft-state.ts": { count: 2, pr: "7b" },
  "src/lib/decks/label-counts-flag.ts": { count: 1, pr: "keep", reason: "`envForPageBasis`'s `environment`: it reads the ENVIRONMENT's kill switch (`off`) on purpose, which no resolved env carries" },
  "src/lib/decks/notes-read.ts": { count: 1, pr: "7b" },
  "src/lib/decks/printings.ts": { count: 5, pr: "7b" },
  "src/lib/decks/read.ts": { count: 2, pr: "7b" },
  "src/lib/decks/shopping-rollup.ts": { count: 2, pr: "7b" },
  "src/lib/decks/suggestions-read.ts": { count: 2, pr: "7b" },
  "src/lib/decks/tuning-read.ts": { count: 4, pr: "7b" },
  "src/lib/decks/versions.ts": { count: 2, pr: "7b" },
  "src/lib/discovery/list.ts": { count: 4, pr: "7d" },
  "src/lib/discovery/payload.ts": { count: 1, pr: "7d" },
  "src/lib/discovery/resolve-slug.ts": { count: 1, pr: "7d" },
  "src/lib/intake/hand-off-load.ts": { count: 1, pr: "7c" },
  "src/lib/intake/rows.ts": { count: 2, pr: "7c" },
  "src/lib/intake/search.ts": { count: 3, pr: "7c" },
  "src/lib/intake/stub.ts": { count: 3, pr: "7c" },
  "src/lib/intake/the-read-run.ts": { count: 2, pr: "7c" },
  "src/lib/intake/trial.ts": { count: 1, pr: "7c" },
  "src/lib/notices/overview.ts": { count: 1, pr: "7d" },
  "src/lib/notices/read.ts": { count: 1, pr: "7d" },
  "src/lib/profile/load.ts": { count: 3, pr: "7d" },
  "src/lib/recs/free-ranking.ts": { count: 2, pr: "7c" },
  "src/lib/recs/home-novelty.ts": { count: 2, pr: "7c" },
  "src/lib/recs/ranked-list.ts": { count: 1, pr: "7c" },
  "src/lib/recs/recommend.ts": { count: 2, pr: "7c" },
  "src/lib/recs/store.ts": { count: 5, pr: "7c" },
  "src/lib/recs/warm.ts": { count: 1, pr: "7c" },
  "src/lib/swaps/draft-swap.ts": { count: 2, pr: "7c" },
  "src/lib/swaps/fits-read-load.ts": { count: 1, pr: "7c" },
  "src/lib/swaps/fits-read-run.ts": { count: 2, pr: "7c" },
  "src/lib/swaps/fits-read-stub.ts": { count: 3, pr: "7c" },
  "src/lib/swaps/fits.ts": { count: 1, pr: "7c" },
  "src/lib/swaps/gather.ts": { count: 1, pr: "7c" },
  "src/lib/swaps/take.ts": { count: 2, pr: "7c" },
  "src/lib/synopsis/generate.ts": { count: 4, pr: "7d" },
  "src/lib/synopsis/read.ts": { count: 2, pr: "7d" },
  "src/lib/synopsis/stub.ts": { count: 4, pr: "7d" },
  "src/lib/tuning/cuts-verdicts.ts": { count: 2, pr: "7b" },
  "src/lib/tuning/mana-help-load.ts": { count: 1, pr: "7b" },
  "src/lib/tuning/mana-staples.ts": { count: 1, pr: "7b" },
  "src/lib/tuning/mana-trade.ts": { count: 2, pr: "7b" },
  "src/lib/tuning/run-store.ts": { count: 1, pr: "7b" },
  "src/lib/tuning/stub.ts": { count: 2, pr: "7b" },
  "src/lib/tuning/verdicts.ts": { count: 2, pr: "7b" },
};

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

/** The declaration a binding element belongs to: up through any nested binding patterns. */
function bindingOwner(node) {
  let at = node.parent;
  while (at && (ts.isObjectBindingPattern(at) || ts.isArrayBindingPattern(at) || ts.isBindingElement(at))) at = at.parent;
  return at;
}

/**
 * What one occurrence of `process.env` does: `read` (only reads the environment), `default` (a parameter
 * default, held per file by DEFAULTS_PENDING until admin PRs 7b to 7d remove them), or `handoff` (the
 * object travels on, a finding).
 */
function classify(node) {
  const parent = node.parent;
  if (!parent) return "handoff";
  // `process.env.FOO`, `process.env[key]`.
  if ((ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) && parent.expression === node) return "read";
  // `key in process.env`.
  if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.InKeyword && parent.right === node) return "read";
  // `const { FOO } = process.env`, but never `const { ...rest } = process.env`, which is a copy of it.
  if (ts.isVariableDeclaration(parent) && parent.initializer === node && !ts.isIdentifier(parent.name)) {
    const rest = ts.isObjectBindingPattern(parent.name) && parent.name.elements.some((e) => !!e.dotDotDotToken);
    return rest ? "handoff" : "read";
  }
  // A parameter default (`env = process.env`), or one destructured in a parameter (`{ env = process.env }`,
  // a component's prop). A binding default in a variable (`const { env = process.env } = opts`) is not one.
  if (ts.isParameter(parent) && parent.initializer === node) return "default";
  if (ts.isBindingElement(parent) && parent.initializer === node) {
    const owner = bindingOwner(parent);
    return owner && ts.isParameter(owner) ? "default" : "handoff";
  }
  return "handoff";
}

/** Every occurrence of `process.env` in a file, classified, as `{ line, kind, at }`. */
function occurrences(path, source) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, /x$/.test(path) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out = [];
  const visit = (node) => {
    if (isProcessEnv(node)) {
      const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
      out.push({ line, kind: classify(node), at: node.parent.getText(file).replace(/\s+/g, " ").slice(0, 80) });
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return out;
}

/** The lines of a file's parameter defaults of `process.env`. Exported for the tests. */
export function envDefaultsIn(path, source) {
  return occurrences(path, source).filter((o) => o.kind === "default").map((o) => o.line);
}

/** The findings for one file's source, as `{ line, why }`. Exported for the tests. */
export function switchReadsIn(path, source) {
  return occurrences(path, source)
    .filter((o) => o.kind === "handoff")
    .map((o) => ({ line: o.line, why: `hands on process.env (${o.at})` }));
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
export async function switchReadFindings(root, { allowed = ALLOWED, pending = PENDING, defaults = DEFAULTS_PENDING, dir = "src" } = {}) {
  const files = await walk(join(root, dir));
  const byPath = new Map();
  const defaultsByPath = new Map();
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
    const lines = envDefaultsIn(path, source);
    if (lines.length) defaultsByPath.set(path, lines);
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
  // Parameter defaults: a file not in DEFAULTS_PENDING may hold none, and a listed file exactly its count.
  for (const [path, lines] of defaultsByPath) {
    const expected = defaults[path]?.count ?? 0;
    if (lines.length !== expected) drift.push({ path, expected, found: lines.length, lines, kind: "default" });
  }
  for (const [path, entry] of Object.entries(defaults)) {
    if (!defaultsByPath.has(path)) drift.push({ path, expected: entry.count, found: 0, lines: [], kind: "default" });
  }
  return { files: read, findings, drift };
}
