// What `pnpm copy:import` does for the tests: a changed row's OLD text, typed as a string literal in a test, would fail
// that test after the import. Each such literal is rewritten to read the copy leaf (an import of the copy module and a
// reference to the key), so the test follows the sheet instead of pinning the old words. Anything that cannot be
// rewritten safely is returned as a hand edit and named in the PR body; the import still goes ahead.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import ts from "typescript";
import { MIN_WORDS } from "../test-copy-literals.mjs";
import { COPY_DIR, readCopyRows, type Change } from "./sheet.mjs";
import { DATA_ROW, type CopyRow } from "./walk.mjs";

export type HandEdit = { file: string; line: number; text: string; key: string; why: string };
export type TestRewrite = { files: Map<string, string>; rewritten: { file: string; count: number }[]; hand: HandEdit[]; soft: HandEdit[] };

const TEST_FILE = /\.test\.(ts|tsx|mts)$/;
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", ".worktrees", "dist", "coverage"]);
const IDENT = /^[A-Za-z_$][\w$]*$/;
/** `a.b[0].friend-spares` as written in code: a segment that is not an identifier takes brackets. */
export function accessPath(path: string): string | null {
  const parts = path.match(/\[\d+\]|[^.[\]]+/g);
  if (!parts || parts.join("") !== path.replace(/\./g, "")) return null;
  return parts.map((p, i) => (p.startsWith("[") ? p : i === 0 ? p : IDENT.test(p) ? `.${p}` : `["${p}"]`)).join("");
}
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

function testFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    if (!existsSync(join(root, dir))) return;
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) walk(posix.join(dir, e.name));
      } else if (TEST_FILE.test(e.name)) out.push(posix.join(dir, e.name));
    }
  };
  for (const top of ["src", "scripts"]) walk(top);
  return out.sort();
}

type Edit = { start: number; end: number; text: string };

/** Why a literal cannot become a reference in place, or null when it can. */
function unsafePosition(n: ts.Node, sf: ts.SourceFile): string | null {
  const parent = n.parent;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) || ts.isExternalModuleReference(parent) || ts.isLiteralTypeNode(parent)) return "a module path or a type, not a value";
  if ((ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent) || ts.isEnumMember(parent)) && parent.name === n) return "a property name";
  if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.PlusToken) return "a built string";
  if (ts.isTaggedTemplateExpression(parent)) return "a tagged template";
  for (let a: ts.Node | undefined = parent; a; a = a.parent) {
    if (!ts.isCallExpression(a)) continue;
    const callee = a.expression.getText(sf);
    if (/Snapshot$/.test(callee)) return "inside a snapshot";
    if (/^vi\.(mock|doMock|hoisted)$/.test(callee)) return "inside a hoisted vi.mock, which cannot read an import";
    if (/^(describe|it|test)(\.\w+)*$/.test(callee) && a.arguments[0] === n) return "a test title";
  }
  return null;
}

function resolvesTo(spec: string, file: string, copyFile: string): boolean {
  const base = copyFile.replace(/\.ts$/, "");
  if (spec.startsWith("@/")) return `src/${spec.slice(2)}`.replace(/\.ts$/, "") === base;
  if (!spec.startsWith(".")) return false;
  return posix.normalize(posix.join(posix.dirname(file), spec)).replace(/\.ts$/, "") === base;
}

function importEdit(sf: ts.SourceFile, file: string, copyFile: string, name: string, used: Map<string, Edit>): { ref: string } | { why: string } {
  const imports = sf.statements.filter(ts.isImportDeclaration);
  const same = imports.filter((i) => ts.isStringLiteral(i.moduleSpecifier) && resolvesTo(i.moduleSpecifier.text, file, copyFile));
  for (const imp of same) {
    const clause = imp.importClause;
    if (!clause || clause.isTypeOnly) continue;
    if (clause.name || (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings))) return { why: "the file imports that copy module as a default or namespace import" };
    const named = clause.namedBindings && ts.isNamedImports(clause.namedBindings) ? clause.namedBindings : null;
    const hit = named?.elements.find((e) => (e.propertyName ?? e.name).text === name && !e.isTypeOnly);
    if (hit) return { ref: hit.name.text };
  }
  const clash = (() => {
    let found = false;
    const visit = (n: ts.Node) => {
      if (ts.isIdentifier(n) && n.text === name && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) && !(ts.isPropertyAssignment(n.parent) && n.parent.name === n)) found = true;
      if (!found) ts.forEachChild(n, visit);
    };
    visit(sf);
    return found;
  })();
  if (clash || [...used.keys()].some((k) => k.endsWith(`#${name}`) && k !== `${copyFile}#${name}`)) return { why: `\`${name}\` is already a name in this file` };
  const open = same.find((i) => i.importClause && !i.importClause.isTypeOnly && !i.importClause.name && i.importClause.namedBindings && ts.isNamedImports(i.importClause.namedBindings));
  const id = `${copyFile}#${name}`;
  if (open) {
    const named = (open.importClause!.namedBindings as ts.NamedImports);
    const last = named.elements[named.elements.length - 1];
    if (last) used.set(id, { start: last.getEnd(), end: last.getEnd(), text: `, ${name}` });
    else used.set(id, { start: named.getStart(sf) + 1, end: named.getStart(sf) + 1, text: ` ${name} ` });
    return { ref: name };
  }
  const spec = posix.relative(posix.dirname(file), copyFile.replace(/\.ts$/, ""));
  const lastImport = imports[imports.length - 1];
  const at = lastImport ? lastImport.getEnd() : 0;
  used.set(id, { start: at, end: at, text: `${lastImport ? "\n" : ""}import { ${name} } from "${spec.startsWith(".") ? spec : `./${spec}`}";${lastImport ? "" : "\n"}` });
  return { ref: name };
}

export type Options = {
  /** Only these test files. */
  files?: ReadonlySet<string>;
  /** Resolve twin text from the sources the test imports: the twin whose access path the component writes. */
  disambiguate?: boolean;
  /** `<test file>|<text>` -> the leaf key to read, for a twin the rules above leave open (the author read the component). */
  picks?: Readonly<Record<string, string>>;
};

const plain = (r: CopyRow) => !r.readOnly && !r.isTemplate && r.context === "" && r.key.split("#").length === 2;
/** Whether the source writes this access path whole: `home.title` is not found inside `myhome.title` or `home.titleLong`. */
const writes = (source: string, acc: string) => new RegExp(`(?<![\\w$.])${acc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w$])`).test(source);
const RESOLVE = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

/** The non-test, non-copy sources a test reaches by relative import, two hops deep: the component under test and its parts. */
function reachedSources(file: string, root: string, seen = new Set<string>(), depth = 0): string {
  let text = "";
  const src = existsSync(join(root, file)) ? readFileSync(join(root, file), "utf8") : "";
  for (const m of src.matchAll(/from\s+["'](\.{1,2}\/[^"']+)["']/g)) {
    const base = posix.normalize(posix.join(posix.dirname(file), m[1]!));
    const hit = RESOLVE.map((s) => base + s).find((c) => existsSync(join(root, c)) && !c.endsWith("/") && /\.(ts|tsx)$/.test(c));
    if (!hit || seen.has(hit) || hit.startsWith(`${COPY_DIR}/`) || TEST_FILE.test(hit)) continue;
    seen.add(hit);
    text += `\n${readFileSync(join(root, hit), "utf8")}`;
    if (depth < 1) text += reachedSources(hit, root, seen, depth + 1);
  }
  return text;
}

/**
 * The tests under `root` that hold a changed row's old text as a string literal. `files` are the rewritten sources,
 * `hand` the literals that need a person. Reads `root`'s copy files as they are BEFORE the sheet is applied.
 */
export function rewriteTests(changes: readonly Change[], root: string, opts: Options = {}): TestRewrite {
  const all = readCopyRows(root).filter((r) => !DATA_ROW.test(r.key));
  const byKey = new Map(all.map((r) => [r.key, r]));
  const sameText = new Map<string, CopyRow[]>();
  for (const r of all) sameText.set(r.text, [...(sameText.get(r.text) ?? []), r]);
  const byFrom = new Map<string, Change>();
  for (const c of changes) if (byKey.has(c.key) && !byFrom.has(c.from)) byFrom.set(c.from, c);
  const out: TestRewrite = { files: new Map(), rewritten: [], hand: [], soft: [] };
  const words = [...byFrom.keys()].map((t) => t.trim().split(/\s+/)[0]);
  if (byFrom.size === 0) return out;

  for (const file of testFiles(root)) {
    if (opts.files && !opts.files.has(file)) continue;
    let reached: string | null = null;
    const source = readFileSync(join(root, file), "utf8");
    if (!words.some((w) => source.includes(w))) continue;
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const edits: Edit[] = [];
    const imports = new Map<string, Edit>();
    const hand: HandEdit[] = [];
    let count = 0;
    const visit = (n: ts.Node) => {
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
        const change = byFrom.get(n.text);
        if (change) {
          const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
          const give = (why: string) => hand.push({ file, line, text: n.text, key: change.key, why });
          let use = change;
          const sameTexts = sameText.get(change.from) ?? [];
          const twins = sameTexts.filter((r) => r.key !== change.key);
          let picked = false;
          const pick = opts.picks?.[`${file}|${n.text}`];
          if (pick && byKey.has(pick)) {
            use = { ...change, key: pick };
            picked = true;
          }
          if (opts.disambiguate && twins.length && !picked) {
            // Twins render the same words, so any choice keeps the test green; the choice names the leaf a copy edit should reach.
            reached ??= reachedSources(file, root);
            const via = (cands: CopyRow[], keep: (r: CopyRow) => boolean) => (cands.length > 1 && cands.some(keep) ? cands.filter(keep) : cands);
            let cands = sameTexts.filter(plain);
            cands = via(cands, (r) => {
              const acc = accessPath(r.key.split("#")[1] ?? "");
              return acc !== null && writes(reached!, acc);
            });
            cands = via(cands, (r) => {
              const mod = r.file.slice(r.file.lastIndexOf("/") + 1).replace(/\.ts$/, "");
              return new RegExp(`copy/${mod}["']`).test(`${source}\n${reached}`);
            });
            if (cands.length === 1) {
              use = { ...change, key: cands[0]!.key };
              picked = true;
            } else if (cands.length > 1 && new Set(cands.map((r) => r.file)).size === 1) {
              use = { ...change, key: cands[0]!.key };
              picked = true;
              out.soft.push({ file, line, text: n.text, key: use.key, why: `first of ${cands.length} twins in one module: ${cands.map((r) => r.key.split("#")[1]).join(", ")}` });
            }
          }
          const [copyFile, path = ""] = use.key.split("#");
          const row2 = byKey.get(use.key)!;
          const unsafe = unsafePosition(n, sf);
          if (file.startsWith(`${COPY_DIR}/`)) give("a copy module's own test");
          else if (file.startsWith("scripts/")) give("a script test imports differently");
          else if (row2.readOnly || row2.isTemplate || row2.context !== "" || use.key.split("#").length > 2) give("a function or computed leaf, not a plain string");
          else if (wordCount(change.from) < MIN_WORDS) give("one word: it may be a fixture, not the copy");
          else if (twins.length && !picked) give(`ambiguous: the same words are also ${twins.map((t) => t.key).join(", ")}`);
          else if (accessPath(path) === null) give("the key has no plain property path");
          else if (unsafe) give(unsafe);
          else {
            const name = path.split(/[.[]/)[0];
            const got = importEdit(sf, file, copyFile, name, imports);
            if ("why" in got) give(got.why);
            else {
              const ref = got.ref + accessPath(path)!.slice(name.length);
              edits.push({ start: n.getStart(sf), end: n.getEnd(), text: ts.isJsxAttribute(n.parent) ? `{${ref}}` : ref });
              count++;
            }
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
    if (hand.length) out.hand.push(...hand);
    if (count === 0) continue;
    let next = source;
    for (const e of [...edits, ...imports.values()].sort((a, b) => b.start - a.start || b.end - a.end)) next = next.slice(0, e.start) + e.text + next.slice(e.end);
    const syntax = ts.transpileModule(next, { reportDiagnostics: true, fileName: file, compilerOptions: { target: ts.ScriptTarget.Latest, jsx: ts.JsxEmit.Preserve } }).diagnostics ?? [];
    if (syntax.length) {
      out.hand.push(...edits.map((e) => ({ file, line: sf.getLineAndCharacterOfPosition(e.start).line + 1, text: source.slice(e.start, e.end), key: "", why: "the rewrite left invalid source" })));
      continue;
    }
    out.files.set(file, next);
    out.rewritten.push({ file, count });
  }
  return out;
}

/** The PR-body section: what was rewritten, and what needs a hand edit. */
export function testsSection(t: TestRewrite): string[] {
  const lines = ["## Tests", ""];
  if (t.rewritten.length === 0 && t.hand.length === 0) return [...lines, "No test holds a changed row's old text as a string literal.", ""];
  if (t.rewritten.length) {
    lines.push(`Rewritten to read the copy leaf (${t.rewritten.reduce((n, r) => n + r.count, 0)} literal${t.rewritten.reduce((n, r) => n + r.count, 0) === 1 ? "" : "s"} in ${t.rewritten.length} test file${t.rewritten.length === 1 ? "" : "s"}):`, "");
    for (const r of t.rewritten) lines.push(`- \`${r.file}\` (${r.count})`);
    lines.push("");
  }
  if (t.hand.length) {
    lines.push(`**Test needs a hand edit** (${t.hand.length}): these tests still type the old text. The orchestrator fixes them on this PR before merge.`, "");
    for (const h of t.hand) lines.push(`- \`${h.file}:${h.line}\` "${h.text.replace(/\n/g, " ")}"${h.key ? ` (\`${h.key.replace("src/lib/copy/", "")}\`)` : ""}: ${h.why}`);
    lines.push("");
  }
  return lines;
}
