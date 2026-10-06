/**
 * Flexible CSV parser (READINESS #1).
 * Covers ManaBox, Moxfield, Archidekt, Deckbox, and plain "Name,Qty" exports.
 * Header match is case-insensitive; only Name + Quantity are required.
 *
 * Row.line is the 1-based line number in the source CSV (header is line 1),
 * so errors and unmatched rows can point the user back at the file (READINESS #2).
 */
import type { Finish } from "../collection/key";

export type CollectionRow = {
  name: string;
  /** Lowercased at parse time — Scryfall's codes are lowercase and the printings join is exact. */
  setCode: string;
  /** "" when the export has no collector-number column, matching the column default. */
  collectorNumber: string;
  quantity: number;
  scryfallId: string | null;
  finish: Finish;
  condition: string | null;
  line: number;
};
export type ParseError = { line: number; raw: string; reason: string };

const NAME_HEADERS = ["name", "card name", "card"];
const QUANTITY_HEADERS = ["quantity", "count", "qty"];
// "set code" first: ManaBox ships both `Set code` and `Set name`, and findHeaderIndex
// returns the first candidate that exists, so the code column must be tried first.
const SET_HEADERS = ["set code", "set", "edition"];
const COLLECTOR_NUMBER_HEADERS = ["collector number", "collector no", "number", "cn"];
const FOIL_HEADERS = ["foil", "finish"];
const CONDITION_HEADERS = ["condition"];
const SCRYFALL_HEADERS = ["scryfall id"];

/**
 * Foil/Finish column values → Scryfall's finish vocabulary. ManaBox emits normal/foil/etched;
 * the other supported exports emit true/false, 1/0, or nothing at all. ANY unrecognized value
 * falls back to "nonfoil", which keeps the Moxfield / Archidekt / Deckbox / bare "Name,Qty"
 * exports importing.
 *
 * This inverts the old boolean, which allowlisted the NON-foil values and so called anything
 * else foil — including "0". Every truthy spelling therefore has to be listed here explicitly
 * or a CSV that encodes the column as 1/0 silently loses its foils.
 */
const FINISH_VALUES = new Map<string, Finish>([
  ["foil", "foil"],
  ["true", "foil"],
  ["yes", "foil"],
  ["1", "foil"],
  ["etched", "etched"],
  ["foil etched", "etched"],
  ["etched foil", "etched"],
]);

export function parseFinish(raw: string): Finish {
  return FINISH_VALUES.get(raw.trim().toLowerCase()) ?? "nonfoil";
}

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

/**
 * True when `csvText`'s first line is a header row — comma-split into more
 * than one cell — carrying a recognized Name or Quantity column. Read the
 * same way `parseCollectionCsv` reads its own header: literally line 0,
 * never the first non-blank line, so a text this accepts is a text
 * `parseCollectionCsv` will read the header off correctly too.
 *
 * EITHER column, not both: a header missing just one — "Name,Amount" with no
 * recognized Quantity header — still has to reach `parseCollectionCsv` so
 * its own "header missing Quantity column" error surfaces, rather than
 * falling through to the paste parser and reporting the generic "none of
 * these lines matched a card" instead. Multi-cell is what keeps a plain
 * decklist line out: "1 Sol Ring" is one cell with no comma at all, and even
 * a card name that contains one — "1 Kiki-Jiki, Mirror Breaker" — splits
 * into cells that match neither candidate list.
 */
export function looksLikeCsv(csvText: string): boolean {
  const lines = csvText.split(/\r?\n/);
  if (lines.every((l) => l.trim() === "")) return false;
  const header = splitCsvLine(lines[0]);
  if (header.length < 2) return false;
  return findHeaderIndex(header, NAME_HEADERS) !== -1 || findHeaderIndex(header, QUANTITY_HEADERS) !== -1;
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
  const collectorIdx = findHeaderIndex(header, COLLECTOR_NUMBER_HEADERS);
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
    rows.push({
      name,
      // Lowercased on write (§3.3): ManaBox stores set codes raw and UPPERCASE while Scryfall's
      // are lowercase, so the printings join would match zero rows without this.
      setCode: setIdx !== -1 ? (cols[setIdx] ?? "").trim().toLowerCase() : "",
      collectorNumber: collectorIdx !== -1 ? (cols[collectorIdx] ?? "").trim() : "",
      quantity,
      scryfallId: scryfallIdx !== -1 ? ((cols[scryfallIdx] ?? "").trim() || null) : null,
      finish: parseFinish(foilIdx !== -1 ? (cols[foilIdx] ?? "") : ""),
      condition: conditionIdx !== -1 ? ((cols[conditionIdx] ?? "").trim() || null) : null,
      line: i + 1,
    });
  }
  return { rows, errors };
}

