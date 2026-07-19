/**
 * Flexible CSV parser (READINESS #1).
 * Covers ManaBox, Moxfield, Archidekt, Deckbox, and plain "Name,Qty" exports.
 * Header match is case-insensitive; only Name + Quantity are required.
 *
 * Row.line is the 1-based line number in the source CSV (header is line 1),
 * so errors and unmatched rows can point the user back at the file (READINESS #2).
 */
export type CollectionRow = {
  name: string;
  setCode: string;
  quantity: number;
  scryfallId: string | null;
  foil: boolean;
  condition: string | null;
  line: number;
};
export type ParseError = { line: number; raw: string; reason: string };

const NAME_HEADERS = ["name", "card name", "card"];
const QUANTITY_HEADERS = ["quantity", "count", "qty"];
const SET_HEADERS = ["set code", "set", "edition"];
const FOIL_HEADERS = ["foil", "finish"];
const CONDITION_HEADERS = ["condition"];
const SCRYFALL_HEADERS = ["scryfall id"];

// Foil column values that mean "not foil". Empty string also means not foil.
const NON_FOIL_VALUES = new Set(["", "normal", "false", "nonfoil"]);

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function findHeaderIndex(header: string[], candidates: string[]): number {
  const lower = header.map((h) => h.trim().toLowerCase());
  for (const c of candidates) {
    const i = lower.indexOf(c);
    if (i !== -1) return i;
  }
  return -1;
}

export function parseCollectionCsv(csvText: string): { rows: CollectionRow[]; errors: ParseError[] } {
  const lines = csvText.split(/\r?\n/);
  if (lines.every((l) => l.trim() === "")) {
    return { rows: [], errors: [{ line: 1, raw: "", reason: "empty file" }] };
  }

  const header = splitCsvLine(lines[0]);
  const nameIdx = findHeaderIndex(header, NAME_HEADERS);
  const qtyIdx = findHeaderIndex(header, QUANTITY_HEADERS);
  if (nameIdx === -1) {
    return { rows: [], errors: [{ line: 1, raw: lines[0], reason: "header missing Name column" }] };
  }
  if (qtyIdx === -1) {
    return { rows: [], errors: [{ line: 1, raw: lines[0], reason: "header missing Quantity column" }] };
  }
  const setIdx = findHeaderIndex(header, SET_HEADERS);
  const foilIdx = findHeaderIndex(header, FOIL_HEADERS);
  const conditionIdx = findHeaderIndex(header, CONDITION_HEADERS);
  const scryfallIdx = findHeaderIndex(header, SCRYFALL_HEADERS);

  const rows: CollectionRow[] = [];
  const errors: ParseError[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    const cols = splitCsvLine(lines[i]);
    // A row is only fatal if it can't reach the required columns.
    const requiredMax = Math.max(nameIdx, qtyIdx);
    if (cols.length <= requiredMax) {
      errors.push({ line: i + 1, raw: lines[i], reason: `expected at least ${requiredMax + 1} columns, got ${cols.length}` });
      continue;
    }
    const quantity = Number(cols[qtyIdx]);
    // Cap matches parsePasteList's MAX_QUANTITY — collection_items.quantity is a PG integer.
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10_000) {
      errors.push({ line: i + 1, raw: lines[i], reason: `invalid quantity "${cols[qtyIdx]}"` });
      continue;
    }
    const name = cols[nameIdx].trim();
    if (name === "") {
      errors.push({ line: i + 1, raw: lines[i], reason: "missing card name" });
      continue;
    }
    const foilRaw = foilIdx !== -1 ? (cols[foilIdx] ?? "").trim().toLowerCase() : "";
    rows.push({
      name,
      setCode: setIdx !== -1 ? (cols[setIdx] ?? "").trim() : "",
      quantity,
      scryfallId: scryfallIdx !== -1 ? ((cols[scryfallIdx] ?? "").trim() || null) : null,
      foil: !NON_FOIL_VALUES.has(foilRaw),
      condition: conditionIdx !== -1 ? ((cols[conditionIdx] ?? "").trim() || null) : null,
      line: i + 1,
    });
  }
  return { rows, errors };
}

