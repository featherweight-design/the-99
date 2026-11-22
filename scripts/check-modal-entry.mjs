// Fails when an `aria-modal` surface under src has no phone slide-in and is not allow-listed with a reason.
// See `scripts/lib/modal-entry.mjs`.
import { modalEntryFindings } from "./lib/modal-entry.mjs";

const { files, surfaces, findings } = await modalEntryFindings("src");

if (findings.length === 0) {
  console.log(`every aria-modal surface has its phone entry or a reason — ${surfaces} surfaces in ${files} files`);
  process.exit(0);
}
for (const { path, kind, detail } of findings) console.error(`${path}: [${kind}] ${detail}`);
console.error(`\n${findings.length} modal-entry finding(s)`);
process.exit(1);
