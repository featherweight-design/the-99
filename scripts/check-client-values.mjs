// Fails when a server module value-imports a non-component from a "use client" module (a client reference
// reaches it, not the value). See `scripts/lib/client-value-imports.mjs`.
import { clientValueFindings } from "./lib/client-value-imports.mjs";

const findings = clientValueFindings(process.cwd());
if (findings.length === 0) {
  console.log("no server module takes a value from a \"use client\" module, only components");
  process.exit(0);
}
for (const { path, name, from } of findings) console.error(`${path}: imports ${name} from ${from}, a "use client" module: the server gets a client reference, not the value`);
console.error(`\n${findings.length} finding(s). Move the value to a module with no "use client" directive and import it from there.`);
process.exit(1);
