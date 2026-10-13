import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// Every export of a `"use server"` module is a Server Action: any client can call it with
// arguments it chooses. So no action may take what only the server knows, namely whose request
// this is (`userId`) or which switches that reader resolved to (`env`). An action authenticates and
// resolves those itself; a helper that needs them lives in a plain module (`lib/decks/fill-plan.ts`,
// which `buildFillPlan` left `app/decks/actions.ts` for: as an action it took any reader's id).

const TRUSTED = new Set(["userId", "env"]);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const parse = (src: string) => ts.createSourceFile("m.tsx", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

/** A `"use server"` directive: the module's first statement, whatever comments come before it. */
function isServerModule(src: string): boolean {
  const first = parse(src).statements[0];
  return !!first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === "use server";
}

const exported = (node: ts.Node) =>
  ts.canHaveModifiers(node) && !!ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

/**
 * Every exported function and its parameters, read from the syntax tree: a declaration (default
 * included), an exported `const` bound to an arrow or a function expression, and `export default`
 * of either.
 */
function exportedFunctions(src: string): { name: string; params: readonly ts.ParameterDeclaration[] }[] {
  const out: { name: string; params: readonly ts.ParameterDeclaration[] }[] = [];
  const fn = (e: ts.Expression | undefined) => (e && (ts.isArrowFunction(e) || ts.isFunctionExpression(e)) ? e : null);
  for (const s of parse(src).statements) {
    if (ts.isFunctionDeclaration(s) && exported(s)) out.push({ name: s.name?.text ?? "default", params: s.parameters });
    else if (ts.isVariableStatement(s) && exported(s)) {
      for (const d of s.declarationList.declarations) {
        const f = fn(d.initializer);
        if (f && ts.isIdentifier(d.name)) out.push({ name: d.name.text, params: f.parameters });
      }
    } else if (ts.isExportAssignment(s)) {
      const f = fn(s.expression);
      if (f) out.push({ name: "default", params: f.parameters });
    }
  }
  return out;
}

/**
 * The trusted names a parameter list takes: a parameter, a destructured binding, or a field of an
 * inline object type. An options object whose TYPE is declared elsewhere (`opts: FillOpts`) is not
 * resolved: name the field inline in an action's signature.
 */
function trustedInputs(params: readonly ts.ParameterDeclaration[]): string[] {
  const found = new Set<string>();
  const binding = (name: ts.BindingName) => {
    if (ts.isIdentifier(name)) { if (TRUSTED.has(name.text)) found.add(name.text); return; }
    for (const el of name.elements) if (!ts.isOmittedExpression(el)) binding(el.name);
  };
  const typed = (type: ts.TypeNode | undefined) => {
    if (!type) return;
    if (ts.isTypeLiteralNode(type)) {
      for (const m of type.members) if (m.name && ts.isIdentifier(m.name) && TRUSTED.has(m.name.text)) found.add(m.name.text);
    } else if (ts.isIntersectionTypeNode(type) || ts.isUnionTypeNode(type)) type.types.forEach(typed);
  };
  for (const p of params) { binding(p.name); typed(p.type); }
  return [...found];
}

const inputsOf = (src: string) => exportedFunctions(src).map((f) => [f.name, trustedInputs(f.params)]);

describe("a Server Action never takes the reader's identity or switches as an argument", () => {
  it("finds them in every export shape, parameter shape and around comments and strings", () => {
    expect(inputsOf([
      "export async function a(\n  userId: string,\n  o: { env?: NodeJS.ProcessEnv },\n) {}",
      "export function b(x: string) {}",
      "export const c = async (env: NodeJS.ProcessEnv) => env;",
      "export const d = (deckId: string, userId: string) => deckId + userId;",
      "export const e = async function (o: { userId: string }) { return o; };",
      "export async function f({ userId }: { userId: string }) { return userId; }",
      "export async function g(q = \"(\", /* ) */ userId: string) { return q + userId; }",
      "export async function h(o: Pick<X, \"a\"> & { env: NodeJS.ProcessEnv }) { return o; }",
    ].join("\n"))).toEqual([
      ["a", ["userId", "env"]], ["b", []], ["c", ["env"]], ["d", ["userId"]], ["e", ["userId"]],
      ["f", ["userId"]], ["g", ["userId"]], ["h", ["env"]],
    ]);
    expect(inputsOf("export default async function leak(userId: string) {}")).toEqual([["leak", ["userId"]]]);
    expect(inputsOf("export default async (env: NodeJS.ProcessEnv) => env;")).toEqual([["default", ["env"]]]);
    expect(isServerModule(`/** A header. */\n// and a line\n"use server";\nexport async function g() {}`)).toBe(true);
    expect(isServerModule(`import x from "y";\n"use server";`)).toBe(false);
  });

  it("holds across every \"use server\" module", () => {
    let scanned = 0;
    const offenders = sources("src").flatMap((path) => {
      const src = readFileSync(path, "utf8");
      if (!isServerModule(src)) return [];
      scanned++;
      return exportedFunctions(src)
        .map((f) => ({ at: `${path} ${f.name}`, inputs: trustedInputs(f.params) }))
        .filter((f) => f.inputs.length > 0)
        .map((f) => `${f.at}: ${f.inputs.join(", ")}`);
    });
    // A scan that found no action module would pass over anything.
    expect(scanned).toBeGreaterThan(20);
    expect(offenders).toEqual([]);
  });
});
