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
      .then(({ captureServerError, sqlState }) => {
        console.warn(`${POOL_ERROR_TAG} ${sqlState(error) ?? "no-sqlstate"}`);
        captureServerError(POOL_ERROR_TAG, error);
      })
      // Reporting is best effort: a failed import or capture must not become the unhandled rejection
      // that kills the process this handler exists to save.
      .catch(() => {});
  });
  return pool;
}
