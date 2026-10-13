import { NextResponse, type NextRequest } from "next/server";
import { makeLogBudget, MAX_REPORT_BYTES, parseReports } from "../../../lib/security/csp-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mayLog = makeLogBudget(60);

/**
 * The body as text, or null once it passes `max` BYTES. Read as a stream and abandoned at the cap, so a
 * chunked request with no `Content-Length` is never buffered whole.
 */
async function readCapped(req: NextRequest, max: number): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/**
 * Where the browser sends Content-Security-Policy violations (`headers.ts` points `report-uri` here).
 * Public in `src/proxy.ts`: a browser sends a report with no session, so there is no reader to check
 * and none is trusted. It does nothing but write a log line per violation, cut to a directive, an
 * origin and a page path (`parseReports`), at most 60 lines a minute per instance, and always answers
 * 204 so a report can never be used to probe. The body is streamed and dropped past `MAX_REPORT_BYTES` bytes.
 */
export async function POST(req: NextRequest) {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_REPORT_BYTES) return new Response(null, { status: 204 });
  const text = await readCapped(req, MAX_REPORT_BYTES);
  if (text === null) return new Response(null, { status: 204 });
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
