import { spawnSync } from "node:child_process";
import { decideMigration } from "../src/lib/deploy/migrate-decision";

// Deliberately no `import "dotenv/config"` (unlike scripts/seed-cards.ts): this must
// read only the real deployment environment, so a stray .env in a build container
// cannot redirect a production migration.
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

// drizzle.config.ts reads DATABASE_URL, which is marked sensitive in Vercel and so
// is unreadable here. Mapping it in the child env keeps the config file as the one
// source of truth for migration settings and leaves `pnpm db:migrate` unchanged.
const result = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: decision.databaseUrl },
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
