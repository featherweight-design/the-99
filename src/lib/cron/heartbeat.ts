const PING_TIMEOUT_MS = 3_000;

/**
 * Tells the uptime monitor a cron run succeeded, by GET to the heartbeat URL held in one of the
 * `BETTERSTACK_HEARTBEAT_*` variables. Call it after the handler's work has succeeded and never on an error path:
 * the monitor alarms on a missing ping. An unset URL does nothing. It is awaited (a serverless function can be
 * frozen once its response is sent, which would drop a ping left running) but bounded to three seconds, and a failed
 * ping is swallowed: a monitor outage never fails or delays a cron run past that bound.
 */
export async function pingHeartbeat(url: string | undefined): Promise<void> {
  if (!url) return;
  try {
    await fetch(url, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(PING_TIMEOUT_MS) });
  } catch {
    // Swallowed on purpose; the monitor itself reports the missing ping.
  }
}
