// `check:third-party-names` (PersonName plan, PR A): another reader's name is a `ThirdPartyName`
// (`src/lib/person-name/brand.ts`), and this holds the two places the type cannot hold itself.
//
// 1. WHO MINTS AND WHO REVEALS. `named()` (mint.ts) is imported only under `src/lib/social/` and `src/lib/person-name/`;
//    `reveal()` (reveal.ts) only by the files in `REVEAL_ALLOW`; tests' `plain()` (testing.ts) only by tests. Every
//    import is RESOLVED (relative or `@/` alias), so no spelling of the path gets past it. A re-export of any of the
//    three is a finding wherever it is, and so is any use of an imported binding other than calling it (`export {
//    named }`, a const alias): either would hand the function to every importer. `import()` and `require()` of them
//    are findings outright, since what they return cannot be tracked.
// 2. WHAT THE TYPE ALLOWS. An object type is still accepted by a template, `String()`, `.toString()` and `+`, which
//    draw a branded name as "[object Object]" and hide that it was meant to be drawn marked. Each of those over a
//    name (or a list holding one) is a finding outside `src/lib/person-name/`, as are `as ThirdPartyName` (forging one)
//    and reading `.$tp` by access or destructuring, or naming it in an object (revealing or forging without the module). `personText` is the one template a name may enter.
//
// Type-aware, so it builds the TypeScript program over `src/` (about as long as `pnpm typecheck`). Tests are exempt.
import { join, relative, sep } from "node:path";
import ts from "typescript";
import { MINT, REVEAL, TESTING, isTestPath, mayImport } from "./third-party-names-rules.mjs";

const GUARDED = [MINT, REVEAL, TESTING];
const BRAND_DIR = "src/lib/person-name/";

/** The program over `root`'s tsconfig, its root files narrowed to `src/` (and ambient `.d.ts` files). */
function programFor(root) {
  const configPath = join(root, "tsconfig.json");
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  if (read.error) throw new Error(ts.flattenDiagnosticMessageText(read.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, root);
  const rel = (f) => relative(root, f).split(sep).join("/");
  const rootNames = parsed.fileNames.filter((f) => rel(f).startsWith("src/") || f.endsWith(".d.ts"));
  if (!rootNames.some((f) => rel(f).startsWith("src/"))) throw new Error(`no source files under ${join(root, "src")}`);
  return { program: ts.createProgram({ rootNames, options: { ...parsed.options, noEmit: true } }), options: parsed.options, rel };
}

/** True when the type is a `ThirdPartyName`, holds one in a union or intersection, or is a list of them. */
function namesSomeone(checker, type, seen = new Set()) {
  if (seen.has(type)) return false;
  seen.add(type);
  if (type.isUnionOrIntersection()) return type.types.some((t) => namesSomeone(checker, t, seen));
  if (checker.getPropertiesOfType(type).some((p) => String(p.escapedName).startsWith("__@thirdParty@"))) return true;
  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    const element = checker.getIndexTypeOfType(type, ts.IndexKind.Number);
    return element ? namesSomeone(checker, element, seen) : false;
  }
  return false;
}

/** True for a `ThirdPartyName` itself, not a union or list that merely may hold one (`as Parts` forges nothing). */
const isBrand = (checker, type) => !type.isUnion() && checker.getPropertiesOfType(type).some((p) => String(p.escapedName).startsWith("__@thirdParty@"));

/** A property name's text: an identifier, a string or numeric literal, or a computed literal (`["$tp"]`). */
function keyText(name) {
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) return name.text;
  if (ts.isComputedPropertyName(name) && ts.isStringLiteralLike(name.expression)) return name.expression.text;
  return null;
}

/** Every finding in the repository at `root`, as `{ path, line, why }`, and how many files were read. */
export function thirdPartyNameFindings(root) {
  const { program, options, rel } = programFor(root);
  const checker = program.getTypeChecker();
  const findings = [];
  let files = 0;

  for (const sf of program.getSourceFiles()) {
    const path = rel(sf.fileName);
    if (!path.startsWith("src/") || sf.isDeclarationFile) continue;
    files += 1;
    const test = isTestPath(path);
    const inBrand = path.startsWith(BRAND_DIR);
    const at = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    const add = (node, why) => findings.push({ path, line: at(node), why });
    const target = (specifier) => {
      const resolved = ts.resolveModuleName(specifier, sf.fileName, options, ts.sys).resolvedModule?.resolvedFileName;
      return resolved ? rel(resolved) : null;
    };
    const checkImport = (node, specifier, reexport) => {
      const to = target(specifier);
      if (!to || !GUARDED.includes(to)) return;
      if (reexport) add(node, `re-exports ${to}`);
      else if (!mayImport(path, to)) add(node, `imports ${to}`);
    };
    const typeNames = (node) => !inBrand && !test && namesSomeone(checker, checker.getTypeAtLocation(node));

    // The file's own bindings of the three guarded modules (`import { named }`, `import * as m`, a default import). A
    // binding may only be CALLED; any other use of it (`export { named }`, `export const mint = named`, `{ named }`,
    // `export default named`, handing it to a function) passes the function on, and is a re-export by another name.
    const guardedSymbols = new Map();
    const namespaces = new Set();
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier) || !st.importClause || st.importClause.isTypeOnly) continue;
      const to = target(st.moduleSpecifier.text);
      if (!to || !GUARDED.includes(to)) continue;
      const bind = (id, ns) => {
        const sym = checker.getSymbolAtLocation(id);
        if (!sym) return;
        guardedSymbols.set(sym, to);
        if (ns) namespaces.add(sym);
      };
      if (st.importClause.name) bind(st.importClause.name, false);
      const nb = st.importClause.namedBindings;
      if (nb && ts.isNamespaceImport(nb)) bind(nb.name, true);
      else if (nb) for (const el of nb.elements) if (!el.isTypeOnly) bind(el.name, false);
    }
    /** The local symbol an identifier refers to, through a shorthand property and an export specifier. */
    const refSymbol = (id) => {
      const p = id.parent;
      if (ts.isShorthandPropertyAssignment(p) && p.name === id) return checker.getShorthandAssignmentValueSymbol(p);
      if (ts.isExportSpecifier(p)) return checker.getExportSpecifierLocalTargetSymbol(p);
      return checker.getSymbolAtLocation(id);
    };
    const isDeclarationName = (id) => {
      const p = id.parent;
      return (ts.isImportSpecifier(p) || ts.isNamespaceImport(p) || ts.isImportClause(p)) && p.name === id;
    };
    const passesOn = (id) => {
      if (test || isDeclarationName(id)) return null;
      const sym = refSymbol(id);
      const to = sym && guardedSymbols.get(sym);
      if (!to) return null;
      const p = id.parent;
      if (ts.isCallExpression(p) && p.expression === id) return null;
      // `m.named(x)` on a namespace import.
      if (namespaces.has(sym) && ts.isPropertyAccessExpression(p) && p.expression === id && ts.isCallExpression(p.parent) && p.parent.expression === p) return null;
      // A type position (`typeof named`) passes nothing on.
      if (ts.isTypeQueryNode(p)) return null;
      return to;
    };

    const visit = (node) => {
      if (ts.isIdentifier(node) && guardedSymbols.size > 0) {
        const to = passesOn(node);
        if (to) add(node, `passes on ${node.text} from ${to} (only call it)`);
      }
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        checkImport(node, node.moduleSpecifier.text, false);
      } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && ts.isStringLiteral(node.moduleReference.expression)) {
        checkImport(node, node.moduleReference.expression.text, false);
      } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        checkImport(node, node.moduleSpecifier.text, true);
      } else if (ts.isCallExpression(node)) {
        const [arg] = node.arguments;
        const loads = node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require");
        // A guarded module is imported statically, or not at all: what `import()` or `require()` returns cannot be
        // tracked as a binding (awaited, destructured, `.then`), so loading it that way is itself a finding.
        if (loads && arg && ts.isStringLiteralLike(arg) && !test) {
          const to = target(arg.text);
          if (to && GUARDED.includes(to)) add(node, `loads ${to} dynamically (import it statically, and only call it)`);
        }
        // String(name)
        if (ts.isIdentifier(node.expression) && node.expression.text === "String" && arg && typeNames(arg)) add(node, "String() of a third-party name");
        // name.toString()
        if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "toString" && typeNames(node.expression.expression)) {
          add(node, "toString() of a third-party name");
        }
      } else if (ts.isTemplateExpression(node)) {
        const tag = ts.isTaggedTemplateExpression(node.parent) ? node.parent.tag : null;
        const personText = tag && ts.isIdentifier(tag) && tag.text === "personText";
        if (!personText) for (const span of node.templateSpans) if (typeNames(span.expression)) add(span.expression, "a third-party name in a template (use personText)");
      } else if (ts.isBinaryExpression(node) && (node.operatorToken.kind === ts.SyntaxKind.PlusToken || node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken)) {
        if (typeNames(node.left) || typeNames(node.right)) add(node, "+ on a third-party name");
      } else if ((ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) && !inBrand && !test) {
        if (isBrand(checker, checker.getTypeFromTypeNode(node.type))) add(node, "asserts a ThirdPartyName (only named() mints one)");
      } else if (ts.isPropertyAccessExpression(node) && node.name.text === "$tp" && !inBrand && !test) {
        add(node, "reads .$tp (only reveal() reads a name)");
      } else if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression) && node.argumentExpression.text === "$tp" && !inBrand && !test) {
        add(node, "reads [\"$tp\"] (only reveal() reads a name)");
      } else if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent) && !inBrand && !test) {
        // `const { $tp: name } = who`, nested, in a parameter or a catch clause: a read by destructuring.
        if (keyText(node.propertyName ?? node.name) === "$tp") add(node, "destructures $tp (only reveal() reads a name)");
      } else if ((ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) && !inBrand && !test) {
        // `({ $tp: name } = who)` reads it; `{ $tp: "x" }` builds the runtime shape by hand. Either way, not here.
        if (keyText(node.name) === "$tp") add(node, "names $tp in an object (only named() and reveal() touch it)");
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return { files, findings };
}
