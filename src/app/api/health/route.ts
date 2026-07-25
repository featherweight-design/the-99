import { NextResponse } from "next/server";
import { checkHealth } from "../../../lib/health/check";

// Pin to Node: the neon-serverless websocket driver does not run on Edge.
export const runtime = "nodejs";
// A cached health check reports the state of a past deployment, which is worse
// than no health check at all.
export const dynamic = "force-dynamic";

export async function GET() {
  const report = await checkHealth();

  // "behind" is the #70 condition — code deployed ahead of its schema. 503 so an
  // uptime check treats it as an outage. "ahead" is expected mid-rollout under
  // expand-contract and stays 200.
  const ok = report.status === "ok" || report.status === "ahead";

  return NextResponse.json(
    { ...report, checkedAt: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  );
}
