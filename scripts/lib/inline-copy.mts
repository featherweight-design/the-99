// Finds user-facing strings written inline in a component or action instead of in src/lib/copy/. Pure: takes a file's
// source, returns each offender with its line. The check (scripts/check-inline-copy.mts) keeps only those on lines a
// diff added, so old inline copy waits for its move PR while new inline copy never lands.
import ts from "typescript";

export type Inline = { line: number; kind: string; text: string };

// Attributes whose value a reader sees or hears.
const TEXT_ATTRS = new Set(["aria-label", "aria-description", "aria-roledescription", "aria-placeholder", "placeholder", "title", "alt", "label", "tooltip", "description", "heading"]);
// Calls whose first argument is shown to the reader.
const SHOWN_CALLS = new Set(["toast", "toast.error", "toast.success", "toast.info", "toast.warning", "setError"]);

const hasWords = (s: string) => /\p{L}{2,}/u.test(s);
const multiWord = (s: string) => /\p{L}+\s+\p{L}+/u.test(s);

/** The string literals an expression can show: itself, or any arm of a ternary, `&&`, `||` or `??`. */
function shownStrings(e: ts.Expression): ts.Expression[] {
  if (ts.isParenthesizedExpression(e)) return shownStrings(e.expression);
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e) || ts.isTemplateExpression(e)) return [e];
  if (ts.isConditionalExpression(e)) return [...shownStrings(e.whenTrue), ...shownStrings(e.whenFalse)];
  if (ts.isBinaryExpression(e)) {
    const k = e.operatorToken.kind;
    if (k === ts.SyntaxKind.AmpersandAmpersandToken) return shownStrings(e.right);
    if (k === ts.SyntaxKind.BarBarToken || k === ts.SyntaxKind.QuestionQuestionToken) return [...shownStrings(e.left), ...shownStrings(e.right)];
  }
  return [];
}

const literalText = (e: ts.Expression): string =>
  ts.isTemplateExpression(e) ? [e.head.text, ...e.templateSpans.map((s) => s.literal.text)].join(" ") : (e as ts.StringLiteral).text;

const calleeName = (e: ts.Expression): string =>
  ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? `${calleeName(e.expression)}.${e.name.text}` : "";

export function findInline(file: string, source: string): Inline[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: Inline[] = [];
  const add = (node: ts.Node, kind: string, text: string) =>
    out.push({ line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, kind, text: text.replace(/\s+/g, " ").trim().slice(0, 60) });

  const visit = (n: ts.Node) => {
    if (ts.isJsxText(n) && hasWords(n.text)) {
      // One text node can span a paragraph: report each written line at its own line, so a sentence added inside old text is caught.
      const start = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line;
      const first = n.getText(sf).split("\n");
      first.forEach((l, i) => {
        if (hasWords(l)) out.push({ line: start + i + 1, kind: "JSX text", text: l.trim().slice(0, 60) });
      });
    }
    if (ts.isJsxExpression(n) && n.expression && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) {
      for (const s of shownStrings(n.expression)) if (hasWords(literalText(s))) add(s, "JSX string", literalText(s));
    }
    if (ts.isJsxAttribute(n) && TEXT_ATTRS.has(n.name.getText(sf)) && n.initializer) {
      const init = n.initializer;
      const exprs = ts.isStringLiteral(init) ? [init] : ts.isJsxExpression(init) && init.expression ? shownStrings(init.expression) : [];
      for (const s of exprs) if (hasWords(literalText(s))) add(s, n.name.getText(sf), literalText(s));
    }
    if (ts.isCallExpression(n) && SHOWN_CALLS.has(calleeName(n.expression)) && n.arguments[0]) {
      for (const s of shownStrings(n.arguments[0])) if (hasWords(literalText(s))) add(s, `${calleeName(n.expression)}()`, literalText(s));
    }
    // A server action's `{ error: "Pick a commander first" }`. Needs two words: `error: "not_found"` is a code.
    if (ts.isPropertyAssignment(n) && n.name.getText(sf) === "error") {
      for (const s of shownStrings(n.initializer)) if (multiWord(literalText(s))) add(s, "error:", literalText(s));
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/** The 1-based line numbers a `git diff -U0` adds, per file. A new file is every line. */
export function addedLines(diff: string): Map<string, Set<number>> {
  const out = new Map<string, Set<number>>();
  let file = "";
  for (const row of diff.split("\n")) {
    if (row.startsWith("+++ ")) {
      file = row.startsWith("+++ b/") ? row.slice(6).replace(/\t.*$/, "") : "";
      if (file) out.set(file, new Set());
    } else if (file && row.startsWith("@@")) {
      const m = /\+(\d+)(?:,(\d+))?/.exec(row);
      if (!m) continue;
      const start = Number(m[1]);
      const count = m[2] === undefined ? 1 : Number(m[2]);
      for (let i = 0; i < count; i++) out.get(file)!.add(start + i);
    }
  }
  return out;
}

/** A file the check reads: app code, not the copy files, tests, or anything the user never sees. */
export const inScope = (f: string) => /^src\/.*\.(ts|tsx)$/.test(f) && !f.startsWith("src/lib/copy/") && !/\.(test|spec)\.(ts|tsx)$/.test(f);
