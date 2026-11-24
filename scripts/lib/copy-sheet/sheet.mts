// The copy sheet: `exportSheet` lists every row of every module in src/lib/copy as CSV; `applySheet` reads the edited CSV
// back and returns the source of each file that changed. Nothing here touches git or the filesystem beyond reading the
// copy folder, so both scripts (and the PR 2 wrapper) share one tested core.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { parseCsv, toCsv } from "./csv.mjs";
import { problems } from "./validate.mjs";
import { copyRows, type CopyRow } from "./walk.mjs";

export const COPY_DIR = "src/lib/copy";
export const HEADER = ["key", "file", "kind", "current text", "placeholders", "context (read only)", "new text"] as const;

export function readCopyRows(root: string): CopyRow[] {
  const files = readdirSync(join(root, COPY_DIR)).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")).sort();
  return files.flatMap((f) => copyRows(`${COPY_DIR}/${f}`, readFileSync(join(root, COPY_DIR, f), "utf8")));
}

export function exportSheet(root: string): { csv: string; editable: number; readOnly: number; branches: number } {
  const rows = readCopyRows(root);
  const body = rows.map((r) => [r.key, r.file.replace(`${COPY_DIR}/`, ""), r.readOnly ? "edit in code" : r.context.includes(" when ") ? "branch" : "text", r.text, r.placeholders.map((p) => `{${p}}`).join(" "), r.context, ""]);
  return {
    csv: toCsv([[...HEADER], ...body]),
    editable: rows.filter((r) => !r.readOnly).length,
    readOnly: rows.filter((r) => r.readOnly).length,
    branches: rows.filter((r) => !r.readOnly && r.context.includes(" when ")).length,
  };
}

const escapeFor = (q: CopyRow["quote"], s: string) => s.replace(/\\/g, "\\\\").replace(new RegExp(q === "`" ? "[`]|\\$\\{" : q, "g"), (m) => `\\${m}`);

/** The source that replaces a node: the literal or template, quotes kept. */
function render(row: CopyRow, next: string): string {
  const text = row.isTemplate ? escapeFor("`", next).replace(/\\\{([^{}]*)\}/g, "{$1}").replace(/\{([^{}]+)\}/g, (_, name: string) => `\${${row.holes[name] ?? name}}`) : escapeFor(row.quote, next);
  return row.isTemplate ? `\`${text}\`` : `${row.quote}${text}${row.quote}`;
}

export type Change = { key: string; from: string; to: string };
export type Applied = { files: Map<string, string>; changes: Change[] };

/** Applies every changed row, or throws one error naming every bad row (nothing is applied on any failure). */
export function applySheet(csv: string, root: string): Applied {
  const table = parseCsv(csv);
  const head = table[0] ?? [];
  if (HEADER.some((h, i) => head[i] !== h)) throw new Error(`the sheet's header is not the exported one (${HEADER.join(", ")})`);
  const rows = new Map(readCopyRows(root).map((r) => [r.key, r]));
  const errors: string[] = [];
  const edits = new Map<string, { row: CopyRow; next: string }[]>();
  const changes: Change[] = [];
  const seen = new Set<string>();
  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    if (cells.every((c) => c === "")) return;
    const [key, , , current, , , next = ""] = cells;
    if (seen.has(key)) return void errors.push(`row ${line}: the key ${key} appears twice`);
    seen.add(key);
    if (next === "") return;
    const row = rows.get(key);
    if (!row) return void errors.push(`row ${line}: ${key} is not in the copy files (the sheet is from an older export)`);
    if (current !== row.text) return void errors.push(`row ${line}: ${key} changed in the code since this sheet was exported (sheet: "${current}", code: "${row.text}"); export again`);
    if (next === row.text) return;
    const bad = problems(row, next);
    if (bad.length) return void errors.push(`row ${line}: ${key}: ${bad.join("; ")}`);
    edits.set(row.file, [...(edits.get(row.file) ?? []), { row, next }]);
    changes.push({ key, from: row.text, to: next });
  });
  if (errors.length) throw new Error(`${errors.length} bad row${errors.length === 1 ? "" : "s"}, nothing applied:\n${errors.join("\n")}`);
  const files = new Map<string, string>();
  for (const [file, list] of edits) {
    let src = readFileSync(join(root, file), "utf8");
    for (const { row, next } of [...list].sort((a, b) => b.row.start - a.row.start)) src = src.slice(0, row.start) + render(row, next) + src.slice(row.end);
    const syntax = ts.transpileModule(src, { reportDiagnostics: true, fileName: file, compilerOptions: { target: ts.ScriptTarget.Latest } }).diagnostics ?? [];
    if (syntax.length) throw new Error(`${file}: the edit left invalid source (${ts.flattenDiagnosticMessageText(syntax[0].messageText, " ")}); nothing applied`);
    files.set(file, src);
  }
  return { files, changes };
}
