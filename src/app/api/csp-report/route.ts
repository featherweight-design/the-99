import { NextResponse, type NextRequest } from "next/server";
import { makeLogBudget, MAX_REPORT_BYTES, parseReports } from "../../../lib/security/csp-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mayLog = makeLogBudget(60);

/**
 * Where the browser sends Content-Security-Policy violations (`headers.ts` points `report-uri` here).
 * Public in `src/proxy.ts`: a browser sends a report with no session, so there is no reader to check
 * and none is trusted. It does nothing but write a log line per violation, cut to a directive, an
 * origin and a page path (`parseReports`), at most 60 lines a minute per instance, and always answers
 * 204 so a report can never be used to probe. The body is read only up to `MAX_REPORT_BYTES`.
 */
export async function POST(req: NextRequest) {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_REPORT_BYTES) return new Response(null, { status: 204 });
  let text = "";
  try {
    text = await req.text();
  } catch {
    return new Response(null, { status: 204 });
  }
  if (text.length > MAX_REPORT_BYTES) return new Response(null, { status: 204 });
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return new Response(null, { status: 204 });
  }
  for (const v of parseReports(parsed)) {
    if (!mayLog()) break;
    console.info(`[csp] ${v.directive} blocked=${v.blocked} page=${v.page}`);
  }
  return new NextResponse(null, { status: 204 });
}
