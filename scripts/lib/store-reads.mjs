// The store-reads inventory (store choice, design #3200): every call under `src/` to a read that takes the reader's
// store must pass one. A read whose `store` parameter is optional or defaults to Mana Pool still compiles when a call
// leaves it out, and silently prices a reader who chose another store in Mana Pool: totals from two stores on one
// page, or a figure that disagrees with the Shopping list. TypeScript cannot see that; this does.
//
// Type-aware: the program is built over `src/`. Every function declared there (a function declaration, or a `const`
// holding an arrow or function expression) with a positional parameter named `store` that is optional or has a default
// is guarded, so a wrapper that defaults its own store (`loadShoppingRollup`, `loadCollectionList`) is held as tightly
// as the price read under it. Each call is resolved to its declaration through import aliases, namespaces, the `@/`
// path, re-exports, parentheses and string element access, and judged at that declaration's own `store` position: a
// call with no argument there, or one whose argument's type admits `undefined`, is a finding. A guarded function
// referenced any other way (passed on, aliased, `.call`) cannot be judged and is a finding too. A store inside an
// options object is not read: those loaders take a required `store` field, which TypeScript already enforces.
//
// Calls not yet given a store are named in `store-reads-pending.mjs` by file, enclosing function and count. Each slice
// of the store work deletes its own entries; an entry whose count no longer matches is a finding, so a new call in a
// pending function fails, and the list only shrinks. Scripts (the signed-out landing demo's exporter among them, which
// stays Mana Pool) are outside `src/` and not read.
import { join, relative, sep } from "node:path";
import ts from "typescript";
import { PENDING } from "./store-reads-pending.mjs";

/** Reads that must be found and guarded: if one is renamed, moved or loses its default, the check fails rather than going quiet. */
export const ANCHORS = [
  { file: "src/lib/decks/price-query.ts", name: "loadPrices" },
  { file: "src/lib/discovery/price.ts", name: "loadPrices" },
  { file: "src/lib/decks/shopping-rollup.ts", name: "readBuyRowPrices" },
  { file: "src/lib/cards/prices.ts", name: "loadOwnedPrintingPrices" },
  { file: "src/lib/cards/opening-printing.ts", name: "loadOpeningArt" },
];

const isTest = (path) => /\.test\.(ts|tsx|mts)$/.test(path) || path.includes("/__tests__/");

/** The program over `root`'s tsconfig, its root files narrowed to `src/` (and ambient `.d.ts` files). */
function programFor(root) {
  const read = ts.readConfigFile(join(root, "tsconfig.json"), ts.sys.readFile);
  if (read.error) throw new Error(ts.flattenDiagnosticMessageText(read.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, root);
  const rel = (f) => relative(root, f).split(sep).join("/");
  const rootNames = parsed.fileNames.filter((f) => rel(f).startsWith("src/") || f.endsWith(".d.ts"));
  if (!rootNames.some((f) => rel(f).startsWith("src/"))) throw new Error(`no source files under ${join(root, "src")}`);
  return { program: ts.createProgram({ rootNames, options: { ...parsed.options, noEmit: true } }), rel };
}

/** The function node a declaration names, when it is one: a function declaration or a `const` holding a function. */
function functionOf(decl) {
  if (ts.isFunctionDeclaration(decl)) return decl;
  if (ts.isVariableDeclaration(decl) && decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) return decl.initializer;
  return null;
}

/**
 * The index of a function's optional or defaulted positional `store` parameter that holds a reader's store (typed
 * `Store`, or defaulted to a store's name), or -1. A `store` that is a database seam (`reverseCharge`'s) is not one.
 */
function storeIndex(fn) {
  return fn.parameters.findIndex((p) => {
    if (!ts.isIdentifier(p.name) || p.name.text !== "store") return false;
    if (p.initializer === undefined && p.questionToken === undefined) return false;
    const typed = p.type !== undefined && /^Store(\s*\|\s*undefined)?$/.test(p.type.getText());
    const named = p.initializer !== undefined && ts.isStringLiteralLike(p.initializer) && (p.initializer.text === "manapool" || p.initializer.text === "tcgplayer");
    return typed || named;
  });
}

/** True when a value passed on lands where every call signature must be given a store: a parameter typed `(ids, store: Store) => …`. */
function storeRequiredBy(checker, expr, storeAt) {
  const type = checker.getContextualType(expr);
  if (!type) return false;
  const sigs = type.getCallSignatures();
  return sigs.length > 0 && sigs.every((sig) => sig.minArgumentCount > storeAt);
}

/** The declaration a reference resolves to, through aliases and re-exports. */
function declOf(checker, node) {
  let sym = checker.getSymbolAtLocation(node);
  if (!sym) return null;
  if (sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
  return sym.valueDeclaration ?? sym.declarations?.[0] ?? null;
}

/**
 * The name a call is filed under in the pending list: the nearest named function or method around it, or the variable
 * a function (or a module-level wrapper such as `cache(async () => …)`) is assigned to.
 */
function enclosingName(node) {
  for (let cur = node.parent; cur; cur = cur.parent) {
    if ((ts.isFunctionDeclaration(cur) || ts.isMethodDeclaration(cur)) && cur.name) return cur.name.getText();
    if (ts.isVariableDeclaration(cur) && ts.isIdentifier(cur.name) && cur.initializer) {
      const fn = ts.isArrowFunction(cur.initializer) || ts.isFunctionExpression(cur.initializer);
      const statement = cur.parent?.parent;
      const topLevel = statement?.parent !== undefined && ts.isSourceFile(statement.parent);
      if (fn || topLevel) return cur.name.text;
    }
  }
  return "(module)";
}

/** Every call under `src/` to a guarded function that leaves its store out, and the pending entries whose count no longer matches. */
export function storeReadFindings(root, pending = PENDING) {
  const { program, rel } = programFor(root);
  const checker = program.getTypeChecker();
  const sources = program.getSourceFiles().filter((sf) => {
    const path = rel(sf.fileName);
    return path.startsWith("src/") && !isTest(path) && !sf.isDeclarationFile;
  });

  // Every guarded function: its declaring node, mapped to its name and store position.
  const guarded = new Map();
  for (const sf of sources) {
    const visit = (node) => {
      if (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) {
        const fn = functionOf(node);
        const at = fn ? storeIndex(fn) : -1;
        if (at >= 0 && node.name && ts.isIdentifier(node.name)) guarded.set(node, { name: node.name.text, file: rel(sf.fileName), storeAt: at });
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  for (const a of ANCHORS) {
    if (![...guarded.values()].some((g) => g.file === a.file && g.name === a.name)) {
      throw new Error(`${a.file} ${a.name} is not found with an optional or defaulted \`store\` parameter: the check cannot judge its calls`);
    }
  }

  const missing = [];
  const indirect = [];
  for (const sf of sources) {
    const path = rel(sf.fileName);
    const lineOf = (node) => sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    const visit = (node) => {
      if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) {
        const decl = declOf(checker, node);
        const g = decl ? guarded.get(decl) : undefined;
        if (g && decl.name !== node) {
          const parent = node.parent;
          const inImportOrExport = ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent);
          // The callee of a call: the identifier itself, or the name of `x.read` / `x["read"]`, under any parentheses.
          let callee = node;
          if ((ts.isPropertyAccessExpression(parent) && parent.name === node) || (ts.isElementAccessExpression(parent) && parent.argumentExpression === node)) callee = parent;
          while (ts.isParenthesizedExpression(callee.parent)) callee = callee.parent;
          const call = ts.isCallExpression(callee.parent) && callee.parent.expression === callee ? callee.parent : null;
          if (call) {
            const args = call.arguments;
            const spread = args.slice(0, g.storeAt + 1).some(ts.isSpreadElement);
            const arg = args[g.storeAt];
            const nullish = ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Void | ts.TypeFlags.Any | ts.TypeFlags.Unknown;
            const argType = arg === undefined || spread ? null : checker.getTypeAtLocation(arg);
            const maybeUndefined = argType !== null && ((argType.flags & nullish) !== 0 || (argType.isUnion() && argType.types.some((t) => (t.flags & nullish) !== 0)));
            if (!spread && (arg === undefined || maybeUndefined)) {
              missing.push({ path, line: lineOf(call), fn: enclosingName(call), read: g.name, why: arg === undefined ? "without the reader's store" : "with a store that may be undefined" });
            }
          } else if (!inImportOrExport && !ts.isTypeQueryNode(parent) && !storeRequiredBy(checker, callee, g.storeAt)) {
            indirect.push({ path, line: lineOf(node), why: `${enclosingName(node)} passes ${g.name} on without calling it, so its store cannot be judged: call it directly` });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }

  const key = (m) => `${m.path} ${m.fn}`;
  const counts = new Map();
  for (const m of missing) counts.set(key(m), (counts.get(key(m)) ?? 0) + 1);
  const pendingN = new Map(pending.map((p) => [`${p.path} ${p.fn}`, p.n]));
  const findings = [
    ...missing
      .filter((m) => !pendingN.has(key(m)))
      .map((m) => ({ path: m.path, line: m.line, why: `${m.fn} calls ${m.read} ${m.why}` })),
    ...indirect,
  ];
  for (const p of pending) {
    const live = counts.get(`${p.path} ${p.fn}`) ?? 0;
    if (live === p.n) continue;
    const where = missing.find((m) => key(m) === `${p.path} ${p.fn}`);
    findings.push({
      path: p.path,
      line: where?.line ?? 0,
      why: live === 0
        ? `pending entry "${p.fn}" no longer leaves the store out: delete it from scripts/lib/store-reads-pending.mjs`
        : `pending entry "${p.fn}" lists ${p.n} call(s) without the store, the code has ${live}: thread the new one, or lower the count if one was threaded`,
    });
  }
  return { files: sources.length, findings };
}
