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
// in a parameter, a component's prop) is not a finding either, but is held to DEFAULTS_PENDING so no new
// one lands while admin PRs 7b to 7d remove them; a binding default in a VARIABLE
// (`const { env = process.env } = opts`) is a finding.
//
// Every listed occurrence is pinned by a FINGERPRINT, never a line number or a per-file total:
// `<scope>:<use>` for a hand-off (`loadAvailability:fallback`, `REQUEST_DEPS:argument:requestProfileDeps`) and
// `<scope>:default:<param>` for a default, each with a count. A total let a file swap an approved use for a
// new one elsewhere and pass. The scope is the enclosing named function, method or module-level const, so
// a NEW use in the same function, used the same way, still shares a fingerprint and is caught only by the
// count rising, and a rename of that function reads as one removed and one added.
//
// What it cannot see: the environment reached another way (`globalThis.process.env`, an alias of `process`
// itself, `require("process").env`), or a flag function handed an env object someone BUILT by hand from
// individual member reads.
import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import ts from "typescript";

/**
 * Files in `src/` that hand on `process.env` and are right to, each with a reason a reviewer can check and the
 * fingerprints (`<scope>:<use>`, see `occurrences`) it approves, each with its count. Keep it small: an entry
 * is a claim that no reader's switches apply on that path.
 */
/** @typedef {{ path: string, uses: Record<string, number>, reason: string, pr?: string }} ListEntry */
/** @type {ListEntry[]} */
export const ALLOWED = [
  {
    path: "src/proxy.ts",
    uses: { "clerkMiddleware():fallback": 1 },
    reason:
      "a signed-out request: `resolveSwitchEnv` needs an account, and every read of `env` below it sits behind `userId` (or after `if (!userId) return pass()`), so the environment it binds is never read",
  },
];

/**
 * Files that still fall back to the environment, each removed by a named later PR, pinned by fingerprint like
 * ALLOWED. The check fails when a fingerprint's count moves either way, so the list only shrinks by being edited.
 */
/** @type {ListEntry[]} */
export const PENDING = [
  { path: "src/lib/decks/availability-query.ts", uses: { "loadAvailability:fallback": 1 }, pr: "7b", reason: "`opts?.env ?? process.env`, the claim model's optional env" },
  { path: "src/lib/tuning/cuts-run-store.ts", uses: { "startCutsRun:fallback:assertSomeCardOpen": 1 }, pr: "7b", reason: "`opts.env ?? process.env` into `assertSomeCardOpen`" },
  { path: "src/lib/tuning/run-store.ts", uses: { "startRun:fallback:assertSomeCardOpen": 1 }, pr: "7b", reason: "`opts.env ?? process.env` into `assertSomeCardOpen`" },
  {
    path: "src/lib/profile/stored.ts",
    uses: { "REQUEST_DEPS:argument:requestProfileDeps": 1, "storedBasisMoved:argument:roleBasisFromEnv": 1, "computeAndStoreProfile:fallback:noticesEnabled": 1, "computeAndStoreProfile:fallback:roleBasisFromEnv": 1 },
    pr: "7d",
    reason: "`REQUEST_DEPS`, `storedBasisMoved`'s default basis and `deps.env ?? process.env`",
  },
];

/**
 * Parameter defaults of `process.env` (`env = process.env`, or `{ env = process.env }` destructured in a
 * parameter), pinned per file by fingerprint (`<scope>:default:<name>`) with a count each, the same way as
 * PENDING: a new default fails, and a removed one fails until its entry shrinks. Admin PRs 7b, 7c and 7d each
 * empty their own entries; `keep` names a default that reads the environment on purpose, with its reason.
 * Seeded from the tree at admin PR 7a.
 */
/** @type {Record<string, { pr: string, reason?: string, uses: Record<string, number> }>} */
export const DEFAULTS_PENDING = {
  "src/components/about/about-page.tsx": { pr: "7d", uses: { "AboutPage:default:env": 1 } },
  "src/lib/about/visible.ts": { pr: "7d", uses: { "visibleEntries:default:env": 1 } },
  "src/lib/cards/chain-art.ts": { pr: "7d", uses: { "chainArt:default:env": 1 } },
  "src/lib/collection/card-detail.ts": { pr: "7c", uses: { "fitsGate:default:env": 1, "loadCardDetail:default:env": 1 } },
  "src/lib/collection/summary-read.ts": { pr: "7c", uses: { "loadContestedCards:default:env": 1, "countContestedCards:default:env": 1, "loadChooserCards:default:env": 1 } },
  "src/lib/commander-change/candidates.ts": { pr: "7c", uses: { "loadChangeCandidates:default:env": 1 } },
  "src/lib/commander-change/draft-rows.ts": { pr: "7c", uses: { "loadCommanderRows:default:env": 1 } },
  "src/lib/commander-change/mix-key.ts": { pr: "7c", uses: { "commanderKeyParts:default:env": 1 } },
  "src/lib/commanders/rankings.ts": { pr: "7d", uses: { "commanderRankingsKey:default:env": 1, "loadCommanderRankings:default:env": 1 } },
  "src/lib/decks/availability-query.ts": { pr: "7b", uses: { "loadDeckBuyRows:default:env": 1 } },
  "src/lib/decks/cart-read.ts": { pr: "7b", uses: { "loadCart:default:env": 1 } },
  "src/lib/decks/cuts-read.ts": { pr: "7b", uses: { "readProposedCuts:default:env": 1, "readCutsState:default:env": 1 } },
  "src/lib/decks/draft-state.ts": { pr: "7b", uses: { "loadDraftState:default:env": 1, "loadDraftRows:default:env": 1 } },
  "src/lib/decks/label-counts-flag.ts": {
    pr: "keep",
    reason: "`envForPageBasis`'s `environment`: it reads the ENVIRONMENT's kill switch (`off`) on purpose, which no resolved env carries",
    uses: { "envForPageBasis:default:environment": 1 },
  },
  "src/lib/decks/notes-read.ts": { pr: "7b", uses: { "readDeckNotes:default:env": 1 } },
  "src/lib/decks/printings.ts": { pr: "7b", uses: { "resolveDeckOwnedPrintings:default:env": 1, "readDeckOwnedPrintings:default:env": 1, "resolveCommanderPrintingsByDeck:default:env": 1, "readHeldPricePicks:default:env": 1, "readModalPicks:default:env": 1 } },
  "src/lib/decks/read.ts": { pr: "7b", uses: { "getDeckDetail:default:env": 1, "deckPendingSql:default:env": 1 } },
  "src/lib/decks/shopping-rollup.ts": { pr: "7b", uses: { "loadShoppingRollup:default:env": 1, "readBuyRowPrices:default:env": 1 } },
  "src/lib/decks/suggestions-read.ts": { pr: "7b", uses: { "resolveSuggestionBasis:default:env": 1, "loadDeckSuggestions:default:env": 1 } },
  "src/lib/decks/tuning-read.ts": { pr: "7b", uses: { "tuningInputs:default:env": 1, "profileOfHead:default:env": 1, "withBracketAfter:default:env": 1, "readTuningState:default:env": 1 } },
  "src/lib/decks/versions.ts": { pr: "7b", uses: { "commitVersion:default:env": 1, "loadVersionDiff:default:env": 1 } },
  "src/lib/discovery/list.ts": { pr: "7d", uses: { "discoveryKey:default:env": 1, "loadDiscoveryPool:default:env": 1, "loadDiscovery:default:env": 1, "loadDiscoveryWithIds:default:env": 1 } },
  "src/lib/discovery/payload.ts": { pr: "7d", uses: { "loadDiscoveryPayload:default:env": 1 } },
  "src/lib/discovery/resolve-slug.ts": { pr: "7d", uses: { "resolveCommanderSlug:default:env": 1 } },
  "src/lib/intake/hand-off-load.ts": { pr: "7c", uses: { "loadHandOffAnswers:default:env": 1 } },
  "src/lib/intake/rows.ts": { pr: "7c", uses: { "loadResultsPage:default:env": 1, "loadCardChip:default:env": 1 } },
  "src/lib/intake/search.ts": { pr: "7c", uses: { "searchCommanders:default:env": 1, "loadSearchFacts:default:env": 1, "loadCardRow:default:env": 1 } },
  "src/lib/intake/stub.ts": { pr: "7c", uses: { "stubMode:default:env": 1, "stubDelayMs:default:env": 1, "intakeLive:default:env": 1 } },
  "src/lib/intake/the-read-run.ts": { pr: "7c", uses: { "stubTheReadDeps:default:env": 1, "loadTheReadInputs:default:env": 1 } },
  "src/lib/intake/trial.ts": { pr: "7c", uses: { "trialFill:default:env": 1 } },
  "src/lib/notices/overview.ts": { pr: "7d", uses: { "overviewDataMovedFor:default:env": 1 } },
  "src/lib/notices/read.ts": { pr: "7d", uses: { "loadDeckNotices:default:env": 1 } },
  "src/lib/profile/load.ts": { pr: "7d", uses: { "loadDeckProfileFromHead:default:env": 1, "loadDeckProfile:default:env": 1, "cachedDeckProfile:default:env": 1 } },
  "src/lib/recs/free-ranking.ts": { pr: "7c", uses: { "loadFreePool:default:env": 1, "rankFree:default:env": 1 } },
  "src/lib/recs/home-novelty.ts": { pr: "7c", uses: { "unplayedCountsSql:default:env": 1, "loadUnplayedCounts:default:env": 1 } },
  "src/lib/recs/ranked-list.ts": { pr: "7c", uses: { "getRankedList:default:env": 1 } },
  "src/lib/recs/recommend.ts": { pr: "7c", uses: { "recommendCommanders:default:env": 1, "scoreOneCommander:default:env": 1 } },
  "src/lib/recs/store.ts": { pr: "7c", uses: { "toScoreRow:default:env": 1, "persistScores:default:env": 1, "loadScores:default:env": 1, "rankableScoreRows:default:env": 1, "findScoredCommander:default:env": 1 } },
  "src/lib/recs/warm.ts": { pr: "7c", uses: { "warmCommanderScores:default:env": 1 } },
  "src/lib/swaps/draft-swap.ts": { pr: "7c", uses: { "planSwap:default:env": 1, "restoreSwap:default:env": 1 } },
  "src/lib/swaps/fits-read-load.ts": { pr: "7c", uses: { "loadFitsReadInputs:default:env": 1 } },
  "src/lib/swaps/fits-read-run.ts": { pr: "7c", uses: { "readFitsRead:default:env": 1, "pressFitsRead:default:env": 1 } },
  "src/lib/swaps/fits-read-stub.ts": { pr: "7c", uses: { "fitsReadLive:default:env": 1, "fitsStubMode:default:env": 1, "fitsStubDelayMs:default:env": 1 } },
  "src/lib/swaps/fits.ts": { pr: "7c", uses: { "loadFits:default:env": 1 } },
  "src/lib/swaps/gather.ts": { pr: "7c", uses: { "loadStandIns:default:env": 1 } },
  "src/lib/swaps/take.ts": { pr: "7c", uses: { "takeStandIn:default:env": 1, "undoSwap:default:env": 1 } },
  "src/lib/synopsis/generate.ts": { pr: "7d", uses: { "factsFor:default:env": 1, "startRun:default:env": 1, "writeSynopsisFor:default:env": 1, "retrySynopsisFor:default:env": 1 } },
  "src/lib/synopsis/read.ts": { pr: "7d", uses: { "readSynopsisState:default:env": 1, "readVersionSynopsis:default:env": 1 } },
  "src/lib/synopsis/stub.ts": { pr: "7d", uses: { "stubMode:default:env": 1, "stubDelayMs:default:env": 1, "stubDelay:default:env": 1, "synopsisLive:default:env": 1 } },
  "src/lib/tuning/cuts-verdicts.ts": { pr: "7b", uses: { "cutItem:default:env": 1, "undoCutItem:default:env": 1 } },
  "src/lib/tuning/mana-help-load.ts": { pr: "7b", uses: { "loadManaHelp:default:env": 1 } },
  "src/lib/tuning/mana-staples.ts": { pr: "7b", uses: { "loadManaStaples:default:env": 1 } },
  "src/lib/tuning/mana-trade.ts": { pr: "7b", uses: { "applyTrade:default:env": 1, "undoTrade:default:env": 1 } },
  "src/lib/tuning/run-store.ts": { pr: "7b", uses: { "assertSomeCardOpen:default:env": 1 } },
  "src/lib/tuning/stub.ts": { pr: "7b", uses: { "tuningStubDelayMs:default:env": 1, "heldStubOutcome:default:env": 1 } },
  "src/lib/tuning/verdicts.ts": { pr: "7b", uses: { "applyItem:default:env": 1, "undoItem:default:env": 1 } },
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

const WRAPPERS = (n) =>
  ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isSatisfiesExpression(n) || ts.isNonNullExpression(n) || ts.isTypeAssertionExpression(n);

/** The expression `node` stands for once parentheses and type assertions around it are peeled off. */
function outermost(node) {
  let at = node;
  while (at.parent && WRAPPERS(at.parent)) at = at.parent;
  return at;
}

/** The name a call's callee goes by (`foo` for `foo(...)` and `a.b.foo(...)`), or `call`. */
function calleeName(call) {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  return "call";
}

/** What a handed-on occurrence is used AS: `argument:<callee>`, `fallback[:<callee>]`, `spread`, `property:<name>`, ... */
function handoffUse(node) {
  const self = outermost(node);
  const parent = self.parent;
  const argumentOf = (expr) => {
    const p = outermost(expr).parent;
    return p && (ts.isCallExpression(p) || ts.isNewExpression(p)) && p.arguments?.includes(outermost(expr)) ? calleeName(p) : null;
  };
  if (ts.isConditionalExpression(parent) || (ts.isBinaryExpression(parent) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(parent.operatorToken.kind))) {
    const callee = argumentOf(parent);
    return callee ? `fallback:${callee}` : "fallback";
  }
  if (ts.isSpreadAssignment(parent) || ts.isSpreadElement(parent)) return "spread";
  const callee = argumentOf(self);
  if (callee) return `argument:${callee}`;
  if (ts.isPropertyAssignment(parent)) return `property:${parent.name.getText()}`;
  if (ts.isVariableDeclaration(parent)) return ts.isIdentifier(parent.name) ? "variable" : "rest";
  if (ts.isBindingElement(parent)) return "binding-default";
  if (ts.isReturnStatement(parent) || ts.isArrowFunction(parent)) return "return";
  if (ts.isJsxExpression(parent)) return "jsx";
  if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) return "assignment";
  return "other";
}

/**
 * The name of the code an occurrence sits in: the innermost NAMED function or method (an arrow or function
 * expression takes the name of the const or property it is assigned to; an anonymous callback is looked
 * through to whatever encloses it), else the module-level const it initializes, else the call an anonymous
 * callback is handed to (`clerkMiddleware()`), else `<module>`. Stable under
 * edits that move lines, which a line number is not.
 */
function scopeOf(node) {
  let topConst = null;
  let callback = null;
  for (let at = node.parent; at; at = at.parent) {
    if ((ts.isFunctionDeclaration(at) || ts.isMethodDeclaration(at) || ts.isGetAccessorDeclaration(at) || ts.isSetAccessorDeclaration(at)) && at.name) {
      return at.name.getText();
    }
    if (ts.isConstructorDeclaration(at)) return "constructor";
    if (ts.isFunctionExpression(at) || ts.isArrowFunction(at)) {
      if (at.name) return at.name.getText();
      const p = at.parent;
      if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
      if ((ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p)) && p.name) return p.name.getText();
      if (!callback && (ts.isCallExpression(p) || ts.isNewExpression(p))) callback = `${calleeName(p)}()`;
    }
    // A const at module level: `const X = ...` directly under the source file.
    if (ts.isVariableDeclaration(at) && ts.isIdentifier(at.name) && ts.isSourceFile(at.parent?.parent?.parent)) topConst = at.name.text;
  }
  return topConst ?? callback ?? "<module>";
}

/** The parameter, or parameter-bound name, a default belongs to. */
function defaultName(node) {
  const decl = node.parent;
  return ts.isIdentifier(decl.name) ? decl.name.text : "pattern";
}

/**
 * Every occurrence of `process.env` in a file, classified, as `{ line, kind, fingerprint, at }`. The
 * fingerprint is `<scope>:<use>` for a hand-off and `<scope>:default:<name>` for a parameter default: what
 * the lists pin, so replacing an approved occurrence with a new one elsewhere in the same file never passes.
 */
export function occurrences(path, source) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, /x$/.test(path) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out = [];
  const visit = (node) => {
    if (isProcessEnv(node)) {
      const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
      const kind = classify(node);
      const at = node.parent.getText(file).replace(/\s+/g, " ").slice(0, 80);
      const fingerprint = kind === "default" ? `${scopeOf(node)}:default:${defaultName(node)}` : kind === "handoff" ? `${scopeOf(node)}:${handoffUse(node)}` : null;
      out.push({ line, kind, fingerprint, at });
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

/** The findings for one file's source, as `{ line, why, fingerprint }`. Exported for the tests. */
export function switchReadsIn(path, source) {
  return occurrences(path, source)
    .filter((o) => o.kind === "handoff")
    .map((o) => ({ line: o.line, why: `hands on process.env (${o.at})`, fingerprint: o.fingerprint }));
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
/**
 * Compares the fingerprints `found` in one file against the ones its entry approves (`uses`, fingerprint to
 * count). Each fingerprint is held to its count exactly: an extra or unlisted one is `added`, a missing one
 * `removed` (an entry to shrink).
 */
function compare(path, found, uses, kind) {
  const counts = new Map();
  for (const o of found) counts.set(o.fingerprint, [...(counts.get(o.fingerprint) ?? []), o.line]);
  const out = [];
  for (const [fingerprint, lines] of counts) {
    const expected = uses[fingerprint] ?? 0;
    if (lines.length !== expected) out.push({ path, kind, fingerprint, expected, found: lines.length, lines });
  }
  for (const [fingerprint, expected] of Object.entries(uses)) {
    if (!counts.has(fingerprint)) out.push({ path, kind, fingerprint, expected, found: 0, lines: [] });
  }
  return out;
}

/**
 * Every finding under `root`'s `src`, and every listed fingerprint whose count no longer matches (`drift`).
 * A hand-off in an unlisted file is a finding; in a listed file, and for parameter defaults everywhere, each
 * fingerprint is held to its listed count, so the lists only shrink by being edited.
 */
export async function switchReadFindings(root, { allowed = ALLOWED, pending = PENDING, defaults = DEFAULTS_PENDING, dir = "src" } = {}) {
  const files = await walk(join(root, dir));
  const handoffs = new Map();
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
    const all = occurrences(path, source);
    const h = all.filter((o) => o.kind === "handoff");
    const d = all.filter((o) => o.kind === "default");
    if (h.length) handoffs.set(path, h);
    if (d.length) defaultsByPath.set(path, d);
  }
  const listed = new Map([...allowed, ...pending].map((e) => [e.path, e]));
  const findings = [];
  const drift = [];
  for (const [path, found] of handoffs) {
    const entry = listed.get(path);
    if (!entry) findings.push(...found.map((o) => ({ path, line: o.line, why: `hands on process.env (${o.at})`, fingerprint: o.fingerprint })));
    else drift.push(...compare(path, found, entry.uses, "handoff"));
  }
  for (const entry of listed.values()) if (!handoffs.has(entry.path)) drift.push(...compare(entry.path, [], entry.uses, "handoff"));
  for (const [path, found] of defaultsByPath) drift.push(...compare(path, found, defaults[path]?.uses ?? {}, "default"));
  for (const [path, entry] of Object.entries(defaults)) if (!defaultsByPath.has(path)) drift.push(...compare(path, [], entry.uses, "default"));
  return { files: read, findings, drift };
}
