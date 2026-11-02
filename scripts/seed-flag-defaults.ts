import "./lib/env.mjs";
import { runFlagSeed } from "./lib/seed-flags";

// `pnpm db:migrate`'s second step: seeds the flag defaults on the branch `.env` names, as each deploy does on its own.
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
void runFlagSeed(url, process.env);
