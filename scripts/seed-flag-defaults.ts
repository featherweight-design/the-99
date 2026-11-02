import "./lib/env.mjs";
import { runFlagSeed } from "./lib/seed-flags";

// `pnpm db:seed:flags`: seeds the flag defaults on the branch `.env` names (`env.mjs` loads `.env` over the shell), as
// each deploy does on its own after its migrations. Run it after `pnpm db:migrate` on a branch that lacks the rows.
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
void runFlagSeed(url, process.env);
