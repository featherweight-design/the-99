// `pnpm db:index-due`: whether the commander index is due a build today, read from the database
// DATABASE_URL names (staging, in the `Commander index` workflow). The rule is `indexDue`
// (`src/lib/catalog/index-due.ts`); this is the I/O around it. Prints every reason, and writes
// `due=true|false` to $GITHUB_OUTPUT when it is set.
import "./lib/env.mjs";
import { appendFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { db } from "../src/db";
import { catalogBuilds, sets } from "../src/db/schema";
import { indexDue } from "../src/lib/catalog/index-due";

async function main() {
  const setRows = await db.select({
    code: sets.code, setType: sets.setType, releasedAt: sets.releasedAt, digital: sets.digital,
  }).from(sets);
  const builds = await db.select({ startedAt: catalogBuilds.startedAt }).from(catalogBuilds)
    .where(and(eq(catalogBuilds.kind, "index"), eq(catalogBuilds.ok, true)));
  const r = indexDue(new Date(), setRows, builds.map((b) => b.startedAt));
  console.log(r.due ? `index due:\n  ${r.reasons.join("\n  ")}` : "index not due");
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `due=${r.due}\n`);
}

main().then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });
