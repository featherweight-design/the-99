// The Collection's combos view: the two-card combos the reader owns both pieces of, or one piece of.
//
// CACHE STANCE (fwd caching): `private, no-store`, and NO server cache. Every row is the reader's own (their
// collection, their decks), the view opens by a press rather than on every visit, and the client keeps each side
// it has fetched (`useCollectionCombos`, keyed on the list payload the page served: a refresh that brings new
// cards brings new pairs), so a second look costs nothing. A server cache would need a tag every collection and deck
// write already drops; the client cache needs none because it lives for one page.
//   - the reader comes from the Clerk session, never from the request (401 without one);
//   - one request answers BOTH sides (`{ both, one }`), so the view opens with both toggle counts and the
//     filters narrow the pairs on the client, never by another request;
//   - every read is rooted in THIS reader's `collection_items` and `decks`;
//   - rate limited in the `draw-fields` bucket, the app's own background-read rule.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { loadCollectionComboSides } from "../../../lib/combos/collection-combos";
import { requestFlags } from "../../../lib/flags/request";
import { enforceHit } from "../../../lib/rate/observe";
import { tooManyRequests } from "../../../lib/rate/refuse";
import { readerStoreForPage } from "../../../lib/stores/preference";

export const runtime = "nodejs";

const HEADERS = { "Content-Type": "application/json", "Cache-Control": "private, no-store" };

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(null, { status: 401, headers: HEADERS });
  const wait = await enforceHit(userId, "draw-fields");
  if (wait !== null) return tooManyRequests(wait, HEADERS);
  const store = await readerStoreForPage(userId, await requestFlags(userId)).catch(() => "manapool" as const);
  // A failed read answers 500 with the same no-store headers, so the response stays uncacheable and the view can
  // draw its failed state. Prices and wanted-by already degrade to silence inside the loader.
  try {
    const combos = await loadCollectionComboSides({ userId, store });
    return NextResponse.json(combos, { headers: HEADERS });
  } catch {
    return NextResponse.json(null, { status: 500, headers: HEADERS });
  }
}
