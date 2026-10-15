// A reader's friends' spare copies of the cards they name (Social R2, plan `2026-10-15-social-r2.md` PR 2;
// handoff G3). Served here, uncached, so no cached page carries a friend's data and none needs
// `friendGeneration` or the friends' switches in its key. Its contract:
//   - the reader comes from the Clerk session, never from the request;
//   - `SOCIAL_FRIENDS_ENABLED` is re-checked for that reader, and off answers 404, as a route that is not there;
//   - every id is a card oracle id and a batch is at most MAX_SPARES_BATCH, checked before anything is read;
//   - `loadFriendSpares` joins the viewer's grant in every statement (`src/lib/social/spares.ts`);
//   - `private, no-store`, because the answer is this reader's friends' data.
// A route rather than a server action because spares load after the page, in the background: Next runs a
// page's actions one at a time, and a read queued as an action would wait on, and delay, the reader's writes.
import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { socialFriendsEnabled } from "../../../lib/social/flag";
import { isUuid } from "../../../lib/social/rules";
import { MAX_SPARES_BATCH, loadFriendSpares } from "../../../lib/social/spares";
import { requestSwitchEnv } from "../../../lib/switches/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Content-Type": "application/json", "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(null, { status: 401, headers: HEADERS });
  if (!socialFriendsEnabled(await requestSwitchEnv(userId))) return NextResponse.json(null, { status: 404, headers: HEADERS });
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean);
  if (ids.length === 0 || ids.length > MAX_SPARES_BATCH || !ids.every(isUuid)) {
    return NextResponse.json(null, { status: 400, headers: HEADERS });
  }
  return NextResponse.json({ spares: await loadFriendSpares(userId, ids) }, { headers: HEADERS });
}
