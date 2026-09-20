// Fails when a migration declares a constraint name Postgres would truncate, or two that
// truncate alike. See `scripts/lib/constraints.mjs` for why. Static, no database, instant.
import { auditMigrations } from "./lib/constraints.mjs";

const findings = auditMigrations("drizzle");

if (findings.length === 0) {
  console.log("No migration declares an identifier Postgres would truncate.");
  process.exit(0);
}

for (const f of findings) {
  console.error(`${f.kind === "collision" ? "COLLISION" : "TOO LONG "}  ${f.file}`);
  console.error(`           ${f.relation}.${f.name}`);
  console.error(`           ${f.detail}`);
  console.error("");
}
console.error(
  `${findings.length} finding(s). Name the constraint explicitly in src/db/schema.ts — ` +
    `primaryKey({ name: "…", columns: […] }) or foreignKey({ name: "…", … }) — then delete ` +
    `the generated migration and re-run pnpm db:generate.`,
);
process.exit(1);
