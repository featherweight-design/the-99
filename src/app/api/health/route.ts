import { NextResponse } from "next/server";
import { checkHealth } from "../../../lib/health/check";
import { modelCallsEnabled } from "../../../lib/model/calls-flag";
import { resolveSwitchEnvStrict } from "../../../lib/switches/snapshot";

// Pin to Node: the neon-serverless websocket driver does not run on Edge.
export const runtime = "nodejs";
// A cached health check reports the state of a past deployment, which is worse
// than no health check at all.
export const dynamic = "force-dynamic";

/**
 * The app-wide model-call switch (`MODEL_CALLS_ENABLED`), for the background jobs that call a model
 * outside the app (`scripts/lib/model-calls-gate.mjs`): they run against the catalog database, not
 * this one, so they learn the admin row's state here. App-wide only (a plumbing switch takes no
 * account's override), so it carries no user data. Read fresh, and a failed read reports "off",
 * failing closed exactly as `reserveModelCall` does: a database blip never lets a job spend under an
 * app-wide Off row.
 */
async function modelCallsState(): Promise<"on" | "off"> {
  try {
    return modelCallsEnabled(await resolveSwitchEnvStrict(null)) ? "on" : "off";
  } catch {
    return "off";
  }
}

export async function GET() {
  const [report, modelCalls] = await Promise.all([checkHealth(), modelCallsState()]);

  // "behind" is the #70 condition — code deployed ahead of its schema. 503 so an
  // uptime check treats it as an outage. "ahead" is expected mid-rollout under
  // expand-contract and stays 200. `modelCalls` never changes the status code.
  const ok = report.status === "ok" || report.status === "ahead";

  return NextResponse.json(
    { ...report, modelCalls, checkedAt: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  );
}
