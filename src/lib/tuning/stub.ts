import type { ModelOutcome } from "../model/client";

/**
 * A held stand-in for the model call of Suggested changes and Proposed cuts, for `probe:run-after`.
 * That probe closes the page while a run is mid-call and asks whether the run still settles, which
 * needs a call that takes a known time and costs nothing.
 *
 * It is OFF unless `TUNING_STUB_DELAY_MS` is set, and never in a production build, so a deployed
 * build cannot reach it whatever its environment holds. When on, the call returns a busy failure
 * after that long, so the run ends `failed` and its credit comes back: the probe needs the run to
 * SETTLE after the page is gone, and the answer's shape is not what it measures.
 */
export const TUNING_STUB_MAX_MS = 60_000;

export function tuningStubDelayMs(env: Record<string, string | undefined> = process.env): number | null {
  if (env.NODE_ENV === "production") return null;
  const n = Number(env.TUNING_STUB_DELAY_MS ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.min(n, TUNING_STUB_MAX_MS) : null;
}

/** The held failure, or null when the stub is off and the real call should be made. */
export async function heldStubOutcome(env: Record<string, string | undefined> = process.env): Promise<ModelOutcome<never> | null> {
  const ms = tuningStubDelayMs(env);
  if (ms === null) return null;
  await new Promise((r) => setTimeout(r, ms));
  return { ok: false, errorClass: "upstream_busy" };
}
