// pnpm check:copy-sheet-roundtrip
// Fails when an UNEDITED export of the copy files does not import back to zero changes. That is the property the whole
// sheet rests on: if a walker change or a new copy shape makes export and import disagree about a row, the first real
// edit would silently rewrite or refuse a string nobody touched. Reads the working tree; writes nothing.
import { applySheet, exportSheet } from "./lib/copy-sheet/sheet.mjs";

const root = process.cwd();
const { csv, editable, readOnly } = exportSheet(root);
try {
  const { changes } = applySheet(csv, root);
  if (changes.length > 0) {
    console.error(`An unedited copy sheet imports ${changes.length} change(s):`);
    for (const c of changes.slice(0, 10)) console.error(`  ${c.key}: "${c.from}" -> "${c.to}"`);
    process.exit(1);
  }
} catch (e) {
  console.error(`An unedited copy sheet does not import: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
console.log(`copy sheet round-trip ok: ${editable} editable rows, ${readOnly} read-only, zero changes`);
