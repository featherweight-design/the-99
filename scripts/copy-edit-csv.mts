// pnpm exec tsx scripts/copy-edit-csv.mts <out.csv>
// The `Copy edit` workflow's first step: the edits the editor sent (COPY_EDIT_EDITS, JSON) and the branch it named
// (COPY_EDIT_BRANCH), checked again here (the route's check is not trusted), written as the copy sheet `pnpm copy:import`
// reads. This builds the sheet and nothing else: the import's own checks (`problems()` on every row, the stale check
// against main) run again when the sheet is applied, and the import is the only commit path.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCsv, toCsv } from "./lib/copy-sheet/csv.mjs";
import { exportSheet } from "./lib/copy-sheet/sheet.mjs";
import { EDIT_BRANCH_RE, parseSubmission } from "./lib/copy-sheet/submission.mjs";

const out = process.argv[2];
const fail = (m: string): never => {
  console.error(m);
  process.exit(1);
};
if (!out) fail("usage: copy-edit-csv.mts <out.csv>");
if (!EDIT_BRANCH_RE.test(process.env.COPY_EDIT_BRANCH ?? "")) fail("the branch name is not copy-edit-YYYYMMDD-HHMMSS");
let raw: unknown;
try {
  raw = JSON.parse(process.env.COPY_EDIT_EDITS ?? "");
} catch {
  fail("the edits are not JSON");
}
const parsed = parseSubmission({ edits: raw });
if ("error" in parsed) fail(`the edits are refused: ${parsed.error}`);
else {
  const table = parseCsv(exportSheet(resolve(".")).csv);
  const byKey = new Map(table.slice(1).map((r) => [r[0], r]));
  const errors: string[] = [];
  for (const e of parsed.edits) {
    const row = byKey.get(e.key);
    if (!row) errors.push(`${e.key} is not in the copy files`);
    else if (row[2] === "edit in code") errors.push(`${e.key} is read-only`);
    else if (row[3] !== e.from) errors.push(`${e.key} changed on main since it was edited`);
    else row[6] = e.to;
  }
  if (errors.length) fail(`${errors.length} bad edit${errors.length === 1 ? "" : "s"}:\n${errors.join("\n")}`);
  writeFileSync(out, toCsv(table));
  console.log(`${parsed.edits.length} edit${parsed.edits.length === 1 ? "" : "s"} written to the sheet`);
}
