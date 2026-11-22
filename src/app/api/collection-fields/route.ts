// The draw fields of `/collection` cards the page withheld (list payload plan, PR 4).
//
// The page ships the art, the cost, the facts and the combo partners for its URL's first window only; the
// client fetches the rest from here, in the background, one batch at a time. `/api/card-detail`'s
// contract, deliberately:
//   - the reader comes from the Clerk session, never from the request;
//   - every id is validated, and a batch is capped, before anything is read;
//   - the answer is read for the ids asked and no others (`loadBrowseCardsFor`), rooted in THIS reader's
//     own `collection_items` rows, so an id they do not hold answers nothing. It does NOT go through the
//     page's cached list: a miss there rebuilds the whole collection, and a visit makes ~50 batches;
//   - `private, no-store`, because every field here is the reader's own.
// A route rather than a server action because Next runs a page's actions one at a time: a
// background read queued as an action would wait on, and delay, the reader's own writes.
import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { collectionDrawFieldsFor } from "../../../lib/collection/list-wire";
import { loadBrowseCardsFor } from "../../../lib/collection/browse-read";
import { MAX_COLLECTION_FIELDS_BATCH, MAX_COLLECTION_FIELDS_GET } from "../../../lib/collection/fields-batch";
import { enforceHit } from "../../../lib/rate/observe";
import { tooManyRequests } from "../../../lib/rate/refuse";

export const runtime = "nodejs";

/** Scryfall's oracle ids are UUIDs. */
const ORACLE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HEADERS = { "Content-Type": "application/json", "Cache-Control": "private, no-store" };

/** The ids one request names, or null when the batch is empty, over `max`, or holds a value that is no oracle id. */
function validIds(raw: unknown[], max: number): string[] | null {
  if (raw.length === 0 || raw.length > max) return null;
  return raw.every((id) => typeof id === "string" && ORACLE_ID.test(id)) ? (raw as string[]) : null;
}

async function answer(userId: string, ids: string[]) {
  // Duplicates collapse here (the cap counts them, as it always did), and the read is of THESE
  // cards of THIS reader only: never the whole list, which a cache miss would rebuild per batch.
  const asked = new Set(ids);
  const cards = await loadBrowseCardsFor(userId, [...asked]);
  return NextResponse.json({ fields: collectionDrawFieldsFor(cards, asked) }, { headers: HEADERS });
}

/** The reader, or the refusal to hand back: not signed in (401), or over the draw-fields rule (429). */
async function gate(): Promise<{ userId: string } | NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(null, { status: 401, headers: HEADERS });
  const wait = await enforceHit(userId, "draw-fields");
  if (wait !== null) return tooManyRequests(wait, HEADERS);
  return { userId };
}

const BAD_REQUEST = () => NextResponse.json(null, { status: 400, headers: HEADERS });
/** 500 ids is ~20 KB of JSON; a body past this is no batch, and is refused before it is parsed. */
const MAX_BODY_BYTES = 64 * 1024;

/** A batch in the query string, 200 ids at most: what a client that has not reloaded since this changed still sends. */
export async function GET(req: NextRequest) {
  const who = await gate();
  if (who instanceof NextResponse) return who;
  const ids = validIds((req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean), MAX_COLLECTION_FIELDS_GET);
  return ids ? answer(who.userId, ids) : BAD_REQUEST();
}

/** A batch in the body, `{ ids: string[] }`, up to `MAX_COLLECTION_FIELDS_BATCH`. */
export async function POST(req: NextRequest) {
  const who = await gate();
  if (who instanceof NextResponse) return who;
  // The declared length first, so a large body is never read; the text's own length after, since the header can lie.
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return BAD_REQUEST();
  const text = await req.text().catch(() => "");
  if (text.length > MAX_BODY_BYTES) return BAD_REQUEST();
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {}
  const raw = body !== null && typeof body === "object" && "ids" in body ? (body as { ids: unknown }).ids : null;
  const ids = Array.isArray(raw) ? validIds(raw, MAX_COLLECTION_FIELDS_BATCH) : null;
  return ids ? answer(who.userId, ids) : BAD_REQUEST();
}
