// Where the browser reports a loading screen that has been up for `STALL_AFTER_MS` (the stuck-loader
// diagnostic, behind `NAV_STALL_LOG_ENABLED`). Signed in only: the proxy protects it like every other
// route, and the reader comes from the Clerk session. It writes one `[nav-stall]` log line built from
// a report that `parseStall` has checked field by field (path patterns, closed enums, bounded
// integers), never the reader's id, and at most 60 lines a minute per instance. It always answers 204,
// so it says nothing back about what it kept.
import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { readCapped } from "../../../lib/http/read-capped";
import { navStallLogEnabled } from "../../../lib/nav-stall/flag";
import { MAX_STALL_BYTES, parseStall, skewOf, stallLine } from "../../../lib/nav-stall/report";
import { makeLogBudget } from "../../../lib/security/csp-report";
import { requestSwitchEnv } from "../../../lib/switches/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mayLog = makeLogBudget(60);
const done = () => new Response(null, { status: 204 });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return done();
  if (!navStallLogEnabled(await requestSwitchEnv(userId))) return done();
  if (Number(req.headers.get("content-length") ?? "0") > MAX_STALL_BYTES) return done();
  const text = await readCapped(req, MAX_STALL_BYTES);
  if (text === null) return done();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return done();
  }
  const report = parseStall(raw);
  if (report && mayLog()) console.info(stallLine(report, skewOf(report.deployment, process.env.VERCEL_DEPLOYMENT_ID)));
  return done();
}
