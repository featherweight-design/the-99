// The store-reads inventory (store choice, design #3200): every call under `src/` to a price or art read that takes
// the reader's store must pass one. Each guarded read defaults its `store` parameter to Mana Pool, so a call that
// leaves it out still compiles and silently prices a reader who chose another store in Mana Pool: totals from two
// stores on one page, or a figure that disagrees with the Shopping list. TypeScript cannot see that; this does.
//
// Type-aware: the program is built over `src/`, and each call is resolved to the function it reaches through any import
// alias, namespace import or dynamic import, so no spelling of the call gets past it. The argument checked is the one at
// the declaration's own `store` parameter, so a read whose store sits second (`discovery/price.ts`) and one whose store
// sits fourth (`decks/price-query.ts`) are both judged by where the parameter really is.
//
// Calls not yet given a store are named in `store-reads-pending.mjs` by file and function. Each slice of the store
// work deletes its own entries; an entry whose file no longer leaves the store out is a finding too, so the list only
// shrinks. Scripts (the signed-out landing demo's exporter among them, which stays Mana Pool) are outside `src/` and
// not read.
import { join, relative, sep } from "node:path";
import ts from "typescript";
import { PENDING } from "./store-reads-pending.mjs";

/** The guarded reads: the file that declares each, and its name there. */
export const GUARDED = [
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

/** The guarded read a call reaches, with the index of its `store` parameter, or null. */
function guardedCallee(checker, call, rel) {
  let sym = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(call.expression) ? call.expression.name : call.expression);
  if (!sym) return null;
  if (sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
  const decl = sym.valueDeclaration ?? sym.declarations?.[0];
  if (!decl || !ts.isFunctionDeclaration(decl)) return null;
  const file = rel(decl.getSourceFile().fileName);
  const name = decl.name?.text;
  if (!GUARDED.some((g) => g.file === file && g.name === name)) return null;
  const storeAt = decl.parameters.findIndex((p) => ts.isIdentifier(p.name) && p.name.text === "store");
  if (storeAt < 0) throw new Error(`${file} ${name} has no \`store\` parameter: the check cannot judge its calls`);
  return { name, file, storeAt };
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

/** Every call under `src/` to a guarded read that leaves its store out, and the pending entries that no longer match one. */
export function storeReadFindings(root, pending = PENDING) {
  const { program, rel } = programFor(root);
  const checker = program.getTypeChecker();
  const missing = [];
  let files = 0;
  for (const sf of program.getSourceFiles()) {
    const path = rel(sf.fileName);
    if (!path.startsWith("src/") || isTest(path) || sf.isDeclarationFile) continue;
    files++;
    const visit = (node) => {
      if (ts.isCallExpression(node)) {
        const g = guardedCallee(checker, node, rel);
        // A spread argument may carry the store; it is judged present only when nothing could be missing after it.
        if (g && node.arguments.length <= g.storeAt && !node.arguments.some(ts.isSpreadElement)) {
          const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
          missing.push({ path, line: line + 1, fn: enclosingName(node), read: g.name });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  const key = (m) => `${m.path} ${m.fn}`;
  const pendingKeys = new Set(pending.map((p) => `${p.path} ${p.fn}`));
  const findings = missing
    .filter((m) => !pendingKeys.has(key(m)))
    .map((m) => ({ path: m.path, line: m.line, why: `${m.fn} calls ${m.read} without the reader's store` }));
  const live = new Set(missing.map(key));
  for (const p of pending) {
    if (!live.has(`${p.path} ${p.fn}`)) findings.push({ path: p.path, line: 0, why: `pending entry "${p.fn}" no longer leaves the store out: delete it from scripts/lib/store-reads-pending.mjs` });
  }
  return { files, findings };
}
