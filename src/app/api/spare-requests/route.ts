// The reader's own spare requests for the cards they name (plan `2026-10-22-spare-requests.md`, PR 3a): what the
// Shopping modal and the row marks draw (requested, accepted, declined, no longer spare). Served here, uncached, the
// shape of `GET /api/friend-spares`:
//   - the reader comes from the Clerk session, never from the request;
//   - every id is a card oracle id and a batch is at most MAX_SPARES_BATCH, checked before anything is read;
//   - `loadAskStates` joins the live friendship and names the other side by public id, never a Clerk id;
//   - `private, no-store`, because the answer is this reader's and their friends' data.
import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { MAX_SPARES_BATCH } from "../../../lib/social/client-rules";
import { isUuid } from "../../../lib/social/rules";
import { loadAskStates } from "../../../lib/social/spare-requests";
import { requestSwitchEnv } from "../../../lib/switches/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Content-Type": "application/json", "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(null, { status: 401, headers: HEADERS });
  const env = await requestSwitchEnv(userId);
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean);
  if (ids.length === 0 || ids.length > MAX_SPARES_BATCH || !ids.every(isUuid)) {
    return NextResponse.json(null, { status: 400, headers: HEADERS });
  }
  // The loader re-checks the batch; null there is the same refusal.
  const asks = await loadAskStates(userId, ids, env);
  if (asks === null) return NextResponse.json(null, { status: 400, headers: HEADERS });
  return NextResponse.json({ asks }, { headers: HEADERS });
}
