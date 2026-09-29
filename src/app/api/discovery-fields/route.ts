// The draw fields of `/discover` rows the page withheld (list payload plan, PR 3).
//
// The page ships the draw columns for its URL's first window only; the client fetches the rest
// from here, in the background, one batch at a time. `/api/card-detail`'s contract, deliberately:
//   - the reader comes from the Clerk session, never from the request;
//   - every slug is validated, and a batch is capped, before anything is read;
//   - the answer is read from THIS reader's own cached payload (`loadDiscoveryPayload`, the
//     page's own loader, so one cache hit), and a slug that is not in it answers nothing;
//   - `private, no-store`, because every field here is the reader's own.
// A route rather than a server action because Next runs a page's actions one at a time: a
// background read queued as an action would wait on, and delay, the reader's own writes.
import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { drawFieldsFor } from "../../../lib/discovery/encode";
import { loadDiscoveryPayload } from "../../../lib/discovery/payload";
import { MAX_FIELDS_BATCH } from "../../../lib/discovery/fields-batch";

export const runtime = "nodejs";

const SLUG = /^[a-z0-9-]{1,200}$/;
const HEADERS = { "Content-Type": "application/json", "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(null, { status: 401, headers: HEADERS });
  const params = req.nextUrl.searchParams;
  const sort = params.get("sort");
  if (sort !== "fit" && sort !== "new") return NextResponse.json(null, { status: 400, headers: HEADERS });
  const slugs = (params.get("s") ?? "").split(",").filter(Boolean);
  if (slugs.length === 0 || slugs.length > MAX_FIELDS_BATCH || !slugs.every((s) => SLUG.test(s))) {
    return NextResponse.json(null, { status: 400, headers: HEADERS });
  }
  const { encoded } = await loadDiscoveryPayload(userId, sort);
  return NextResponse.json({ fields: drawFieldsFor(encoded, new Set(slugs)) }, { headers: HEADERS });
}
