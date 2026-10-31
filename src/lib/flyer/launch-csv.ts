/**
 * The launch list's CSV (flyer admin PR C; CSV.dc.html C1 and C2). PURE: no database, no clock. Four columns in this
 * order, `email, store, code, added_at`, a header row always (zero addresses is a header and nothing else), CRLF line
 * ends and a closing CRLF (RFC 4180), UTF-8 WITHOUT a byte order mark.
 *
 * No BOM, on purpose: an importer keys on the first header, and a BOM silently renames `email` to `﻿email` in
 * Python's csv reader and several mailing tools. The cost is Excel on Windows misreading a non-ASCII store label as
 * Latin-1; Numbers, Sheets and every parser read it right. To add one, prefix the string returned by `launchListCsv`
 * (the only place that would change).
 *
 * A cell that starts with `=`, `+`, `-` or `@` gets a leading `'` so a spreadsheet reads it as text, not a formula; an
 * address is typed by a stranger, so the guard covers every cell. `store` and `code` are null for an address left on a
 * code nobody made (the read is a left join) and draw as blank cells.
 */

export type LaunchCsvRow = {
  email: string;
  store: string | null;
  code: string | null;
  addedAt: Date;
};

export const LAUNCH_CSV_HEADER = ["email", "store", "code", "added_at"] as const;

const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;

export function csvCell(value: string | null): string {
  if (value === null || value === "") return "";
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** ISO 8601 in UTC with no milliseconds: `2026-10-31T18:02:11Z`. */
export function csvTimestamp(at: Date): string {
  return at.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** `rows` in the order given (the read hands them oldest first). */
export function launchListCsv(rows: readonly LaunchCsvRow[]): string {
  const lines = [LAUNCH_CSV_HEADER.join(","), ...rows.map((r) => [csvCell(r.email), csvCell(r.store), csvCell(r.code), csvTimestamp(r.addedAt)].join(","))];
  return `${lines.join("\r\n")}\r\n`;
}

/** `the-99-launch-list-YYYY-MM-DD.csv`, dated with the UTC day of the download. */
export function launchListFilename(now: Date): string {
  return `the-99-launch-list-${now.toISOString().slice(0, 10)}.csv`;
}
