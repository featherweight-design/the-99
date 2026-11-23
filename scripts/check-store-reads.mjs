// Fails when a call under `src/` to a store-taking price or art read leaves the reader's store out, outside the
// pending list. See `scripts/lib/store-reads.mjs`.
import { storeReadFindings } from "./lib/store-reads.mjs";

const { files, findings } = storeReadFindings(process.cwd());
if (findings.length === 0) {
  console.log(`every price and art read under src/ passes the reader's store, or is pending, ${files} files read`);
  process.exit(0);
}
for (const { path, line, why } of findings) console.error(`${path}:${line} ${why}`);
console.error(`\n${findings.length} store read finding(s): pass the reader's store (readerStoreForPage), or "manapool" where the surface is Mana Pool by rule`);
process.exit(1);
