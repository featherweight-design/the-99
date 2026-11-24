// Finds string literals in a test that equal a copy leaf verbatim. A test that types the words the app prints pins the
// wording twice: a copy edit then fails the test instead of passing through it. The test imports the copy leaf instead.
import { readFileSync } from "node:fs";
import ts from "typescript";
import { copyRows, DATA_ROW } from "./copy-sheet/walk.mjs";

export const MIN_WORDS = 2;
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Every copy leaf of two or more words with no holes, as text -> `src/lib/copy/<file>#key` (the first one wins). */
export function copyLeaves(files: string[], read: (f: string) => string = (f) => readFileSync(f, "utf8")): Map<string, string> {
  const leaves = new Map<string, string>();
  for (const f of files) {
    for (const r of copyRows(f, read(f))) {
      if (/[{}]/.test(r.text) || wordCount(r.text) < MIN_WORDS || leaves.has(r.text) || DATA_ROW.test(r.key)) continue;
      leaves.set(r.text, r.key);
    }
  }
  return leaves;
}

/** A test's own title describes the case; it is not an assertion on the words. */
const isTitle = (n: ts.Node) => {
  const call = n.parent;
  if (!ts.isCallExpression(call) || call.arguments[0] !== n) return false;
  return /^(describe|it|test)(\.\w+)*$/.test(call.expression.getText());
};

export type TestLiteral = { line: number; text: string; key: string };

export function findTestLiterals(file: string, source: string, leaves: Map<string, string>): TestLiteral[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: TestLiteral[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      const key = leaves.get(n.text);
      if (key && !isTitle(n)) out.push({ line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, text: n.text, key });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/** The test files this check reads. A copy module's own tests pin the copy itself, so they are out. */
export const inTestScope = (f: string) => /^(src|scripts)\/.*\.test\.(ts|tsx|mts)$/.test(f) && !f.startsWith("src/lib/copy/");
