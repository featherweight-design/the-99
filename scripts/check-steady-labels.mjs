// Fails when a button swaps to a shorter label while pending and is not drawn through `SteadyLabel`. See
// scripts/lib/steady-labels.mjs for what counts as a swap; `pnpm probe:pending-width` proves the fix on a real button.
import { steadyFindings } from "./lib/steady-labels.mjs";

// Buttons that hold their width by their own means (stacked labels in one grid cell).
const OWN = new Set(["src/components/social/invite-new.tsx", "src/components/intake/intake-form.tsx"]);

const { files, findings } = await steadyFindings();
const bare = findings.filter((f) => !OWN.has(f.path));
if (bare.length === 0) {
  console.log(`every pending label swap is steady — ${files} files read`);
  process.exit(0);
}
for (const { path, line } of bare) console.error(`${path}:${line} a button swaps label while pending without SteadyLabel (it shrinks under the pointer)`);
console.error(`\n${bare.length} bare label swap(s): wrap the label in <SteadyLabel hold={[every string it can show]}>`);
process.exit(1);
