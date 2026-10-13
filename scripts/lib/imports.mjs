// Does this file import this binding, from this module?
//
// Extracted from `contact-sheet.mjs` so it can be tested, because it is the one
// part of that script that can be quietly, confidently wrong: a check that
// answers "yes" for the wrong reason reports a shared component where there is
// a per-route copy, which is the exact failure the contact sheet exists to
// catch.
//
// WHY THE COMPILER AND NOT A REGEX. Three review rounds found three holes in a
// hand-rolled matcher, each a way of answering yes when the answer is no: a
// path quoted in prose, a line beginning with `import` inside a block comment
// or a template literal, and a side-effect import whose match ran on across a
// blank line into a later re-export's `from`. Each fix was correct and the next
// round found the next hole, which is the signal to stop patching and change
// the approach. TypeScript is already a dependency here and settles all of it,
// so nothing below has to know what a comment is.
import path from "node:path";
import ts from "typescript";

export function toPosix(p) {
  // Both separators rather than `path.sep`: a test on macOS can never observe
  // the host separator being wrong, so replacing only `path.sep` leaves the
  // guard unprovable on the machine that runs it.
  return p.replace(/\\/g, "/");
}

/** Resolve an import specifier to a repo-relative path, extensionless, posix. */
export function resolveSpecifier(file, specifier) {
  const from = specifier.startsWith("@/")
    ? path.join("src", specifier.slice(2))
    : specifier.startsWith(".")
      ? path.join(path.dirname(file), specifier)
      : null;
  return from ? toPosix(path.normalize(from)).replace(/\.tsx?$/, "") : null;
}

/**
 * Every binding this import declaration brings in as a VALUE, named by its
 * EXPORTED name rather than its local alias, with the module it came from.
 * Named imports count under their exported name. A default import counts as
 * `default`, and a namespace import not at all — both bind something other than
 * the named export to a local name that merely reads like it. Type-only imports are excluded at both levels — the whole
 * clause (`import type { X } from`) and the single specifier (`{ type X }`) —
 * and a side-effect import contributes nothing, having no clause at all.
 *
 * The binding is what gets checked, rather than the module, because a route can
 * take a constant or a type out of the shared file and render something else:
 * `/collection`'s `browser.tsx` imports `CHASSIS_WIDE_MIN_PX` and
 * `type FilterChip` from the chassis and mounts its own `FilterBar`. A
 * module-level check calls that shared. It is not.
 */
function parse(source, file) {
  // `setParentNodes` so the reference walk can ask what position an
  // identifier sits in — a property key and a parameter name are not uses.
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function valueImports(parsed) {
  const file = parsed.fileName;
  const found = [];
  for (const statement of parsed.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const clause = statement.importClause;
    // No clause is a side-effect import; `isTypeOnly` is `import type …`.
    if (!clause || clause.isTypeOnly) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    // Not named `module`: Next's lint rule reserves that identifier.
    const from = resolveSpecifier(file, statement.moduleSpecifier.text);

    // A default import records the exported name it actually takes — `default` —
    // not the local name it is bound to. `import FilterChassis from "…"` takes
    // the module's default export and calls it `FilterChassis` locally; it is
    // not the named `FilterChassis` export, any more than a namespace import is.
    // Recording it this way makes both spellings agree — the bare form and
    // `{ default as FilterChassis }`, which lands in the named branch below and
    // reads its `propertyName` of `default` — and leaves a group whose binding
    // genuinely is the default export able to ask for it by that name.
    if (clause.name) found.push({ name: "default", local: clause.name.text, from });
    const bindings = clause.namedBindings;
    // A namespace import is deliberately NOT a match. `import * as FilterChassis
    // from "…"` binds the module object to a local name that happens to read
    // like the export; it says nothing about which of that module's exports the
    // file uses, so a view importing the namespace and rendering its own control
    // would satisfy the invariant. Deciding otherwise would mean tracing
    // property access through the file, which is a different tool.
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        if (element.isTypeOnly) continue;
        // `propertyName` is the EXPORTED name; `name` is the local alias. Using
        // the alias gets it wrong in both directions — `{ Other as
        // FilterChassis }` would satisfy the invariant, and the genuinely
        // shared `{ FilterChassis as Chassis }` would be reported missing.
        found.push({
          name: (element.propertyName ?? element.name).text,
          local: element.name.text,
          from,
        });
      }
    }
  }
  return found.concat(loadedOnDemand(parsed));
}

/**
 * A binding loaded on demand: `const Local = wrap(() => import("./x").then((m) => m.Binding))`, the
 * shape the card details provider loads its modal views with. It takes exactly one named export, by a
 * property read on the module the import resolves to, and binds whatever wraps it to the declaration's
 * name, which must then be used like any other import. A dynamic import whose callback does anything
 * else (destructures, reads two exports, returns the module) is not counted.
 */
function loadedOnDemand(parsed) {
  const file = parsed.fileName;
  const found = [];
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      const then = node.parent;
      const call = then?.parent;
      const callback = call && ts.isCallExpression(call) && call.expression === then ? call.arguments[0] : null;
      if (
        ts.isPropertyAccessExpression(then) &&
        then.name.text === "then" &&
        callback &&
        ts.isArrowFunction(callback) &&
        callback.parameters.length === 1 &&
        ts.isIdentifier(callback.parameters[0].name) &&
        ts.isPropertyAccessExpression(callback.body) &&
        ts.isIdentifier(callback.body.expression) &&
        callback.body.expression.text === callback.parameters[0].name.text
      ) {
        let owner = call.parent;
        while (owner && !ts.isVariableDeclaration(owner) && !ts.isSourceFile(owner)) owner = owner.parent;
        if (owner && ts.isVariableDeclaration(owner) && ts.isIdentifier(owner.name)) {
          found.push({
            name: callback.body.name.text,
            local: owner.name.text,
            from: resolveSpecifier(file, node.arguments[0].text),
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(parsed, visit);
  return found;
}

/**
 * Is this identifier a USE of the name, or just the name appearing somewhere?
 *
 * An identifier with the right text is not a reference when it is the key of an
 * object literal, the property half of `x.Thing`, or the name being introduced
 * by a declaration — a parameter called `FilterChassis` shadows the import
 * rather than using it. A shorthand property (`{ FilterChassis }`) IS a use, so
 * it is deliberately not excluded.
 *
 * This is positional, not a symbol resolution: a genuine shadow in an inner
 * scope that then references the shadowed name still counts. Resolving symbols
 * needs a whole Program and a type checker, which is a heavier tool than a
 * check meant to run in under a second — and the remaining hole requires
 * someone to name a local after the component they are not rendering.
 */
function isUse(node) {
  const parent = node.parent;
  if (!parent) return true;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
  if (ts.isQualifiedName(parent) && parent.right === node) return false;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return false;
  if (ts.isPropertySignature(parent) && parent.name === node) return false;
  // The name a declaration introduces: parameters, variables, functions,
  // classes, and destructured bindings.
  if (
    (ts.isParameter(parent) ||
      ts.isVariableDeclaration(parent) ||
      ts.isFunctionDeclaration(parent) ||
      ts.isClassDeclaration(parent) ||
      ts.isBindingElement(parent)) &&
    parent.name === node
  ) {
    return false;
  }
  return true;
}

/** Is `local` referenced anywhere outside the import declarations? */
function isReferenced(parsed, local) {
  let used = false;
  const visit = (node) => {
    if (used || ts.isImportDeclaration(node)) return;
    if (ts.isIdentifier(node) && node.text === local && isUse(node)) {
      used = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(parsed, visit);
  return used;
}

/**
 * True when `source` imports `binding` as a value from `module` AND uses it.
 *
 * The reference check is not pedantry. Neither the ESLint config nor the
 * tsconfig here flags an unused local, so a view could keep rendering its own
 * `FilterBar`, add an unused `FilterChassis` import, and satisfy both this
 * assertion and the marker check — a green report for a route in exactly the
 * state the command exists to catch.
 */
export function importsSharedBinding({ source, file, module, binding }) {
  const target = module.replace(/\.tsx?$/, "");
  const parsed = parse(source, file);
  return valueImports(parsed).some(
    (entry) => entry.from === target && entry.name === binding && isReferenced(parsed, entry.local),
  );
}
