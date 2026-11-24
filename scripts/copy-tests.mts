// pnpm copy:tests <path-prefix|file>... [--write] [--all]
// Converts the test literals that equal a copy leaf into a reference to the leaf, for the named test files (a file, or a
// directory prefix such as src/components/decks). Dry by default: prints the counts and the literals that need a person.
//   --write   write the rewritten test files
//   --all     list every hand edit, not the first 40
// Twin text (the same words in several leaves) resolves to the twin whose access path the component under test writes.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { readCopyRows } from "./lib/copy-sheet/sheet.mjs";
import { rewriteTests } from "./lib/copy-sheet/test-rewrite.mjs";
import { MIN_WORDS } from "./lib/test-copy-literals.mjs";

const args = process.argv.slice(2);
const targets = args.filter((a) => !a.startsWith("--"));
if (!targets.length) {
  console.error("usage: pnpm copy:tests <path-prefix|file>... [--write] [--all]");
  process.exit(2);
}
const root = process.cwd();
const rows = readCopyRows(root).filter((r) => r.text.trim().split(/\s+/).length >= MIN_WORDS);
const all = rewriteTests(rows.map((r) => ({ key: r.key, from: r.text, to: r.text })), root, { disambiguate: true });
const inScope = (f: string) => targets.some((t) => f === t || f.startsWith(t.endsWith("/") ? t : `${t}/`));
const hand = all.hand.filter((h) => inScope(h.file));
const done = all.rewritten.filter((r) => inScope(r.file));
console.log(`rewritten: ${done.reduce((n, r) => n + r.count, 0)} literals in ${done.length} files; hand edits: ${hand.length}`);
for (const h of hand.slice(0, args.includes("--all") ? hand.length : 40)) console.log(`${h.file}:${h.line}  "${h.text}"  ${h.why}`);
if (args.includes("--write")) for (const r of done) writeFileSync(join(root, r.file), all.files.get(r.file)!);
