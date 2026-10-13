
/**
 * The switches the read's model stand-in is driven by: every non-production read uses the stub
 * unless `INTAKE_LIVE=1`, as the synopsis does (`SYNOPSIS_LIVE`). A dev server, a probe and a unit
 * test cannot spend a real call by accident; deployed builds are `production` and call the model
 * with no flag. A stored read records its model as `"stub"`, so a probe can tell from the row that
 * no real call was made. `INTAKE_STUB` picks the outcome the panel has to draw (`nothing`,
 * `malformed`, `busy`, `timeout`) and `INTAKE_STUB_DELAY_MS` holds every reply that long, so the
 * waiting panel can be seen. The two-step read builds its own stub replies (`the-read-run.ts`).
 */

/** The synopsis stub's name: one string the ledger prices at nothing (`UNBILLED_MODELS`). */
export { STUB_MODEL } from "../synopsis/stub";

export type StubMode = "mapped" | "nothing" | "malformed" | "busy" | "timeout";

export function stubMode(env: Record<string, string | undefined> = process.env): StubMode {
  const mode = env.INTAKE_STUB;
  return mode === "nothing" || mode === "malformed" || mode === "busy" || mode === "timeout" ? mode : "mapped";
}

/** How long the stub holds a reply (`INTAKE_STUB_DELAY_MS`), capped well under the read's deadline. */
export function stubDelayMs(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.INTAKE_STUB_DELAY_MS ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 30_000) : 0;
}

/** Whether this process calls the real model: production builds, or an explicit opt-in. */
export function intakeLive(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === "production" || env.INTAKE_LIVE === "1";
}
