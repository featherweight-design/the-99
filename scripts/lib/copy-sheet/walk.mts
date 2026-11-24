// Reads the copy modules as source and lists every user-facing string in them, each as one row with its position, so an
// edit lands in place (the file keeps its formatting, comments and code). A row is one text node: a string literal, a
// template with simple `${name}` holes, or one branch of a function leaf (`n === 1 ? "card" : "cards"` is two rows, each
// with the condition in its context). What a row cannot express is listed read-only ("edit in code"): templates with
// computed holes, function bodies that assemble text across statements, calls that carry text, computed keys.
import ts from "typescript";

export type CopyRow = {
  /** `src/lib/copy/<file>#a.b[0]`, with `#t<n>` appended when a function leaf holds several text nodes. */
  key: string;
  file: string;
  /** The text as the reader sees it, holes written `{name}`. */
  text: string;
  /** Hole names in source order, repeats kept. */
  placeholders: string[];
  /** Read-only: the function's arguments and the condition that selects this branch. Editable rows too, for the editor. */
  context: string;
  /** Empty when editable; otherwise why the row is read-only. */
  readOnly: string;
  /** Source span of the node to replace. */
  start: number;
  end: number;
  /** The literal's quote character, kept on write. */
  quote: '"' | "'" | "`";
  isTemplate: boolean;
  /** Computed holes (`${n === 1 ? "card" : "cards"}`) are opaque to the sheet: `{h1}` stands for the source in this map. */
  holes: Record<string, string>;
};

const SIMPLE_HOLE = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/;
/** A lowercase single token (`md`, `asc`, a route) is a code value that happens to live in a copy object, not copy. */
const CODE_TOKEN = /^([a-z0-9_.:/#@-]+|!?[A-Z][A-Z0-9]*_[A-Z0-9_]+)$/;

export function isCopyText(s: string): boolean {
  return /\p{L}/u.test(s) && !CODE_TOKEN.test(s);
}

const unwrap = (n: ts.Node): ts.Node => {
  let cur = n;
  while (ts.isParenthesizedExpression(cur) || ts.isAsExpression(cur) || ts.isSatisfiesExpression(cur) || ts.isNonNullExpression(cur)) cur = cur.expression;
  return cur;
};

const nameOf = (p: ts.PropertyName): string | null =>
  ts.isIdentifier(p) || ts.isStringLiteral(p) || ts.isNumericLiteral(p) || ts.isNoSubstitutionTemplateLiteral(p) ? p.text : null;

type Ctx = { file: string; sf: ts.SourceFile; rows: CopyRow[] };

function quoteOf(n: ts.Node, sf: ts.SourceFile): CopyRow["quote"] {
  const c = n.getText(sf)[0];
  return c === "'" ? "'" : c === "`" ? "`" : '"';
}

function push(ctx: Ctx, key: string, n: ts.Node, row: Pick<CopyRow, "text" | "placeholders" | "context" | "readOnly"> & { isTemplate: boolean; holes?: Record<string, string> }) {
  ctx.rows.push({ key, file: ctx.file, holes: {}, ...row, start: n.getStart(ctx.sf), end: n.getEnd(), quote: quoteOf(n, ctx.sf) });
}

/** A text node: a string, or a template whose holes are all plain names. Anything else under it is read-only. */
function textNode(ctx: Ctx, key: string, n: ts.Node, context: string): boolean {
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
    if (!isCopyText(n.text)) return true;
    push(ctx, key, n, { text: n.text, placeholders: [], context, readOnly: "", isTemplate: false });
    return true;
  }
  if (ts.isTemplateExpression(n)) {
    const names: string[] = [];
    const holes: Record<string, string> = {};
    let text = n.head.text;
    for (const span of n.templateSpans) {
      const expr = span.expression.getText(ctx.sf);
      let name = expr;
      if (!SIMPLE_HOLE.test(expr)) {
        name = `h${Object.keys(holes).length + 1}`;
        holes[name] = expr;
      }
      names.push(name);
      text += `{${name}}${span.literal.text}`;
    }
    const note = Object.entries(holes).map(([k, v]) => `${k} = ${v.replace(/\s+/g, " ")}`).join("; ");
    push(ctx, key, n, { text, placeholders: names, context: [context, note].filter(Boolean).join(" | "), readOnly: "", isTemplate: true, holes });
    return true;
  }
  return false;
}

function readOnly(ctx: Ctx, key: string, n: ts.Node, why: string, context: string) {
  const text = n.getText(ctx.sf).replace(/\s+/g, " ");
  push(ctx, key, n, { text: text.length > 160 ? `${text.slice(0, 157)}...` : text, placeholders: [], context, readOnly: `edit in code: ${why}`, isTemplate: false });
}

/** The text nodes a function leaf can return, each with the condition that picks it. */
function fnTexts(ctx: Ctx, n0: ts.Node, cond: string[], out: { node: ts.Node; cond: string[] }[], bad: { why: string | null }) {
  const n = unwrap(n0);
  if (ts.isConditionalExpression(n)) {
    const c = n.condition.getText(ctx.sf);
    fnTexts(ctx, n.whenTrue, [...cond, c], out, bad);
    fnTexts(ctx, n.whenFalse, [...cond, `not (${c})`], out, bad);
  } else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n)) out.push({ node: n, cond });
  else if (ts.isBlock(n)) {
    const last = n.statements[n.statements.length - 1];
    const others = n.statements.slice(0, -1);
    if (!last || !ts.isReturnStatement(last) || !last.expression) bad.why = "the function body is not a single return";
    else if (others.some((s) => !ts.isVariableStatement(s))) bad.why = "the function body does more than return text";
    else fnTexts(ctx, last.expression, cond, out, bad);
  } else if (ts.isObjectLiteralExpression(n)) {
    for (const p of n.properties) if (ts.isPropertyAssignment(p)) fnTexts(ctx, p.initializer, cond, out, bad);
  } else if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "plural") {
    // plural(n, "card", "cards"): the two words are the copy, the count is code.
    n.arguments.slice(1).forEach((a, i) => fnTexts(ctx, a, [...cond, `the ${i === 0 ? "singular" : "plural"} form`], out, bad));
  } else if (ts.isArrayLiteralExpression(n)) n.elements.forEach((e) => fnTexts(ctx, e, cond, out, bad));
  else if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    fnTexts(ctx, n.left, cond, out, bad);
    fnTexts(ctx, n.right, cond, out, bad);
  } else if (ts.isCallExpression(n) && n.arguments.some((a) => ts.isStringLiteralLike(a) && isCopyText(a.text))) bad.why = "the text is assembled by code, not written out";
  // A value that is not written text (a name, a call on arguments) is data the function passes through: no row, no failure.
}

function fnLeaf(ctx: Ctx, key: string, fn: ts.ArrowFunction | ts.FunctionExpression) {
  const args = `(${fn.parameters.map((p) => p.name.getText(ctx.sf)).join(", ")})`;
  const out: { node: ts.Node; cond: string[] }[] = [];
  const bad = { why: null as string | null };
  fnTexts(ctx, fn.body, [], out, bad);
  // A body that hides text in a block with locals, or calls a helper, is read-only as a whole.
  if (bad.why) return readOnly(ctx, key, fn, bad.why, args);
  if (out.length === 0) return; // passes data through (a name, a call with no written text): nothing to edit
  const several = out.length > 1;
  out.forEach((o, i) => {
    const context = `${args}${o.cond.length ? ` when ${o.cond.join(" and ")}` : ""}`;
    textNode(ctx, several ? `${key}#t${i + 1}` : key, o.node, context);
  });
}

function leaf(ctx: Ctx, key: string, n0: ts.Node) {
  const n = unwrap(n0);
  if (textNode(ctx, key, n, "")) return;
  if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) return /[.[]/.test(key.split("#")[1] ?? "") ? fnLeaf(ctx, key, n) : undefined;
  if (ts.isObjectLiteralExpression(n)) {
    for (const p of n.properties) {
      if (ts.isSpreadAssignment(p)) continue;
      if (!ts.isPropertyAssignment(p) && !ts.isShorthandPropertyAssignment(p) && !ts.isMethodDeclaration(p)) continue;
      const name = nameOf(p.name);
      if (name === null) {
        if (ts.isPropertyAssignment(p) && ((ts.isStringLiteralLike(unwrap(p.initializer)) && isCopyText((unwrap(p.initializer) as ts.StringLiteralLike).text)) || ts.isTemplateExpression(unwrap(p.initializer)))) readOnly(ctx, `${key}.<computed>`, p, "a computed key", "");
        continue;
      }
      if (ts.isPropertyAssignment(p)) leaf(ctx, key ? `${key}.${name}` : name, p.initializer);
    }
    return;
  }
  if (ts.isArrayLiteralExpression(n)) {
    n.elements.forEach((e, i) => leaf(ctx, `${key}[${i}]`, e));
    return;
  }
  // A call (`plural(n, "card", "cards")`, `parts(...)`) that carries written-out text is listed, read-only.
  if (ts.isCallExpression(n) && n.arguments.some((a) => ts.isStringLiteralLike(a) && isCopyText(a.text))) readOnly(ctx, key, n, "a helper call carries the text", "");
}

/** Every copy row in one module's source. `file` is the repo-relative path that prefixes each key. */
export function copyRows(file: string, source: string): CopyRow[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const ctx: Ctx = { file, sf, rows: [] };
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st) || !st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
    for (const d of st.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && d.initializer) leaf(ctx, `${file}#${d.name.text}`, d.initializer);
    }
  }
  return ctx.rows;
}
