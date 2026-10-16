// What became of the reader's own friend links, for /friends' watch while one is shown or open: a friend who scans
// the QR code and accepts appears without the reader refreshing. Its contract:
//   - the reader comes from the Clerk session, never from the request;
//   - `SOCIAL_FRIENDS_ENABLED` is re-checked for that reader, and off answers 404, as a route that is not there;
//   - every token is an invite token and a batch is at most MAX_OPEN_INVITES, checked before anything is read;
//   - `inviteOutcomes` reads only the reader's own links, and names a redeemer only through the reader's own
//     friendship row (`src/lib/social/friends.ts`);
//   - `private, no-store`, because the answer is this reader's data and changes when a friend accepts.
// A route rather than a server action because it polls in the background: Next runs a page's actions one at a
// time, and a poll queued as an action would wait on, and delay, the reader's writes.
import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { socialFriendsEnabled } from "../../../lib/social/flag";
import { isInviteToken } from "../../../lib/social/client-rules";
import { inviteOutcomes } from "../../../lib/social/friends";
import { MAX_OPEN_INVITES } from "../../../lib/social/rules";
import { requestSwitchEnv } from "../../../lib/switches/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Content-Type": "application/json", "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(null, { status: 401, headers: HEADERS });
  if (!socialFriendsEnabled(await requestSwitchEnv(userId))) return NextResponse.json(null, { status: 404, headers: HEADERS });
  const tokens = (req.nextUrl.searchParams.get("t") ?? "").split(",").filter(Boolean);
  if (tokens.length === 0 || tokens.length > MAX_OPEN_INVITES || !tokens.every(isInviteToken)) {
    return NextResponse.json(null, { status: 400, headers: HEADERS });
  }
  return NextResponse.json({ links: await inviteOutcomes(userId, tokens) }, { headers: HEADERS });
}
