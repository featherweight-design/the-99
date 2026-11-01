import { modelCallsEnabled } from "../model/calls-flag";
import { resolveSwitchEnvStrict } from "../switches/snapshot";

/** How long a confirmed answer is held per server instance, matching the switches' own memo. */
export const MODEL_CALLS_MEMO_MS = 30_000;

let memo: { state: "on" | "off"; at: number } | null = null;

/**
 * The app-wide model-call switch (`MODEL_CALLS_ENABLED`) as `/api/health` reports it, for the
 * background jobs that call a model outside the app (`scripts/lib/model-calls-gate.mjs`): they run
 * against the catalog database, not this one, so they learn the admin row's state here.
 *
 * App-wide, with no user: a plumbing switch takes no account's override, and health is public, so
 * it carries no user data (the same deliberate exception as `reserveModelCall`; docs/agents/switches.md).
 *
 * Read STRICTLY, so a failed read is never mistaken for the environment's default, and reported
 * "off", failing closed as the reservation does: a database blip never lets a job spend under an
 * app-wide Off row. A confirmed answer is held for 30 seconds so a public endpoint does not query
 * `flag_overrides` on every request; a failed read is never held, so the next request asks again.
 */
export async function healthModelCalls(now: number = Date.now()): Promise<"on" | "off"> {
  if (memo && now - memo.at < MODEL_CALLS_MEMO_MS) return memo.state;
  try {
    const state = modelCallsEnabled(await resolveSwitchEnvStrict(null)) ? "on" : "off";
    memo = { state, at: now };
    return state;
  } catch (error) {
    // `readSnapshot` has already logged "serving the environment alone", which is true of its
    // other callers but not of this one: here the failure reports off.
    console.error("health: model-calls read failed; reporting off", error);
    return "off";
  }
}

/** For tests: forget the held answer. */
export function clearHealthModelCalls(): void {
  memo = null;
}
