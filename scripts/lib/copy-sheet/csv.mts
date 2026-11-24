// RFC 4180 CSV, both ways, for the copy sheet. Sheets and Excel both write quoted fields with embedded commas, quotes and
// line breaks, and Excel prefixes a UTF-8 byte-order mark, so the reader strips it and the writer adds it back (Excel
// reads a BOM-less file as Windows-1252 and turns the curly apostrophes in the copy into mojibake).

const BOM = "﻿";

export function toCsv(rows: readonly (readonly string[])[]): string {
  const cell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return BOM + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export function parseCsv(text: string): string[][] {
  const src = text.startsWith(BOM) ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("the sheet ends inside a quoted cell: a quote is unbalanced");
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
