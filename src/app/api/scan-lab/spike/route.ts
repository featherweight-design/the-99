// The scan lab's WebGPU spike rows (`/lab/scan` with "Compare WebGPU" on, behind the plumbing switch
// `SCAN_LAB_ENABLED`). Signed in only: the proxy protects it like every other route, and the reader comes from the
// Clerk session. It stores what `parseSpike` has checked field by field; a `run` row's tap must be the reader's own.
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "../../../../db";
import { scanLabResults, scanLabSpike } from "../../../../db/schema";
import { readCapped } from "../../../../lib/http/read-capped";
import { scanLabEnabled } from "../../../../lib/scan-lab/flag";
import { MAX_SPIKE_BODY, parseSpike } from "../../../../lib/scan-lab/spike";
import { requestFlags } from "../../../../lib/flags/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response(null, { status: 401 });
  if (!scanLabEnabled(await requestFlags(userId))) return new Response(null, { status: 404 });
  if (Number(req.headers.get("content-length") ?? "0") > MAX_SPIKE_BODY) return new Response(null, { status: 413 });
  const text = await readCapped(req, MAX_SPIKE_BODY);
  if (text === null) return new Response(null, { status: 413 });
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const row = parseSpike(raw);
  if (!row) return new Response(null, { status: 400 });
  let resultId: string | null = null;
  if (row.kind === "run") {
    // Only a tap of the reader's own: another reader's result id is refused, never tied to this row.
    const [own] = await db.select({ id: scanLabResults.id }).from(scanLabResults)
      .where(and(eq(scanLabResults.id, row.resultId), eq(scanLabResults.userId, userId))).limit(1);
    if (!own) return new Response(null, { status: 404 });
    resultId = own.id;
  }
  await db.insert(scanLabSpike).values({ userId, kind: row.kind, resultId, data: row });
  return new Response(null, { status: 204 });
}
