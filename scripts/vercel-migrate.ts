import { spawnSync } from "node:child_process";
import { decideMigration } from "../src/lib/deploy/migrate-decision";

// The one script that deliberately does not import `scripts/lib/env.mjs`: this
// must read only the real deployment environment, so a stray .env in a build
// container cannot redirect a production migration.
const decision = decideMigration(process.env);

if (decision.action === "skip") {
  console.log(decision.reason);
  process.exit(0);
}

if (decision.action === "fail") {
  console.error(decision.reason);
  process.exit(1);
}

console.log("Applying migrations before build...");

// drizzle.config.ts reads DATABASE_URL, and this maps the migration url onto that
// name for the child. Keeping the config file as the one source of truth for
// migration settings leaves `pnpm db:migrate` unchanged, and the mapping means this
// script never has to restate what that config decides.
//
// This comment used to justify the mapping by saying a Sensitive variable is
// unreadable by a build step. That claim is NOT established: `MIGRATE_DATABASE_URL`
// is Sensitive on both projects and production builds plainly read it (2026-09-21).
// The mapping stands on its own reason above.
const result = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: decision.databaseUrl },
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
