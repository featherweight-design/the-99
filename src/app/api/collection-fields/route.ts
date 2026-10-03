// The draw fields of `/collection` cards the page withheld (list payload plan, PR 4).
//
// The page ships the art, the facts and the combo partners for its URL's first window only; the
// client fetches the rest from here, in the background, one batch at a time. `/api/card-detail`'s
// contract, deliberately:
//   - the reader comes from the Clerk session, never from the request;
//   - every id is validated, and a batch is capped, before anything is read;
//   - the answer is read from THIS reader's own cached list (`loadCollectionList`, the page's own
//     loader, so one cache hit), and an id that is not in it answers nothing;
//   - a batch naming a version of the list other than the one cached now is refused as stale;
//   - `private, no-store`, because every field here is the reader's own.
// A route rather than a server action because Next runs a page's actions one at a time: a
// background read queued as an action would wait on, and delay, the reader's own writes.
import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { collectionDrawFieldsFor } from "../../../lib/collection/list-wire";
import { loadCollectionList } from "../../../lib/collection/payload";
import { MAX_COLLECTION_FIELDS_BATCH } from "../../../lib/collection/fields-batch";

export const runtime = "nodejs";

/** Scryfall's oracle ids are UUIDs. */
const ORACLE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HEADERS = { "Content-Type": "application/json", "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(null, { status: 401, headers: HEADERS });
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean);
  if (ids.length === 0 || ids.length > MAX_COLLECTION_FIELDS_BATCH || !ids.every((id) => ORACLE_ID.test(id))) {
    return NextResponse.json(null, { status: 400, headers: HEADERS });
  }
  const { cards, version } = await loadCollectionList(userId);
  // The page named the version of the list it served. Answering from another one would put this
  // version's fields under that one's row (a printing picked elsewhere moves the art and keeps
  // the id), so the batch is refused as stale and the client reads the page again.
  const asked = req.nextUrl.searchParams.get("v");
  if (asked !== null && asked !== version) return NextResponse.json({ fields: {}, stale: true }, { headers: HEADERS });
  return NextResponse.json({ fields: collectionDrawFieldsFor(cards, new Set(ids)) }, { headers: HEADERS });
}
