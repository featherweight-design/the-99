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
// FAILS CLOSED, as the reservation does: an unreachable app, a reply that is not JSON, or one
// without the field all skip, the same as "off". Every skip exits 0, so a scheduled run reads as a
// quiet skip rather than a red workflow. The jobs this gates chain only into copies, which move
// what already exists and call no model, so a 0 here never lets anything spend.

/** Production's health check: where the admin switch lives. */
export const DEFAULT_HEALTH_URL = "https://the-99.dev/api/health";

/** Long enough for a cold function, short enough that a dead app is a skip, not a stalled job. */
export const HEALTH_TIMEOUT_MS = 10_000;

/**
 * What production's health check says about model calls. Never throws.
 *
 * @param {{ url?: string, fetchImpl?: typeof fetch, timeoutMs?: number }} [opts]
 * @returns {Promise<{ on: true } | { on: false, line: string }>}
 */
export async function readModelCalls(opts = {}) {
  const url = opts.url ?? process.env.MODEL_CALLS_HEALTH_URL ?? DEFAULT_HEALTH_URL;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const unconfirmed = (why) => ({ on: false, line: `Could not confirm model calls are on (${why}); skipping.` });
  let body;
  try {
    // Not on `res.ok`: health answers 503 while migrations are pending, and still carries the field.
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(opts.timeoutMs ?? HEALTH_TIMEOUT_MS) });
    body = await res.json();
  } catch (err) {
    return unconfirmed(`${url}: ${err instanceof Error ? err.message : String(err)}`);
  }
  const state = body && typeof body === "object" ? body.modelCalls : undefined;
  if (state === "on") return { on: true };
  if (state === "off") return { on: false, line: "Model calls are paused (MODEL_CALLS_ENABLED off); skipping." };
  return unconfirmed(`${url} did not report modelCalls`);
}

/**
 * Call first, before anything that spends: exits 0 with one line unless production reports model
 * calls on.
 *
 * @param {{ url?: string, fetchImpl?: typeof fetch, timeoutMs?: number }} [opts]
 * @returns {Promise<void>}
 */
export async function assertModelCallsOn(opts = {}) {
  const verdict = await readModelCalls(opts);
  if (verdict.on) return;
  console.log(verdict.line);
  process.exit(0);
}
