// A `vi.mock` factory's RESULT is cached after its first success (Vitest 5, `ManualMockedModule.resolve` in
// @vitest/mocker), and `vi.resetModules` does not clear it; a throw or a rejection is not cached. So a factory
// that reads or writes test-mutable state EAGERLY, in its own body rather than inside a function it returns,
// sees only the value that state had the first time it ran: every later case gets the first case's mock, and the
// test passes without testing what it claims. Two shipped that way until #2693: card-modal-warm.test.tsx counted
// `loads` and awaited `gate` in the factory, and health/check.test.ts read `stub.initThrows` there.
//
// Test-mutable state, all of it declared at MODULE scope (a factory's own locals are not, so scope is resolved
// with the TypeScript binder rather than by name, and a local that shadows a module binding is the local):
//  - a `let`/`var` binding reassigned anywhere in the file (`=`, `+=`, `++`, a destructuring assignment);
//  - a property path of a module-scope object (a plain `const` or a `vi.hoisted` one) that is ASSIGNED anywhere
//    in the file (`x.p = …`, `x.p++`, `delete x.p`, `Object.assign(x.p, …)`, `vi.spyOn(x, "p")`). An eager read
//    of a path is a finding when an assigned path is a prefix of it (`stub.initThrows`, or `fx.run.status` when
//    `fx.run` is reassigned); reading the object above an assigned property hands over a reference and is not,
//    unless it is spread (`...fx.run` copies `fx.run.status` as it is now);
//  - `process.env` when the file mutates the environment (an assignment, `delete`, `Object.assign` or
//    `vi.stubEnv`): a read of a key the file mutates, or of the whole object.
//
// EAGER is the factory body, plus what it runs while it runs: an IIFE, a function declared in the file that the
// body calls, and a callback handed to `then`/`catch`/`finally` or a synchronous array method. Any other nested
// function is a mock implementation the factory hands back, and runs per call (lazy). Known gap: a class the
// factory instantiates, and a callback passed to anything off that list, are treated as lazy.
//
// A factory that only re-runs because it THROWS (not cached) is correct while it throws, and the binder cannot
// prove that. It carries `// mock-factory: rerun-on-throw <reason>` on the line above the `vi.mock`, naming why
// (one case per file, say). The annotation is checked too: one with no reason, on a factory with no eager
// `throw`, or suppressing nothing is itself a finding.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ts from "typescript";

/** Vitest's include (vitest.config.ts): `src/**\/*.test.{ts,tsx}` and `scripts/**\/*.test.mts`. */
const TEST_FILE = { src: /\.test\.tsx?$/, scripts: /\.test\.mts$/ };
const MAY_MOCK = /\bvi\s*\.\s*mock\s*\(/;
export const ANNOTATION = /\/\/\s*mock-factory:\s*rerun-on-throw\b[ \t]*(.*)$/m;
/** Methods that call a callback while the call is running, or once its promise settles: still one run per factory run. */
const EAGER_CALLBACKS = new Set(["then", "catch", "finally", "map", "flatMap", "forEach", "filter", "reduce", "some", "every", "find", "findIndex", "sort"]);
export const FIX_HINT = "read it inside a function the factory returns, or register the factory per case with vi.doMock";

const ANY = "*";

/** Peels the wrappers that do not change what an expression refers to. */
function unwrap(node) {
  let n = node;
  while (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isNonNullExpression(n) || ts.isTypeAssertionExpression(n) || ts.isSatisfiesExpression(n)) n = n.expression;
  return n;
}

/** `a.b["c"][k]` as its root identifier and segments (`["b", "c", "*"]`), or null when the root is not an identifier. */
function pathOf(node) {
  const segments = [];
  let n = unwrap(node);
  for (;;) {
    if (ts.isPropertyAccessExpression(n)) segments.unshift(n.name.text);
    else if (ts.isElementAccessExpression(n)) {
      const arg = n.argumentExpression;
      segments.unshift(ts.isStringLiteralLike(arg) || ts.isNumericLiteral(arg) ? arg.text : ANY);
    } else break;
    n = unwrap(n.expression);
  }
  return ts.isIdentifier(n) ? { root: n, segments } : null;
}

/** True when `prefix` names `path` or an object above it, `*` matching any one segment. */
function isPrefix(prefix, path) {
  return prefix.length <= path.length && prefix.every((s, i) => s === ANY || path[i] === ANY || s === path[i]);
}

const render = (name, segments) => [name, ...segments.map((s) => (s === ANY ? "[…]" : s))].join(".");
const isAssignment = (kind) => kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;
const isVi = (node, method) => ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === method && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "vi";

/**
 * The module-scope variable declaration an identifier refers to, or null: a parameter, a local, an import, a function
 * or anything declared in another file is not test-mutable state for this check.
 */
function moduleBinding(checker, sf, id) {
  const symbol = ts.isShorthandPropertyAssignment(id.parent) && id.parent.name === id
    ? checker.getShorthandAssignmentValueSymbol(id.parent)
    : checker.getSymbolAtLocation(id);
  const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
  if (!declaration || declaration.getSourceFile() !== sf) return null;
  let v = declaration;
  while (ts.isBindingElement(v) || ts.isObjectBindingPattern(v) || ts.isArrayBindingPattern(v)) v = v.parent;
  if (!ts.isVariableDeclaration(v)) return null;
  const statement = v.parent?.parent;
  return statement && ts.isVariableStatement(statement) && statement.parent === sf ? declaration : null;
}

/** True when the identifier is `process` with no declaration of its own in this file (the global). */
function isGlobalProcess(checker, sf, id) {
  if (id.text !== "process") return false;
  const symbol = checker.getSymbolAtLocation(id);
  return !symbol?.declarations?.some((d) => d.getSourceFile() === sf);
}

/** Every mutation in the file: reassigned module bindings, assigned module paths, and the env keys it changes. */
function mutationsOf(checker, sf) {
  const reassigned = new Set();
  const assigned = new Map(); // declaration -> segments[][]
  const envKeys = new Set();
  const addPath = (node, extra = []) => {
    const path = pathOf(node);
    if (!path) return;
    const segments = [...path.segments, ...extra];
    if (isGlobalProcess(checker, sf, path.root) && segments[0] === "env") {
      envKeys.add(segments[1] ?? ANY);
      return;
    }
    const declaration = moduleBinding(checker, sf, path.root);
    if (!declaration) return;
    if (segments.length === 0) reassigned.add(declaration);
    else assigned.set(declaration, [...(assigned.get(declaration) ?? []), segments]);
  };
  const addTarget = (target) => {
    const t = unwrap(target);
    if (ts.isObjectLiteralExpression(t)) {
      for (const p of t.properties) {
        if (ts.isPropertyAssignment(p)) addTarget(p.initializer);
        else if (ts.isShorthandPropertyAssignment(p)) addPath(p.name);
        else if (ts.isSpreadAssignment(p)) addTarget(p.expression);
      }
    } else if (ts.isArrayLiteralExpression(t)) {
      for (const e of t.elements) addTarget(ts.isSpreadElement(e) ? e.expression : e);
    } else if (ts.isBinaryExpression(t) && t.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      addTarget(t.left); // a default in a destructuring target: `[a = 1] = …`
    } else addPath(t);
  };
  const visit = (node) => {
    if (ts.isBinaryExpression(node) && isAssignment(node.operatorToken.kind)) addTarget(node.left);
    else if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)) addTarget(node.operand);
    else if (ts.isDeleteExpression(node)) addTarget(node.expression);
    else if ((ts.isForOfStatement(node) || ts.isForInStatement(node)) && !ts.isVariableDeclarationList(node.initializer)) addTarget(node.initializer);
    else if (isVi(node, "stubEnv")) {
      const key = node.arguments[0];
      envKeys.add(key && ts.isStringLiteralLike(key) ? key.text : ANY);
    } else if (isVi(node, "spyOn") && node.arguments.length >= 2) {
      const key = node.arguments[1];
      addPath(node.arguments[0], [ts.isStringLiteralLike(key) ? key.text : ANY]);
    } else if (ts.isCallExpression(node) && node.arguments.length > 0 && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === "assign" && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "Object") {
      addPath(node.arguments[0], [ANY]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { reassigned, assigned, envKeys };
}

/** The function a call runs, when it is declared in this file: a function declaration, or a variable holding an arrow or function expression. */
function calledFunction(checker, sf, callee) {
  const c = unwrap(callee);
  if (ts.isFunctionExpression(c) || ts.isArrowFunction(c)) return c; // an IIFE
  if (!ts.isIdentifier(c)) return null;
  const declaration = checker.getSymbolAtLocation(c)?.valueDeclaration;
  if (!declaration || declaration.getSourceFile() !== sf) return null;
  if (ts.isFunctionDeclaration(declaration) && declaration.body) return declaration;
  if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
    const init = unwrap(declaration.initializer);
    if (ts.isFunctionExpression(init) || ts.isArrowFunction(init)) return init;
  }
  return null;
}

/** True when a nested function runs while the factory runs: a callback handed to `then`/`catch`/`finally` or a synchronous array method. */
function isEagerCallback(fn) {
  let child = fn;
  let parent = fn.parent;
  while (ts.isParenthesizedExpression(parent)) { child = parent; parent = parent.parent; }
  return ts.isCallExpression(parent) && parent.arguments.includes(child)
    && ts.isPropertyAccessExpression(parent.expression) && EAGER_CALLBACKS.has(parent.expression.name.text);
}

/** Calls `visit` on every node the factory evaluates while it runs (see the header for what counts). */
function walkEager(checker, sf, factory, visit) {
  const entered = new Set([factory]);
  const queue = [factory.body];
  const enter = (fn) => {
    if (fn && fn.body && !entered.has(fn)) { entered.add(fn); queue.push(fn.body); }
  };
  const step = (node) => {
    if (ts.isFunctionLike(node)) {
      if (isEagerCallback(node)) enter(node);
      return; // otherwise lazy: an IIFE or a called local is entered from its call
    }
    if (ts.isClassLike(node)) return;
    visit(node);
    if (ts.isCallExpression(node)) enter(calledFunction(checker, sf, node.expression));
    ts.forEachChild(node, step);
  };
  while (queue.length > 0) step(queue.pop());
}

/** The outermost expression of a property chain starting at `id` (`id.a.b`), through wrappers. */
function chainTop(id) {
  let n = id;
  for (;;) {
    const p = n.parent;
    if ((ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) && p.expression === n) n = p;
    else if ((ts.isParenthesizedExpression(p) || ts.isAsExpression(p) || ts.isNonNullExpression(p) || ts.isSatisfiesExpression(p)) && p.expression === n) n = p;
    else return n;
  }
}

/** True when the identifier is in a position that names a value, not a property or a declaration's own name. */
function isReference(id) {
  const p = id.parent;
  if ((ts.isPropertyAccessExpression(p) || ts.isPropertyAssignment(p) || ts.isMethodDeclaration(p) || ts.isPropertyDeclaration(p) || ts.isPropertySignature(p)) && p.name === id) return false;
  if ((ts.isVariableDeclaration(p) || ts.isBindingElement(p) || ts.isParameter(p) || ts.isFunctionDeclaration(p)) && p.name === id) return false;
  if (ts.isBindingElement(p) && p.propertyName === id) return false;
  return !ts.isTypeReferenceNode(p) && !ts.isQualifiedName(p) && !ts.isTypeQueryNode(p);
}

/** The test-mutable state one factory touches eagerly, and whether it throws while it runs. */
function factoryHits(checker, sf, factory, mutations) {
  const hits = new Map(); // name -> line
  let throws = false;
  const hit = (name, node) => {
    if (!hits.has(name)) hits.set(name, sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1);
  };
  walkEager(checker, sf, factory, (node) => {
    if (ts.isThrowStatement(node)) throws = true;
    if (!ts.isIdentifier(node) || !isReference(node)) return;
    const top = chainTop(node);
    const read = pathOf(top);
    if (!read || read.root !== node) return;
    const spread = ts.isSpreadAssignment(top.parent) || ts.isSpreadElement(top.parent);
    if (isGlobalProcess(checker, sf, node) && read.segments[0] === "env" && mutations.envKeys.size > 0) {
      const key = read.segments[1];
      if (key === undefined || key === ANY || mutations.envKeys.has(key) || mutations.envKeys.has(ANY)) hit(render("process", read.segments.slice(0, 2)), node);
      return;
    }
    const declaration = moduleBinding(checker, sf, node);
    if (!declaration) return;
    if (mutations.reassigned.has(declaration)) { hit(node.text, node); return; }
    for (const assigned of mutations.assigned.get(declaration) ?? []) {
      if (isPrefix(assigned, read.segments)) hit(render(node.text, read.segments), node);
      else if (spread && isPrefix(read.segments, assigned)) hit(render(node.text, assigned), node);
    }
  });
  return { hits, throws };
}

/** The `// mock-factory: rerun-on-throw <reason>` annotation in the comments directly above a statement, or null. */
function annotationOf(sf, statement) {
  for (const range of ts.getLeadingCommentRanges(sf.text, statement.pos) ?? []) {
    const match = ANNOTATION.exec(sf.text.slice(range.pos, range.end));
    if (match) return { reason: match[1].trim() };
  }
  return null;
}

/**
 * Findings across a tree. `files` maps a path to its source (tests pass fixtures); omitted, it reads Vitest's test
 * files under `<root>/src` and `<root>/scripts`.
 * @param {string} [root]
 * @param {Map<string, string> | null} [files]
 * @returns {{ files: number, annotated: number, findings: { path: string, line: number, name: string, why: string }[] }}
 */
export function mockFactoryFindings(root = process.cwd(), files = null) {
  const sources = files ?? readTests(root);
  const candidates = new Map([...sources].filter(([, source]) => MAY_MOCK.test(source)));
  const options = { noLib: true, noResolve: true, types: [], noEmit: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.Latest, module: ts.ModuleKind.ESNext };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (name, languageVersion) => {
    const text = candidates.get(name);
    return text === undefined ? undefined : ts.createSourceFile(name, text, languageVersion, true);
  };
  host.fileExists = (name) => candidates.has(name);
  host.readFile = (name) => candidates.get(name);
  const program = ts.createProgram({ rootNames: [...candidates.keys()], options, host });
  const checker = program.getTypeChecker();

  const findings = [];
  let annotated = 0;
  for (const [file] of candidates) {
    const sf = program.getSourceFile(file);
    if (!sf) continue;
    const path = relative(root, file).split(sep).join("/");
    const mutations = mutationsOf(checker, sf);
    const visit = (node) => {
      if (isVi(node, "mock") && node.arguments[1] && (ts.isArrowFunction(node.arguments[1]) || ts.isFunctionExpression(node.arguments[1]))) {
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
        const target = node.arguments[0].getText(sf);
        const { hits, throws } = factoryHits(checker, sf, node.arguments[1], mutations);
        let statement = node;
        while (statement.parent && !ts.isStatement(statement)) statement = statement.parent;
        const annotation = annotationOf(sf, statement);
        if (annotation) {
          annotated += 1;
          const name = "mock-factory: rerun-on-throw";
          if (!annotation.reason) findings.push({ path, line, name, why: `the annotation on vi.mock(${target}) names no reason; say why the factory only re-runs while it throws` });
          else if (!throws) findings.push({ path, line, name, why: `vi.mock(${target}) is annotated rerun-on-throw but its factory never throws while it runs; the annotation cannot apply` });
          else if (hits.size === 0) findings.push({ path, line, name, why: `the annotation on vi.mock(${target}) suppresses nothing; remove it` });
        } else {
          for (const [name, at] of hits) {
            findings.push({ path, line: at, name, why: `vi.mock(${target}) factory touches it as it runs, and Vitest caches its first result past vi.resetModules, so later cases see the first value. Fix: ${FIX_HINT}` });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  findings.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
  return { files: candidates.size, annotated, findings };
}

function readTests(root) {
  const out = new Map();
  const walk = (dir, pattern) => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full, pattern);
      else if (pattern.test(entry)) out.set(full, readFileSync(full, "utf8"));
    }
  };
  for (const [dir, pattern] of Object.entries(TEST_FILE)) walk(join(root, dir), pattern);
  return out;
}
