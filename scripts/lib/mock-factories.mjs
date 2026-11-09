// A `vi.mock` factory's RESULT is cached after its first success (Vitest 5, `ManualMockedModule.resolve` in
// @vitest/mocker), and `vi.resetModules` does not clear it; a throw or a rejection is not cached. So a factory
// that reads or writes test-mutable state EAGERLY, in its own body rather than inside a function it returns,
// sees only the value that state had the first time it ran: every later case gets the first case's mock, and the
// test passes without testing what it claims. Two shipped that way until #2693: card-modal-warm.test.tsx counted
// `loads` and awaited `gate` in the factory, and health/check.test.ts read `stub.initThrows` there.
//
// Test-mutable state, all of it rooted at MODULE scope (a factory's own locals are not, so scope is resolved with
// the TypeScript binder rather than by name, and a local that shadows a module binding is the local). A `const`
// alias or destructuring (`const s = stub`, `const { x } = stub`), at module scope or inside the factory, maps back
// to the binding it names, so `s.x` is `stub.x`.
//  - a `let`/`var` binding reassigned anywhere in the file (`=`, `+=`, `++`, a destructuring assignment);
//  - a property path of a module-scope object (a plain `const` or a `vi.hoisted` one) WRITTEN anywhere in the file:
//    `x.p = …`, `x.p++`, `delete x.p`, `Object.assign(x.p, …)`, `Reflect.set`, `Object.defineProperty`,
//    `vi.spyOn(x, "p")`, or a mutating method on it (`push`, `splice`, `set`, `add`, `clear`, `mockReturnValue`,
//    `mockImplementation`, `mockReset`, …), which writes what is INSIDE `x.p`;
//  - `process.env` when the file mutates the environment (assignment, `delete`, `Object.assign`, `vi.stubEnv`).
// A read is a finding when a written path is a prefix of it (`stub.initThrows`, or `fx.run.status` when `fx.run`
// is reassigned). Reading the object ABOVE a written property hands over a reference and is not, unless the read
// takes the whole object's contents: a spread, `Object.entries/keys/values`, an `Object.assign` source,
// `JSON.stringify`, `structuredClone`, a `for…of`/`for…in`, or a call of it (`m.rows()` answers what the case
// last set).
//
// EAGER is the factory body, plus what it runs while it runs: an IIFE, a `new Promise` executor, a function
// declared in the file that the body calls, and a callback handed to `then`/`catch`/`finally` or a synchronous
// array method. Any other nested function is a mock implementation the factory hands back, and runs per call.
//
// Known limits: a getter on a module object (`get x() { return state }`) read eagerly is a read of a path nothing
// assigns; state imported from another module; state on `globalThis` or stubbed with `vi.stubGlobal`; a class the
// factory instantiates; a callback handed to anything off the list above. None is seen.
//
// Two annotations, on the line(s) above the `vi.mock`, each naming the variable it covers and a reason. Each is
// CHECKED, not trusted, and covers only hits on its variable (`stub` covers `stub.x`; `stub.x` does not cover
// `stub.y`). One with no variable, no reason, or that covers no hit is itself a finding.
//  - `// mock-factory: rerun-on-throw <name> <reason>`: the factory re-runs only because it throws (not cached).
//    Valid when the factory throws as it runs and the file has exactly one test case: with a second case, a run
//    after the cached success would need to throw again and cannot (use vi.doMock per case instead).
//  - `// mock-factory: set-once <name> <reason>`: the variable is written once before the factory first runs and
//    never varies. Valid when every write to it is at module scope or inside a `beforeAll`, never in a
//    `beforeEach`, a case, an `afterEach` or any other function (the factory's own writes included). The reason
//    must cover load order: a static import of the mocked module runs the factory before any `beforeAll`.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ts from "typescript";

/** Vitest's include (vitest.config.ts): `src/**\/*.test.{ts,tsx}` and `scripts/**\/*.test.mts`. */
const TEST_FILE = { src: /\.test\.tsx?$/, scripts: /\.test\.mts$/ };
const MAY_MOCK = /\bvi\s*\.\s*mock\s*\(/;
export const ANNOTATION = /\/\/\s*mock-factory:[ \t]*(\S*)[ \t]*(\S*)[ \t]*(.*)$/m;
const KINDS = new Set(["rerun-on-throw", "set-once"]);
/** Methods that call a callback while the call is running, or once its promise settles: still one run per factory run. */
const EAGER_CALLBACKS = new Set(["then", "catch", "finally", "map", "flatMap", "forEach", "filter", "reduce", "some", "every", "find", "findIndex", "sort"]);
/** Methods that change what is inside their receiver. A Vitest mock's `mock…` methods change what it answers. */
const MUTATORS = new Set(["push", "pop", "shift", "unshift", "splice", "set", "delete", "add", "clear", "sort", "reverse", "fill", "withImplementation"]);
const isMutator = (name) => MUTATORS.has(name) || /^mock[A-Z]/.test(name);
/** `Object.x(…)`, `JSON.x(…)` and globals whose argument is read whole: every path under it. */
const WHOLE_READS = new Set(["Object.entries", "Object.keys", "Object.values", "Object.fromEntries", "JSON.stringify", "structuredClone"]);
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
    else if (ts.isElementAccessExpression(n)) segments.unshift(keyOf(n.argumentExpression));
    else break;
    n = unwrap(n.expression);
  }
  return ts.isIdentifier(n) ? { root: n, segments } : null;
}

const keyOf = (node) => (node && (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) ? node.text : ANY);

/** True when `prefix` names `path` or an object above it, `*` matching any one segment. */
function isPrefix(prefix, path) {
  return prefix.length <= path.length && prefix.every((s, i) => s === ANY || path[i] === ANY || s === path[i]);
}

const render = (name, segments) => [name, ...segments.map((s) => (s === ANY ? "[…]" : s))].join(".");
const isAssignment = (kind) => kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;
const isVi = (node, method) => ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === method && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "vi";
/** `Object.assign` and the like as text, for a callee that is a global's property or a bare global. */
const calleeName = (call) => {
  const c = unwrap(call.expression);
  if (ts.isIdentifier(c)) return c.text;
  return ts.isPropertyAccessExpression(c) && ts.isIdentifier(c.expression) ? `${c.expression.text}.${c.name.text}` : null;
};
const lineOf = (sf, node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

function declarationOf(checker, id) {
  const symbol = ts.isShorthandPropertyAssignment(id.parent) && id.parent.name === id
    ? checker.getShorthandAssignmentValueSymbol(id.parent)
    : checker.getSymbolAtLocation(id);
  return symbol?.valueDeclaration ?? symbol?.declarations?.[0];
}

/** The variable declaration a binding name sits in, and the property path from its initializer to the binding. */
function bindingPath(declaration) {
  const segments = [];
  let v = declaration;
  while (ts.isBindingElement(v)) {
    const pattern = v.parent;
    if (ts.isObjectBindingPattern(pattern)) {
      if (!v.dotDotDotToken) {
        const key = v.propertyName ?? v.name;
        segments.unshift(ts.isIdentifier(key) || ts.isStringLiteralLike(key) || ts.isNumericLiteral(key) ? key.text : ANY);
      }
    } else if (!v.dotDotDotToken) segments.unshift(String(pattern.elements.indexOf(v)));
    v = pattern.parent;
  }
  return ts.isVariableDeclaration(v) ? { variable: v, segments } : null;
}

const isModuleScope = (sf, variable) => {
  const statement = variable.parent?.parent;
  return !!statement && ts.isVariableStatement(statement) && statement.parent === sf;
};

/** True when the identifier is `process` with no declaration of its own in this file (the global). */
function isGlobalProcess(checker, sf, id) {
  if (id.text !== "process") return false;
  const symbol = checker.getSymbolAtLocation(id);
  return !symbol?.declarations?.some((d) => d.getSourceFile() === sf);
}

/**
 * What an expression names: `{ env, key }` for `process.env[.key]`, `{ declaration, name, segments }` for a path under
 * a module-scope binding (through any `const` alias or destructuring), or null for anything local or foreign.
 */
function canonical(checker, sf, node, depth = 0) {
  const path = pathOf(node);
  if (!path || depth > 16) return null;
  if (isGlobalProcess(checker, sf, path.root)) return path.segments[0] === "env" ? { env: true, key: path.segments[1] } : null;
  const declaration = declarationOf(checker, path.root);
  if (!declaration || declaration.getSourceFile() !== sf) return null;
  const bound = bindingPath(declaration);
  if (!bound) return null;
  const { variable, segments } = bound;
  const isConst = (ts.getCombinedNodeFlags(variable) & ts.NodeFlags.Const) !== 0;
  if (isConst && variable.initializer) {
    const base = canonical(checker, sf, variable.initializer, depth + 1);
    if (base?.env) return segments.length === 0 && base.key === undefined ? { env: true, key: path.segments[0] } : base;
    if (base) return { ...base, segments: [...base.segments, ...segments, ...path.segments] };
  }
  if (!isModuleScope(sf, variable)) return null;
  return { declaration, name: path.root.text, segments: path.segments };
}

/** Every write in the file, with where it happens, and the env keys it changes. */
function mutationsOf(checker, sf) {
  const writes = []; // { declaration, name, segments, node }
  const envKeys = new Set();
  const addPath = (node, extra, site) => {
    const target = canonical(checker, sf, node);
    if (!target) return;
    if (target.env) {
      envKeys.add(target.key ?? (extra[0] === undefined || extra[0] === ANY ? ANY : extra[0]));
      return;
    }
    writes.push({ declaration: target.declaration, name: target.name, segments: [...target.segments, ...extra], node: site });
  };
  const addTarget = (target, site) => {
    const t = unwrap(target);
    if (ts.isObjectLiteralExpression(t)) {
      for (const p of t.properties) {
        if (ts.isPropertyAssignment(p)) addTarget(p.initializer, site);
        else if (ts.isShorthandPropertyAssignment(p)) addPath(p.name, [], site);
        else if (ts.isSpreadAssignment(p)) addTarget(p.expression, site);
      }
    } else if (ts.isArrayLiteralExpression(t)) {
      for (const e of t.elements) addTarget(ts.isSpreadElement(e) ? e.expression : e, site);
    } else if (ts.isBinaryExpression(t) && t.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      addTarget(t.left, site); // a default in a destructuring target: `[a = 1] = …`
    } else addPath(t, [], site);
  };
  const visit = (node) => {
    if (ts.isBinaryExpression(node) && isAssignment(node.operatorToken.kind)) addTarget(node.left, node);
    else if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)) addTarget(node.operand, node);
    else if (ts.isDeleteExpression(node)) addTarget(node.expression, node);
    else if ((ts.isForOfStatement(node) || ts.isForInStatement(node)) && !ts.isVariableDeclarationList(node.initializer)) addTarget(node.initializer, node);
    else if (isVi(node, "stubEnv")) envKeys.add(keyOf(node.arguments[0]));
    else if (isVi(node, "spyOn") && node.arguments.length >= 2) addPath(node.arguments[0], [keyOf(node.arguments[1])], node);
    else if (ts.isCallExpression(node)) {
      const name = calleeName(node);
      if (name === "Object.assign" && node.arguments.length > 0) addPath(node.arguments[0], [ANY], node);
      else if ((name === "Reflect.set" || name === "Reflect.deleteProperty" || name === "Object.defineProperty") && node.arguments.length >= 2) addPath(node.arguments[0], [keyOf(node.arguments[1])], node);
      else {
        const callee = unwrap(node.expression);
        if (ts.isPropertyAccessExpression(callee) && isMutator(callee.name.text)) addPath(callee.expression, [ANY], node);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { writes, envKeys };
}

/** A function declared in this file that `node` names: a function declaration, or a variable holding an arrow or function expression. */
function functionAt(checker, sf, node) {
  const c = unwrap(node);
  if (ts.isFunctionExpression(c) || ts.isArrowFunction(c)) return c;
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

/** True when a nested function runs while the factory runs: a `new Promise` executor, or a callback to `then` or a synchronous array method. */
function isEagerCallback(fn) {
  let child = fn;
  let parent = fn.parent;
  while (ts.isParenthesizedExpression(parent)) { child = parent; parent = parent.parent; }
  if (ts.isNewExpression(parent) && parent.arguments?.[0] === child && ts.isIdentifier(parent.expression) && parent.expression.text === "Promise") return true;
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
      return; // otherwise lazy: an IIFE or a called function is entered from its call
    }
    if (ts.isClassLike(node)) return;
    visit(node);
    if (ts.isCallExpression(node)) enter(functionAt(checker, sf, node.expression));
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

/** Each name a binding pattern binds, as its path under the initializer; a rest element reads the rest whole. */
function leavesOf(pattern, prefix = []) {
  const out = [];
  pattern.elements.forEach((element, index) => {
    if (ts.isOmittedExpression(element)) return;
    if (element.dotDotDotToken) { out.push({ segments: prefix, whole: true }); return; }
    const key = ts.isObjectBindingPattern(pattern) ? element.propertyName ?? element.name : null;
    const segment = key === null ? String(index) : ts.isIdentifier(key) || ts.isStringLiteralLike(key) || ts.isNumericLiteral(key) ? key.text : ANY;
    if (ts.isIdentifier(element.name)) out.push({ segments: [...prefix, segment], whole: false });
    else out.push(...leavesOf(element.name, [...prefix, segment]));
  });
  return out;
}

/** True when the expression's whole contents are read: spread, iterated, called, or handed to a reader of every key. */
function readsWhole(top) {
  const p = top.parent;
  if (ts.isSpreadAssignment(p) || ts.isSpreadElement(p)) return true;
  if ((ts.isForOfStatement(p) || ts.isForInStatement(p)) && p.expression === top) return true;
  if (!ts.isCallExpression(p)) return false;
  if (p.expression === top) return true;
  const name = calleeName(p);
  return WHOLE_READS.has(name) || (name === "Object.assign" && p.arguments.indexOf(top) > 0);
}

/** The test-mutable state one factory touches eagerly, and whether it throws while it runs. */
function factoryHits(checker, sf, factory, mutations) {
  const hits = new Map(); // name -> line
  let throws = false;
  const hit = (name, node) => {
    if (!hits.has(name)) hits.set(name, lineOf(sf, node));
  };
  /** A read of `segments` under a module binding is a hit when a write can change what it read. */
  const check = (target, segments, whole, node) => {
    for (const write of mutations.writes) {
      if (write.declaration !== target.declaration) continue;
      if (write.segments.length === 0) hit(target.name, node);
      else if (isPrefix(write.segments, segments)) hit(render(target.name, segments), node);
      else if (whole && isPrefix(segments, write.segments)) hit(render(target.name, write.segments.includes(ANY) ? segments : write.segments), node);
    }
  };
  walkEager(checker, sf, factory, (node) => {
    if (ts.isThrowStatement(node)) throws = true;
    if (!ts.isIdentifier(node) || !isReference(node)) return;
    const top = chainTop(node);
    const read = pathOf(top);
    if (!read || read.root !== node) return;
    const target = canonical(checker, sf, top);
    if (!target) return;
    // Destructuring (`const { x } = stub`) reads each bound path NOW, though its uses may sit in a lazy closure.
    const declared = top.parent;
    if (!target.env && ts.isVariableDeclaration(declared) && declared.initializer === top && !ts.isIdentifier(declared.name)) {
      for (const leaf of leavesOf(declared.name)) check(target, [...target.segments, ...leaf.segments], leaf.whole, node);
      return;
    }
    let { segments } = target;
    const whole = readsWhole(top);
    // `x.p.push(…)` in the factory writes inside `x.p`: report `x.p`, matched as a whole read.
    if (whole && segments.length > 0 && ts.isCallExpression(top.parent) && top.parent.expression === top && isMutator(segments[segments.length - 1])) segments = segments.slice(0, -1);
    if (target.env) {
      if (mutations.envKeys.size === 0) return;
      const key = target.key;
      if (key === undefined || key === ANY || mutations.envKeys.has(key) || mutations.envKeys.has(ANY)) hit(render("process.env", key === undefined ? [] : [key]), node);
      return;
    }
    check(target, segments, whole, node);
  });
  return { hits, throws };
}

/** Every `// mock-factory: <kind> <name> <reason>` annotation in the comments directly above a statement. */
function annotationsOf(sf, statement) {
  const out = [];
  for (const range of ts.getLeadingCommentRanges(sf.text, statement.pos) ?? []) {
    const match = ANNOTATION.exec(sf.text.slice(range.pos, range.end));
    if (match) out.push({ kind: match[1], name: match[2], reason: match[3].trim() });
  }
  return out;
}

/** True when a hit's name falls under an annotation's variable: `stub` covers `stub.x`, `stub.x` covers `stub.x.y`. */
const covers = (name, hit) => hit === name || hit.startsWith(`${name}.`);
/** True when a write to `write` can change `name`: one is a path prefix of the other. */
function touches(name, write) {
  const [root, ...segments] = name.split(".");
  return root === write.name && (isPrefix(segments, write.segments) || isPrefix(write.segments, segments));
}

/** How many test cases the file declares: each `it`/`test` call, an `.each`/`.for` table counting as several. */
function caseCount(sf) {
  let count = 0;
  const rootOf = (n) => {
    let c = unwrap(n);
    let table = false;
    for (;;) {
      if (ts.isCallExpression(c)) c = unwrap(c.expression);
      else if (ts.isPropertyAccessExpression(c)) { if (c.name.text === "each" || c.name.text === "for") table = true; c = unwrap(c.expression); }
      else break;
    }
    return { root: ts.isIdentifier(c) ? c.text : null, table };
  };
  const visit = (node) => {
    if (ts.isCallExpression(node) && !(ts.isCallExpression(node.parent) && node.parent.expression === node)) {
      const { root, table } = rootOf(node.expression);
      if (root === "it" || root === "test") count += table ? 2 : 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return count;
}

/** Where a write runs: null when at module scope or in a `beforeAll` (a `describe` or `vi.hoisted` body is load time), else what it is in. */
function varyingSite(node) {
  for (let n = node.parent; n; n = n.parent) {
    if (!ts.isFunctionLike(n)) continue;
    let child = n;
    let call = n.parent;
    while (ts.isParenthesizedExpression(call)) { child = call; call = call.parent; }
    if (!ts.isCallExpression(call) || !call.arguments.includes(child)) return "a function";
    const callee = unwrap(call.expression);
    const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.getText() : "";
    if (name === "beforeAll") return null;
    if (name === "vi.hoisted" || name === "describe" || /^describe\.(only|skip|concurrent|sequential)$/.test(name)) continue;
    return name ? `${name}(…)` : "a function";
  }
  return null;
}

/** The factory function a `vi.mock` call registers: inline (through `as`/`satisfies`/parentheses) or named. */
const factoryOf = (checker, sf, call) => (call.arguments[1] ? functionAt(checker, sf, call.arguments[1]) : null);

/**
 * Findings across a tree. `files` maps a path to its source (tests pass fixtures); omitted, it reads Vitest's test
 * files under `<root>/src` and `<root>/scripts`.
 * @param {string} [root]
 * @param {Map<string, string> | null} [files]
 * @returns {{ files: number, mocking: number, annotated: number, findings: { path: string, line: number, name: string, why: string }[] }}
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
    let cases = null;
    const visit = (node) => {
      const factory = isVi(node, "mock") ? factoryOf(checker, sf, node) : null;
      if (factory) {
        const line = lineOf(sf, node);
        const target = node.arguments[0].getText(sf);
        const { hits, throws } = factoryHits(checker, sf, factory, mutations);
        let statement = node;
        while (statement.parent && !ts.isStatement(statement)) statement = statement.parent;
        const covered = new Set();
        for (const { kind, name, reason } of annotationsOf(sf, statement)) {
          annotated += 1;
          const label = `mock-factory: ${kind || "(none)"}`;
          const fail = (why) => findings.push({ path, line, name: label, why: `the annotation on vi.mock(${target}) ${why}` });
          if (!KINDS.has(kind)) { fail(`is not one of: ${[...KINDS].join(", ")}`); continue; }
          if (!name) { fail("names no variable; write `// mock-factory: " + kind + " <name> <reason>`"); continue; }
          if (!reason) { fail(`names no reason for ${name}`); continue; }
          const mine = [...hits.keys()].filter((h) => covers(name, h));
          if (mine.length === 0) { fail(`covers ${name}, which the factory does not touch as it runs; remove it`); continue; }
          if (kind === "rerun-on-throw") {
            cases ??= caseCount(sf);
            if (!throws) { fail(`is rerun-on-throw but the factory never throws as it runs`); continue; }
            if (cases !== 1) { fail(`is rerun-on-throw in a file with ${cases} test cases: after the cached success no later case can make it throw again. Register the factory per case with vi.doMock`); continue; }
          } else {
            const varying = mutations.writes.filter((w) => touches(name, w)).map((w) => ({ w, site: varyingSite(w.node) })).filter((x) => x.site);
            if (varying.length > 0) {
              const { w, site } = varying[0];
              fail(`is set-once but ${name} is written at line ${lineOf(sf, w.node)} inside ${site}; set-once allows writes only at module scope or in beforeAll`);
              continue;
            }
          }
          for (const h of mine) covered.add(h);
        }
        for (const [name, at] of hits) {
          if (covered.has(name)) continue;
          findings.push({ path, line: at, name, why: `vi.mock(${target}) factory touches it as it runs, and Vitest caches its first result past vi.resetModules, so later cases see the first value. Fix: ${FIX_HINT}` });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  findings.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
  return { files: sources.size, mocking: candidates.size, annotated, findings };
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
