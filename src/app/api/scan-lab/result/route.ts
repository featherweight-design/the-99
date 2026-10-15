// The card-scan lab's ✓/✗ tap (`/lab/scan`, behind the plumbing switch `SCAN_LAB_ENABLED`). Signed
// in only: the proxy protects it like every other route, and the reader comes from the Clerk session.
// It stores what `parseResult` has checked field by field: the guess, right or wrong, the timings,
// and a frame only when the player pressed "keep this frame". It answers with the new row's id.
import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { db } from "../../../../db";
import { scanLabResults } from "../../../../db/schema";
import { readCapped } from "../../../../lib/http/read-capped";
import { scanLabEnabled } from "../../../../lib/scan-lab/flag";
import { MAX_RESULT_BODY, parseResult } from "../../../../lib/scan-lab/result";
import { requestSwitchEnv } from "../../../../lib/switches/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response(null, { status: 401 });
  if (!scanLabEnabled(await requestSwitchEnv(userId))) return new Response(null, { status: 404 });
  if (Number(req.headers.get("content-length") ?? "0") > MAX_RESULT_BODY) return new Response(null, { status: 413 });
  const text = await readCapped(req, MAX_RESULT_BODY);
  if (text === null) return new Response(null, { status: 413 });
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const result = parseResult(raw);
  if (!result) return new Response(null, { status: 400 });
  // The row's id goes back so a ✗ tap can name the card it really was (`labelScanLabResult`).
  const [row] = await db.insert(scanLabResults).values({ userId, ...result }).returning({ id: scanLabResults.id });
  return Response.json({ id: row.id });
}
