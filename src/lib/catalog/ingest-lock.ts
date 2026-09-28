import { Pool } from "@neondatabase/serverless";

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
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [CATALOG_INGEST_LOCK]);
    try {
      return await run();
    } finally {
      await client.query("commit").catch(() => {});
    }
  } finally {
    client.release();
    await pool.end();
  }
}
