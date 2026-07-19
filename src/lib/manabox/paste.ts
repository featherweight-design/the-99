import type { ManaBoxRow, ParseError } from "./parse";

/**
 * Parse a plain-text paste list.
 * Supported line shapes (all trimmed, blank lines ignored):
 *   "3 Sol Ring"
 *   "3x Sol Ring"
 *   "Sol Ring"          → quantity 1
 * A leading integer <= 0, a quantity above MAX_QUANTITY, or an empty name
 * after quantity strip → ParseError.
 *
 * Produces ManaBoxRows compatible with matchRows() by name only:
 *   scryfallId is null (NOT "") so matchRows' `row.scryfallId && ...`
 *   short-circuits cleanly to the name-index lookup.
 */
// Quantities aggregate into Postgres `integer` columns downstream; cap well
// below overflow (no real collection holds more copies than this).
const MAX_QUANTITY = 10_000;

export function parsePasteList(text: string): { rows: ManaBoxRow[]; errors: ParseError[] } {
  const lines = text.split(/\r?\n/);
  const rows: ManaBoxRow[] = [];
  const errors: ParseError[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (trimmed === "") continue;

    // "3 name", "3x name", "3X name", or bare "name"
    const m = /^([+-]?\d+)\s*[xX]?\s+(.+)$/.exec(trimmed);
    let quantity: number;
    let name: string;
    if (m) {
      quantity = Number(m[1]);
      name = m[2].trim();
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_QUANTITY) {
        errors.push({ line: i + 1, raw, reason: `invalid quantity "${m[1]}"` });
        continue;
      }
    } else if (/^[+-]?\d+[xX]?$/.test(trimmed)) {
      // Only a quantity, no name.
      errors.push({ line: i + 1, raw, reason: "missing card name" });
      continue;
    } else {
      quantity = 1;
      name = trimmed;
    }

    if (name === "") {
      errors.push({ line: i + 1, raw, reason: "missing card name" });
      continue;
    }

    rows.push({
      name,
      setCode: "",
      quantity,
      scryfallId: null, // matchRows: null lets `?? byName.get(...)` run
      foil: false,
      condition: null,
      line: i + 1,
    });
  }

  return { rows, errors };
}
