// Fails when a module outside `src/lib/payments/**` imports `stripe` or touches a Stripe table. See `scripts/lib/payments-reads.mjs`.
import { paymentReadFindings } from "./lib/payments-reads.mjs";

const { files, findings } = await paymentReadFindings(process.cwd());
if (findings.length === 0) {
  console.log(`no stripe import or Stripe table outside src/lib/payments, ${files} files read`);
  process.exit(0);
}
for (const { path, line, why } of findings) console.error(`${path}:${line} ${why}: payments are reached only through src/lib/payments`);
console.error(`\n${findings.length} payment read(s) outside src/lib/payments`);
process.exit(1);
