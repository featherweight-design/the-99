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
    // `redirect: "manual"`: the URL is a secret from the environment, and it is never followed anywhere else.
    const res = await fetch(url, { method: "GET", cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(PING_TIMEOUT_MS) });
    // Anything but 2xx means a wrong or failing monitor URL.
    // Status only, never the URL.
    if (res.status >= 300) console.warn(`[heartbeat] monitor answered ${res.status}`);
  } catch (error) {
    // Swallowed on purpose; the monitor itself reports the missing ping. The error's name only, never its message.
    console.warn(`[heartbeat] ping failed (${error instanceof Error ? error.name : "unknown"})`);
  }
}
