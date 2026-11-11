import { Pool } from "@neondatabase/serverless";
import { attachPoolErrorHandler } from "../../db/pool-error";

/**
 * Held by a catalog ingest (sets, cards, printings, prices) for its whole run, so a catalog copy,
 * which takes the same key inside its publish transaction, can never interleave with it (plan
 * `2026-09-28-card-data-replicate.md`, §3 item 8).
 *
 * A TRANSACTION-scoped lock on a dedicated client, held open until the ingest ends, and not a
 * session lock: the catalog URLs go through Neon's pooler, which multiplexes sessions per
 * transaction, so a session lock could stay behind on a server connection some other client is
 * then handed. An open transaction pins its server connection for exactly as long as it is open.
 * It writes nothing, and the ingest's own writes run on their own connections as before.
 */
export const CATALOG_INGEST_LOCK = "catalog-ingest";

export async function withCatalogIngestLock<T>(connectionString: string, run: () => Promise<T>): Promise<T> {
  // Its one client is held for a whole ingest, so a compute suspend or restart reaches it between
  // statements. Unhandled, that FATAL was an uncaught 'error' (#2851's gap); merely swallowed, the
  // ingest would go on writing with its lock gone, beside a copy that can then take it. So a lost
  // connection ends the run at once: `run` is raced against it and the ingest fails, naming why.
  const pool = attachPoolErrorHandler(new Pool({ connectionString, max: 1 }));
  const client = await pool.connect();
  const lost = new Promise<never>((_, reject) => {
    client.on("error", (error) => reject(new Error(`${CATALOG_INGEST_LOCK} lock lost: its connection failed mid-run (${error.message})`)));
  });
  // Settled after the race is over (the pool ending its client), it must not become an unhandled rejection.
  lost.catch(() => {});
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [CATALOG_INGEST_LOCK]);
    let result: T;
    try {
      result = await Promise.race([run(), lost]);
    } catch (err) {
      await client.query("rollback").catch(() => {});
      throw err;
    }
    // A commit that fails is reported, never swallowed: the lock's outcome is then unknown, and a
    // run that reports success over it would hide that.
    await client.query("commit");
    return result;
  } finally {
    client.release();
    await pool.end();
  }
}
