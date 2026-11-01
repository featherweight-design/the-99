// The app-wide model-call switch (`MODEL_CALLS_ENABLED`), for the background jobs that call a model.
//
// The app's own runs reserve through `reserveModelCall`, which reads the switch from the app
// database. A job here runs against the catalog database instead, where no `flag_overrides` row
// lives, so it asks the app: `GET /api/health` reports `modelCalls: "on" | "off"`, the app-wide
// resolution alone.
//
// PRODUCTION'S health, even for a job that writes to the staging catalog: the switch an admin flips
// is production's row, and a staging job that kept spending under it would be the leak the switch
// exists to stop. `MODEL_CALLS_HEALTH_URL` names another health URL; nothing sets it today.
//
// THREE answers, and only one spends:
//   on           the job goes ahead.
//   off          a deliberate pause: the job skips, and exits 0, so a scheduled run is a quiet skip.
//   unconfirmed  the app was unreachable, answered with something other than JSON (an HTML
//                challenge page), or did not report the field. The job still never spends, but it
//                exits NON-ZERO, so the run goes red and someone looks, rather than reading green for
//                ever while every run skips.

/** Production's health check: where the admin switch lives. */
export const DEFAULT_HEALTH_URL = "https://the-99.dev/api/health";

/** Long enough for a cold function, short enough that a dead app is a red run, not a stalled job. */
export const HEALTH_TIMEOUT_MS = 10_000;

/** The exit code for an unconfirmed read: a failure to look at, not a pause. */
export const EXIT_UNCONFIRMED = 1;

export const PAUSED_LINE = "Model calls are paused (MODEL_CALLS_ENABLED off); skipping.";

/**
 * What production's health check says about model calls. Never throws.
 *
 * @param {{ url?: string, fetchImpl?: typeof fetch, timeoutMs?: number }} [opts]
 * @returns {Promise<{ state: "on" } | { state: "off" | "unconfirmed", line: string }>}
 */
export async function readModelCalls(opts = {}) {
  // `||`, not `??`: a variable set but empty (a blank Actions variable) falls back too.
  const url = opts.url || process.env.MODEL_CALLS_HEALTH_URL || DEFAULT_HEALTH_URL;
  const fetchImpl = opts.fetchImpl ?? fetch;
  /** @param {string} why */
  const unconfirmed = (why) => ({
    state: /** @type {const} */ ("unconfirmed"),
    line: `Could not confirm model calls are on (${why}); nothing was sent. Check ${url}.`,
  });
  let body;
  try {
    // Not on `res.ok`: health answers 503 while migrations are pending, and still carries the field.
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(opts.timeoutMs ?? HEALTH_TIMEOUT_MS) });
    body = await res.json();
  } catch (err) {
    return unconfirmed(err instanceof Error ? err.message : String(err));
  }
  const state = body && typeof body === "object" ? body.modelCalls : undefined;
  if (state === "on") return { state: "on" };
  if (state === "off") return { state: "off", line: PAUSED_LINE };
  return unconfirmed(state === undefined ? "the reply did not report modelCalls" : `modelCalls was ${JSON.stringify(state)}`);
}

/**
 * Call first, before anything that spends: returns when production reports model calls on. Off,
 * it prints one line and exits 0; unconfirmed, it prints why on stderr and exits non-zero.
 *
 * @param {{ url?: string, fetchImpl?: typeof fetch, timeoutMs?: number }} [opts]
 * @returns {Promise<void>}
 */
export async function assertModelCallsOn(opts = {}) {
  const verdict = await readModelCalls(opts);
  if (verdict.state === "on") return;
  if (verdict.state === "off") {
    console.log(verdict.line);
    process.exit(0);
  }
  console.error(verdict.line);
  process.exit(EXIT_UNCONFIRMED);
}
