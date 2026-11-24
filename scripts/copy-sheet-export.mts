// pnpm copy:sheet [out.csv]
// Writes the copy sheet to a CSV OUTSIDE the repository (default ~/Downloads/copy-sheet-<date>.csv): the sheet is working
// material for a person editing in Google Sheets or Excel and is never committed. Edit only the "new text" column.
import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { exportSheet } from "./lib/copy-sheet/sheet.mjs";

const out = resolve(process.argv[2] ?? join(homedir(), "Downloads", `copy-sheet-${new Date().toISOString().slice(0, 10)}.csv`));
if (out.startsWith(`${resolve(process.cwd())}/`) && !process.argv.includes("--in-repo")) {
  console.error("Refusing to write the sheet inside the repository: pass a path outside it (the sheet is never committed).");
  process.exit(1);
}
const { csv, editable, readOnly, branches } = exportSheet(process.cwd());
writeFileSync(out, csv);
console.log(`${editable} editable rows (${branches} of them branches of a function), ${readOnly} read-only ("edit in code"). Wrote ${out}`);
