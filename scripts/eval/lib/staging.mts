import { requireEnv } from "../../lib/env.mjs";

/**
 * The harness's one database: STAGING, READ-ONLY (AGENTS.md: measure on staging, mutate on
 * local-dev; this lane writes to no database at all).
 *
 * Read-only is enforced twice, and neither half trusts the URL:
 *  - every pooled connection runs `set default_transaction_read_only = on` before it is handed
 *    out, so a write anywhere in the imported app code fails instead of landing;
 *  - before anything else runs, the database is asked which Neon branch it is and whether the
 *    setting took, and the harness refuses to start unless it is staging and read-only.
 *
 * `env.mjs` overrides DATABASE_URL from `.env` (local-dev), so the staging URL is assigned AFTER
 * it loads, and `src/db` — which reads DATABASE_URL at module scope — is imported dynamically
 * after that. A static import would connect to local-dev before this module could say otherwise.
 */
export const STAGING_BRANCH_ID = "br-polished-pond-a6e63y0b";

export async function connectStaging() {
  const { THE_99_NEON_STAGING_DIRECT: url } = requireEnv(["THE_99_NEON_STAGING_DIRECT"]);
  process.env.DATABASE_URL = url;
  const { db } = await import("../../../src/db/index");
  const pool = db.$client as unknown as {
    on(event: "connect", fn: (client: { query(sql: string): Promise<unknown> }) => void): void;
  };
  // A client runs its queries in order, and the pool emits `connect` before it hands the client
  // out, so this statement is always the first on its connection: every query the harness or the
  // imported app code issues on that client runs after it. If it FAILS, the connection would be
  // writable, so the process stops rather than carry on with that client.
  pool.on("connect", (client) => {
    client.query("set default_transaction_read_only = on").catch((err: unknown) => {
      console.error(`eval: could not make a staging connection read-only (${err instanceof Error ? err.message : String(err)}); stopping`);
      process.exit(1);
    });
  });

  const { sql } = await import("drizzle-orm");
  const [row] = (await db.execute(sql`
    select current_setting('neon.branch_id', true) as branch,
           current_setting('default_transaction_read_only') as ro
  `)).rows as { branch: string | null; ro: string }[];
  if (row?.branch !== STAGING_BRANCH_ID) {
    throw new Error(`eval: connected to branch ${row?.branch ?? "unknown"}, not staging (${STAGING_BRANCH_ID}); refusing`);
  }
  if (row.ro !== "on") throw new Error("eval: the staging connection is not read-only; refusing");
  return db;
}
