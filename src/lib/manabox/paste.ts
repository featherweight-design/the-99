import type { CollectionRow, ParseError } from "./parse";

/**
 * Parse a plain-text paste list.
 * Supported line shapes (all trimmed, blank lines ignored):
 *   "3 Sol Ring"
 *   "3x Sol Ring"
 *   "Sol Ring"          → quantity 1
 *   "1 Sol Ring (LTC) 284 *F*" → set LTC, collector number 284, foil
 * The trailing printing identity is the text export ManaBox and Moxfield write:
 * a set code in round brackets, an optional collector number, and optional
 * `*F*` / `*E*` (foil / etched) flags. Without reading it, the whole tail stays
 * glued to the name and every such line comes back unmatched.
 * A leading integer <= 0, a quantity above MAX_QUANTITY, or an empty name
 * after quantity strip → ParseError. Row.line is the 1-based input line
 * (blank lines still count toward the index so the number matches the paste).
 */
const MAX_QUANTITY = 10_000;

// The printing identity a line names, `(SET) CN`. Read here for both callers: a collection row
// keeps its printing, and the deck import (src/lib/decks/import.ts) leaves the printing on the
// line for this parser, so a printing the player holds can become the deck's pick.
const ANNOTATION_RE = /\s+\*([A-Za-z]+)\*$/;
const SET_CODE_RE = /\s+\(([A-Za-z0-9]{2,6})\)(?:\s+([A-Za-z0-9★†-]+))?$/;

function splitPrinting(text: string): Pick<CollectionRow, "name" | "setCode" | "collectorNumber" | "finish"> {
  let rest = text;
  let finish: CollectionRow["finish"] = "nonfoil";
  for (let m = ANNOTATION_RE.exec(rest); m; m = ANNOTATION_RE.exec(rest)) {
    const flag = m[1].toUpperCase();
    if (flag === "F") finish = "foil";
    else if (flag === "E") finish = "etched";
    rest = rest.slice(0, m.index);
  }
  const set = SET_CODE_RE.exec(` ${rest}`);
  if (!set) return { name: text.trim(), setCode: "", collectorNumber: "", finish: "nonfoil" };
  return { name: rest.slice(0, Math.max(0, set.index - 1)).trim(), setCode: set[1].toLowerCase(), collectorNumber: set[2] ?? "", finish };
}

export function parsePasteList(text: string): { rows: CollectionRow[]; errors: ParseError[] } {
  const lines = text.split(/\r?\n/);
  const rows: CollectionRow[] = [];
  const errors: ParseError[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (trimmed === "") continue;

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
      errors.push({ line: i + 1, raw, reason: "missing card name" });
      continue;
    } else {
      quantity = 1;
      name = trimmed;
    }

    // Checked after the printing comes off, so a line that is only a printing
    // ("1 (ECL) 331") is a missing name, not a row with an empty one.
    const printing = splitPrinting(name);
    if (printing.name === "") {
      errors.push({ line: i + 1, raw, reason: "missing card name" });
      continue;
    }
    rows.push({
      // A bare line carries no printing identity, so set, collector number and
      // finish fall back to the collection_items column defaults and it keys as
      // it always has.
      ...printing,
      quantity,
      scryfallId: null,
      condition: null,
      line: i + 1,
    });
  }

  return { rows, errors };
}
