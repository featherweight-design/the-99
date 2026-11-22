/**
 * A list of flat records as COLUMNS, one array per key, for a payload that is the same keys on
 * every record and thousands of records long.
 *
 * Row-wise JSON says every key name on every record and keeps each record's values apart, so
 * neither the wire nor a compressor sees what a column has in common. Per column this stores:
 *
 *   - `v`: the values, dense when every record has the key. Absent is not null (a withheld card
 *     has no `imageUri`, a card with no price has no `price`), so a column some records lack is
 *     sparse: `x` lists the records that have it and `v` holds only theirs.
 *   - `d`: a dictionary, when the column repeats a lot (type lines, rarities, set codes, color
 *     identities): `v` then holds indexes into it. Any JSON value can be an entry.
 *   - `u`: set when every string in the column is a UUID, optionally followed by a `?stamp`
 *     (a stemmed Scryfall image). They are stored as 22-character base64url instead of 36 hex
 *     characters, which no compressor can do: hex is 4 bits of information per character, and
 *     a UUID is the one thing on a card that does not repeat.
 *
 * `fromColumns(toColumns(rows))` equals `rows` (key order aside), a key whose value is
 * `undefined` counting as absent as JSON would have it. Shared by the cache entry and the wire
 * (`collection/list-wire.ts`) so one encoding is measured and kept correct.
 */

export type Column = { v: unknown[]; x?: number[]; d?: unknown[]; u?: 1 };
export type ColumnTable = { n: number; cols: Record<string, Column> };

const UUID = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})(\?\d+)?$/;
const SHORT = /^([A-Za-z0-9_-]{22})(\?\d+)?$/;

// btoa and atob, not Node's byte buffers: `fromColumns` runs in the browser, which has none.
const shorten = (s: string): string | null => {
  const m = UUID.exec(s);
  if (!m) return null;
  const hex = m.slice(1, 6).join("");
  let bin = "";
  for (let i = 0; i < 32; i += 2) bin += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") + (m[6] ?? "");
};

const lengthen = (s: string): string => {
  const m = SHORT.exec(s)!;
  const bin = atob(m[1].replace(/-/g, "+").replace(/_/g, "/"));
  let h = "";
  for (let i = 0; i < bin.length; i++) h += bin.charCodeAt(i).toString(16).padStart(2, "0");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}${m[2] ?? ""}`;
};

/** The column's values with every string shortened, or null when any string is not a UUID (or there are none). */
function shortened(values: unknown[]): unknown[] | null {
  let strings = 0;
  let failed = false;
  const out = values.map((value) => {
    if (typeof value !== "string") return value;
    strings++;
    const short = shorten(value);
    if (short === null) failed = true;
    return short;
  });
  return strings > 0 && !failed ? out : null;
}

export function toColumns(rows: readonly object[]): ColumnTable {
  const keys = new Set<string>();
  for (const row of rows) for (const key of Object.keys(row)) keys.add(key);
  const cols: Record<string, Column> = {};
  for (const key of keys) {
    const x: number[] = [];
    let v: unknown[] = [];
    rows.forEach((row, i) => {
      const value = (row as Record<string, unknown>)[key];
      if (value === undefined) return;
      x.push(i);
      v.push(value);
    });
    const col: Column = { v };
    if (x.length !== rows.length) col.x = x;
    // A dictionary when no more than half the values are distinct.
    const index = new Map<string, number>();
    const entries: unknown[] = [];
    const codes = v.map((value) => {
      const text = JSON.stringify(value);
      let code = index.get(text);
      if (code === undefined) {
        code = entries.length;
        index.set(text, code);
        entries.push(value);
      }
      return code;
    });
    if (entries.length * 2 <= v.length) {
      col.d = entries;
      col.v = codes;
      v = entries;
    }
    const short = shortened(v);
    if (short) {
      col.u = 1;
      if (col.d) col.d = short;
      else col.v = short;
    }
    cols[key] = col;
  }
  return { n: rows.length, cols };
}

export function fromColumns<T = Record<string, unknown>>(table: ColumnTable): T[] {
  const rows: Record<string, unknown>[] = Array.from({ length: table.n }, () => ({}));
  for (const [key, col] of Object.entries(table.cols)) {
    const open = (value: unknown) => (col.u && typeof value === "string" ? lengthen(value) : value);
    const dict = col.d?.map(open);
    col.v.forEach((value, i) => {
      rows[col.x ? col.x[i] : i][key] = dict ? dict[value as number] : open(value);
    });
  }
  return rows as T[];
}
