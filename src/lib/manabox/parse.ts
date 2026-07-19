export type ManaBoxRow = {
  name: string; setCode: string; quantity: number;
  scryfallId: string | null; foil: boolean; condition: string | null;
};
export type ParseError = { line: number; raw: string; reason: string };

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

const REQUIRED = ["Name", "Set code", "Foil", "Quantity", "Scryfall ID", "Condition"] as const;

export function parseManaBoxCsv(csvText: string): { rows: ManaBoxRow[]; errors: ParseError[] } {
  // Keep original indices (blank lines skipped in the loop) so error line numbers match the file.
  const lines = csvText.split(/\r?\n/);
  if (lines.every((l) => l.trim() === "")) return { rows: [], errors: [{ line: 1, raw: "", reason: "empty file" }] };

  const header = splitCsvLine(lines[0]);
  const idx = Object.fromEntries(REQUIRED.map((c) => [c, header.indexOf(c)]));
  const missing = REQUIRED.filter((c) => idx[c] === -1);
  if (missing.length > 0) {
    return { rows: [], errors: [{ line: 1, raw: lines[0], reason: `header missing columns: ${missing.join(", ")}` }] };
  }

  const rows: ManaBoxRow[] = [];
  const errors: ParseError[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    const cols = splitCsvLine(lines[i]);
    if (cols.length < header.length) {
      errors.push({ line: i + 1, raw: lines[i], reason: `expected ${header.length} columns, got ${cols.length}` });
      continue;
    }
    const quantity = Number(cols[idx["Quantity"]]);
    if (!Number.isInteger(quantity) || quantity < 1) {
      errors.push({ line: i + 1, raw: lines[i], reason: `invalid quantity "${cols[idx["Quantity"]]}"` });
      continue;
    }
    rows.push({
      name: cols[idx["Name"]].trim(),
      setCode: cols[idx["Set code"]].trim(),
      quantity,
      scryfallId: cols[idx["Scryfall ID"]]?.trim() || null,
      foil: cols[idx["Foil"]].trim().toLowerCase() !== "normal",
      condition: cols[idx["Condition"]]?.trim() || null,
    });
  }
  return { rows, errors };
}
