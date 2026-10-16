// Where the scanner posts its timing row as it closes (`src/lib/scan/timing.ts`), behind the scan lab's own plumbing
// switch `SCAN_LAB_ENABLED`, which is on staging alone: the row is the lab's measuring carried into the real scanner. Signed in only: the proxy protects it like every other route. It writes one
// `[scan-timing]` log line built from a row `parseScanTiming` has checked field by field, never the reader's id, and
// at most 60 lines a minute per instance. It always answers 204, so it says nothing back about what it kept.
import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { readCapped } from "../../../../lib/http/read-capped";
import { MAX_TIMING_BYTES, parseScanTiming, scanTimingLine } from "../../../../lib/scan/timing";
import { scanLabEnabled } from "../../../../lib/scan-lab/flag";
import { makeLogBudget } from "../../../../lib/security/csp-report";
import { requestSwitchEnv } from "../../../../lib/switches/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mayLog = makeLogBudget(60);
const done = () => new Response(null, { status: 204 });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return done();
  if (!scanLabEnabled(await requestSwitchEnv(userId))) return done();
  if (Number(req.headers.get("content-length") ?? "0") > MAX_TIMING_BYTES) return done();
  const text = await readCapped(req, MAX_TIMING_BYTES);
  if (text === null) return done();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return done();
  }
  const row = parseScanTiming(raw);
  if (row && mayLog()) console.info(scanTimingLine(row));
  return done();
}
