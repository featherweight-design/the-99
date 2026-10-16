// The card-scan lab's cadence log (`/lab/scan`, behind the plumbing switch `SCAN_LAB_ENABLED`): one 30-second run of
// what each frame read and what the screen showed, posted at the run's end. Signed in only, like the ✓/✗ tap. It
// stores what `parseCadence` has checked field by field, and never an image.
import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { db } from "../../../../db";
import { scanLabCadence } from "../../../../db/schema";
import { readCapped } from "../../../../lib/http/read-capped";
import { MAX_CADENCE_BODY, parseCadence } from "../../../../lib/scan-lab/cadence";
import { scanLabEnabled } from "../../../../lib/scan-lab/flag";
import { requestSwitchEnv } from "../../../../lib/switches/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response(null, { status: 401 });
  if (!scanLabEnabled(await requestSwitchEnv(userId))) return new Response(null, { status: 404 });
  if (Number(req.headers.get("content-length") ?? "0") > MAX_CADENCE_BODY) return new Response(null, { status: 413 });
  const text = await readCapped(req, MAX_CADENCE_BODY);
  if (text === null) return new Response(null, { status: 413 });
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const log = parseCadence(raw);
  if (!log) return new Response(null, { status: 400 });
  await db.insert(scanLabCadence).values({
    userId, indexVersion: log.indexVersion, frameCount: log.frames.length, frames: log.frames,
  });
  return new Response(null, { status: 204 });
}
