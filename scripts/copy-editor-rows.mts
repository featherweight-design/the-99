// pnpm copy:rows
// Writes .generated/copy-rows.json: the rows of src/lib/copy that the on-page copy editor matches visible text against.
// Runs before `next build` (see the build scripts), so the route reads a file and the compiler stays out of its trace.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { EditorRow } from "../src/lib/copy-editor/rows";
import { kindOf, readCopyRows } from "./lib/copy-sheet/sheet.mjs";

const out = join(process.cwd(), ".generated", "copy-rows.json");
const rows: EditorRow[] = readCopyRows(process.cwd()).map((r) => ({ key: r.key, kind: kindOf(r), text: r.text, placeholders: r.placeholders, context: r.context, readOnly: r.readOnly }));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(rows));
console.log(`copy editor rows: ${rows.length} written to .generated/copy-rows.json`);
