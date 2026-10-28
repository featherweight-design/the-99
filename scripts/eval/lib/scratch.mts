import { requireEnv } from "../../lib/env.mjs";
import { assertScratchBranch } from "../../lib/scratch-branch.mjs";

/**
 * The count-mechanism eval's one database: a SCRATCH branch holding copies of Hugh's decks, never production, staging
 * or local-dev. The target is NAMED, as `pull:staging`'s is: `COUNT_EVAL_DB_URL` and `COUNT_EVAL_BRANCH`, neither ever
 * defaulted, and the branch the database reports must be the one named and must not be one of the three that are
 * refused (`assertScratchBranch`). The seed writes here; the eval only reads.
 *
 * `env.mjs` overrides DATABASE_URL from `.env`, so the scratch URL is assigned AFTER it loads, and `src/db` (which reads
 * DATABASE_URL at module scope) is imported dynamically after that, as `staging.mts` does.
 */
export async function connectScratch(what: string) {
  const { COUNT_EVAL_DB_URL: url, COUNT_EVAL_BRANCH: named } = requireEnv(["COUNT_EVAL_DB_URL", "COUNT_EVAL_BRANCH"]);
  process.env.DATABASE_URL = url;
  const { db } = await import("../../../src/db/index");
  const { sql } = await import("drizzle-orm");
  const [row] = (await db.execute(sql`select current_setting('neon.branch_id', true) as branch`)).rows as { branch: string | null }[];
  assertScratchBranch(row?.branch ?? null, what);
  if (row?.branch !== named) throw new Error(`${what}: connected to ${row?.branch ?? "unknown"}, not COUNT_EVAL_BRANCH (${named}); refusing`);
  return db;
}
