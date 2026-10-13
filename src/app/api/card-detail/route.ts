import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { MAX_DECK_SCOPE, sanitizeDeckScope } from "../../../lib/combos/deck-scope-param";
import { loadCardDetail } from "../../../lib/collection/card-detail";
import { encodeCardDetail } from "../../../lib/cards/card-detail-wire";
import { perfRoute } from "../../../lib/perf/timing";
import { requestSwitchEnv } from "../../../lib/switches/request";

// Pin to Node: the neon-serverless websocket driver does not run on Edge.
export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Card detail for any oracle id, owned or not, READ AHEAD: the card modal's prefetch, on a sign
 * the reader is about to press a card. The press itself reads through `getCardDetail`, the
 * server action, and both answer from the one loader, `loadCardDetail`.
 *
 * A ROUTE HANDLER, not a server action, and that is the point of it. Next runs a page's server
 * actions one at a time, so a read that is only a guess would sit in the same queue as the
 * reader's real writes, and pressing Add after hovering a few rows would wait behind reads
 * nobody asked for. A GET is an ordinary request and queues behind nothing. The press does not
 * use it because on Vercel a route handler runs in a different function from the page, one the
 * page render never warmed: its first request pays a cold start and fresh database connections,
 * where the action runs in the function that just drew the page.
 *
 * `?id=` is the oracle id. `?scope=` is the comma-joined cards of the deck the modal was opened
 * from, if any: what makes `in this deck` sayable in the combo block. Sent by the client and
 * only ever used to CLASSIFY partners the reader already sees, every id checked against the
 * combo index, so a crafted list can show that reader a wrong word about their own deck and
 * reach nothing else. The reader is the SESSION's, never a parameter: every read is of the
 * signed-in reader's own collection and decks. A scope of more than `MAX_DECK_SCOPE` ids is a
 * 400, not a silent truncation: a draft CAN outgrow a legal deck, but `fetchCardDetail` caps what
 * it sends, so a longer list did not come from the app and is a request to refuse rather than to
 * shorten.
 *
 * The proxy's `auth.protect()` turns a signed-out request away before it arrives here (a 307 to
 * sign-in), so the 401 below is the handler not trusting that, rather than the path a signed-out
 * reader takes. `fetchCardDetail` treats the redirect as the failure it is.
 */
export async function GET(req: NextRequest) {
  // `measure:load`'s spans (PERF_TIMING=1 only; a pass-through otherwise).
  const perf = perfRoute("/api/card-detail");
  const { userId } = await perf.timed("auth", () => auth());
  if (!userId) return NextResponse.json(null, { status: 401 });
  const params = req.nextUrl.searchParams;
  const oracleId = params.get("id") ?? "";
  // A non-uuid would reach Postgres as a cast error rather than a miss.
  if (!UUID.test(oracleId)) return NextResponse.json(null, { status: 404 });
  const scope = params.get("scope");
  const ids = scope ? scope.split(",") : undefined;
  if (ids && ids.length > MAX_DECK_SCOPE) return NextResponse.json(null, { status: 400 });
  const scoped = sanitizeDeckScope(ids);
  const env = await requestSwitchEnv(userId);
  const card = await perf.timed("loadCardDetail", () => loadCardDetail(userId, oracleId, scoped, env));
  // Per reader and per moment: a card carries the reader's availability, which their own
  // writes move, so no shared or stored copy is ever right.
  // `encodeCardDetail`, not `NextResponse.json`: a price fact's `asOf` is a Date, and plain JSON
  // hands the modal a string it then calls `getTime` on.
  return new NextResponse(encodeCardDetail(card), {
    status: card ? 200 : 404,
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
}
