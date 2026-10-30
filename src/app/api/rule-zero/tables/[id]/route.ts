// The Rule 0 table, polled (plan `2026-10-16-rule-zero.md` PR 4; readiness G5): the table page asks every 20
// seconds while visible, and on focus and refresh. Its contract:
//   - the reader comes from the Clerk session, never from the request;
//   - `SOCIAL_FRIENDS_ENABLED` is re-checked for that reader, and off answers 404, as a route that is not there;
//   - the table is read only through the seat grant (`loadTable`); a table the reader may not see is 404, and one
//     they sat at that has closed answers its closed body (`loadClosedTable`) so the page draws L4 in place;
//   - each seat whose legal deck has no reading yet is read on the spot (`readOnTheSpot`, readiness gap 8), one at
//     a time, and the table is read again when one landed, so the answer carries it;
//   - `private, no-store`, because the answer is this reader's view of other players' decks.
// A route rather than a server action because the poll runs in the background: Next runs a page's actions one at a
// time, and a poll queued as an action would wait on, and delay, the reader's own writes.
import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { socialFriendsEnabled } from "../../../../../lib/social/flag";
import { loadClosedTable, loadTable, readOnTheSpot, type TableView } from "../../../../../lib/social/rule-zero-table";
import { requestSwitchEnv } from "../../../../../lib/switches/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Content-Type": "application/json", "Cache-Control": "private, no-store" };

export type TablePoll =
  | { kind: "open"; view: TableView }
  | { kind: "closed"; closed: NonNullable<Awaited<ReturnType<typeof loadClosedTable>>> };

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(null, { status: 401, headers: HEADERS });
  if (!socialFriendsEnabled(await requestSwitchEnv(userId))) return NextResponse.json(null, { status: 404, headers: HEADERS });
  const { id } = await params;
  let view = await loadTable(userId, id);
  if (view) {
    let landed = false;
    for (const seat of view.seats) {
      if (seat.state.kind === "unread" && (await readOnTheSpot(userId, id, seat.seat)) === "read") landed = true;
    }
    if (landed) view = await loadTable(userId, id);
  }
  if (view) return NextResponse.json({ kind: "open", view } satisfies TablePoll, { headers: HEADERS });
  const closed = await loadClosedTable(userId, id);
  if (closed) return NextResponse.json({ kind: "closed", closed } satisfies TablePoll, { headers: HEADERS });
  return NextResponse.json(null, { status: 404, headers: HEADERS });
}
