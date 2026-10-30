// Fails when a third-party name is minted, revealed or turned into a string outside the places allowed. See
// `scripts/lib/third-party-names.mjs`.
import { thirdPartyNameFindings } from "./lib/third-party-names.mjs";

const { files, findings } = thirdPartyNameFindings(process.cwd());
if (findings.length === 0) {
  console.log(`no third-party name minted, revealed or stringified outside its places, ${files} files read`);
  process.exit(0);
}
for (const { path, line, why } of findings) console.error(`${path}:${line} ${why}`);
console.error(`\n${findings.length} finding(s): another reader's name is minted only in src/lib/social (named), drawn only by PersonName, PersonText and personAttrs, and revealed only where scripts/lib/third-party-names-rules.mjs allows`);
process.exit(1);
