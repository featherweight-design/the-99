import { sqlState } from "./sql-state";

// An idle pooled connection can receive a FATAL from Postgres with no query in flight: Neon
// suspending or restarting the compute sends 57P01 ("terminating connection due to administrator
// command") down every open websocket. pg-pool re-emits that on the Pool, and an 'error' event
// nobody listens for throws, uncaught, killing the server process (Sentry THE-99-7, staging,
// 2026-11-11: three requests on three routes died). pg-pool already evicts the dead client, so the
// next query takes a fresh connection: the only job here is to not throw, and to say it happened.
//
// Reported through `captureServerError`, which sends a fixed tag and the SQLSTATE and never the
// message. The import is lazy so a script that loads the pool does not load Sentry with it.
export const POOL_ERROR_TAG = "db_pool_idle_error";

export function attachPoolErrorHandler<P extends { on(event: "error", listener: (error: Error) => void): unknown }>(
  pool: P,
): P {
  pool.on("error", (error) => {
    void import("../lib/sentry/capture")
      .then(({ captureServerError }) => {
        console.warn(`${POOL_ERROR_TAG} ${sqlState(error) ?? "no-sqlstate"}`);
        captureServerError(POOL_ERROR_TAG, error);
      })
      // Reporting is best effort: a failed import or capture must not become the unhandled rejection
      // that kills the process this handler exists to save.
      .catch(() => {});
  });
  return pool;
}

// The same suspend, met by a query instead: a client checked out of the pool in the moment before
// its 57P01 arrived carries the query onto a dead connection, and the request fails (THE-99-7's
// other half). pg-pool destroys a client whose query errored, so ONE retry takes a fresh connection
// and wakes the compute. Only 57P01, and only once: Postgres acts on a termination only at an
// interrupt check, and a commit holds interrupts off, so a statement that raised it did not commit
// and running it again cannot apply it twice. A transaction's statements run on a client from
// `connect()`, not through `pool.query`, and are never retried: a retry there would replay only
// part of the transaction.
export const ADMIN_SHUTDOWN = "57P01";
export const POOL_RETRY_TAG = "db_pool_admin_shutdown_retry";

type Queryable = { query: (...args: never[]) => unknown };

export function retryAdminShutdown<P extends Queryable>(pool: P): P {
  const query = (pool.query as (...args: unknown[]) => unknown).bind(pool);
  pool.query = ((...args: unknown[]) => {
    const result = query(...args);
    // The callback and submittable forms return no promise to retry through; nothing in the app uses them.
    if (!(result instanceof Promise)) return result;
    return result.catch((error: unknown) => {
      if (sqlState(error) !== ADMIN_SHUTDOWN) throw error;
      console.warn(`${POOL_RETRY_TAG} ${ADMIN_SHUTDOWN}`);
      return query(...args);
    });
  }) as P["query"];
  return pool;
}
