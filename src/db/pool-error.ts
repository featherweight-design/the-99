import { sqlState } from "./sql-state";

// An idle pooled connection can receive a FATAL from Postgres with no query in flight: Neon
// suspending or restarting the compute sends 57P01 ("terminating connection due to administrator
// command") down every open websocket. pg-pool re-emits that on the Pool, and an 'error' event
// nobody listens for throws, uncaught, killing the server process (Sentry THE-99-7, staging,
// 2026-11-11: three requests on three routes died). pg-pool already evicts the dead client, so the
// next query takes a fresh connection: the only job here is to not throw, and to say it happened.
//
// A client CHECKED OUT through `connect()` (a transaction, the ingest lock, the read admission lock)
// is not covered by that: pg-pool removes its own idle listener on checkout, so a FATAL arriving
// between two of the holder's statements is an 'error' on the client with nobody listening, and
// the same crash. Every client the pool creates therefore gets a listener of its own as well. That
// one only keeps the process up: the holder's next statement fails and reports, and an idle client's
// error reaches the pool's handler below, so reporting it here too would count it twice.
//
// Reported through `captureServerError`, which sends a fixed tag and the SQLSTATE and never the
// message. The import is lazy so a script that loads the pool does not load Sentry with it.
export const POOL_ERROR_TAG = "db_pool_idle_error";

type Pool = {
  on(event: "error", listener: (error: Error) => void): unknown;
  on(event: "connect", listener: (client: { on(event: "error", listener: (error: Error) => void): unknown }) => void): unknown;
};

function report(tag: string, error: unknown): void {
  void import("../lib/sentry/capture")
    .then(({ captureServerError }) => {
      console.warn(`${tag} ${sqlState(error) ?? "no-sqlstate"}`);
      captureServerError(tag, error);
    })
    // Reporting is best effort: a failed import or capture must not become the unhandled rejection
    // that kills the process this handler exists to save.
    .catch(() => {});
}

export function attachPoolErrorHandler<P extends Pool>(pool: P): P {
  pool.on("error", (error) => report(POOL_ERROR_TAG, error));
  pool.on("connect", (client) => {
    client.on("error", () => {});
  });
  return pool;
}

// The same suspend, met by a query instead: a client handed out in the moment before its FATAL
// arrived carries the query onto a dead connection, and the request fails (THE-99-7's other half).
// pg-pool destroys a client whose query errored, so ONE retry takes a fresh connection and wakes
// the compute. It covers the server's 57P01 and the driver's own words for a socket that closed
// first, which carry no code. ONLY A READ is retried: a write that met the FATAL may still have
// committed (the termination can be processed after the commit, before the reply), and running it
// again could apply it twice. Only through `pool.query`: a transaction's statements run on a client
// from `connect()` and a retry there would replay part of it. Each retry is reported.
export const ADMIN_SHUTDOWN = "57P01";
export const POOL_RETRY_TAG = "db_pool_lost_connection_retry";

const LOST_CONNECTION = ["Connection terminated", "Client has encountered a connection error and is not queryable"];

export function lostConnection(error: unknown): boolean {
  if (sqlState(error) === ADMIN_SHUTDOWN) return true;
  const e = error as { message?: unknown; cause?: { message?: unknown } } | null;
  return [e?.message, e?.cause?.message].some((m) => typeof m === "string" && LOST_CONNECTION.some((s) => m.startsWith(s)));
}

/** A statement that only reads: a SELECT, or a WITH that writes nothing. */
export function readOnlyStatement(query: unknown): boolean {
  const text = typeof query === "string" ? query : (query as { text?: unknown } | null)?.text;
  if (typeof text !== "string") return false;
  if (/^\s*select\b/i.test(text)) return true;
  return /^\s*with\b/i.test(text) && !/\b(insert|update|delete|merge)\b/i.test(text);
}

type Queryable = { query: (...args: never[]) => unknown };

export function retryLostConnectionReads<P extends Queryable>(pool: P): P {
  const query = (pool.query as (...args: unknown[]) => unknown).bind(pool);
  pool.query = ((...args: unknown[]) => {
    const result = query(...args);
    // The callback and submittable forms return no promise to retry through; nothing in the app uses them.
    if (!(result instanceof Promise) || !readOnlyStatement(args[0])) return result;
    return result.catch((error: unknown) => {
      if (!lostConnection(error)) throw error;
      report(POOL_RETRY_TAG, error);
      return query(...args);
    });
  }) as P["query"];
  return pool;
}
