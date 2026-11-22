import { NextResponse } from "next/server";
import { checkHealth } from "../../../lib/health/check";
import { healthModelCalls } from "../../../lib/health/model-calls";

// Pin to Node: the neon-serverless websocket driver does not run on Edge.
export const runtime = "nodejs";
// A cached health check reports the state of a past deployment, which is worse
// than no health check at all.
export const dynamic = "force-dynamic";

export async function GET() {
  // `modelCalls`: the app-wide model-call switch the background jobs read before they spend
  // (`healthModelCalls`; "off" when the read fails). It never changes the status code.
  const [report, modelCalls] = await Promise.all([checkHealth(), healthModelCalls()]);

  // "behind" is the #70 condition — code deployed ahead of its schema. 503 so an
  // uptime check treats it as an outage. "ahead" is expected mid-rollout under
  // expand-contract and stays 200.
  const ok = report.status === "ok" || report.status === "ahead";

  return NextResponse.json(
    { ...report, modelCalls, checkedAt: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  );
}
