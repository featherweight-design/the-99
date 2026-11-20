// Fails when the migration ledger's journal order, numbering, files or snapshot chain disagree.
// See `scripts/lib/migrations-order.mjs` for why. Static, no database, instant.
//   node scripts/check-migrations.mjs [--dir <drizzle dir>] [--journal <_journal.json path>]
import { auditMigrationLedger } from "./lib/migrations-order.mjs";

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
};
const dir = arg("--dir") ?? "drizzle";
const journal = arg("--journal");

const problems = auditMigrationLedger(dir, { journal });
if (problems.length === 0) {
  console.log("Migration journal, files and snapshot chain agree.");
  process.exit(0);
}
for (const p of problems) console.error(p);
console.error(
  `${problems.length} problem(s). A migration takes main's next number at its final rebase, ` +
    `generated fresh from main's latest snapshot (docs/agents/ops.md).`,
);
process.exit(1);
