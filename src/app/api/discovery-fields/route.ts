// The draw fields of `/discover` rows the page withheld (list payload plan, PR 3).
//
// The page ships the draw columns for its URL's first window only; the client fetches the rest
// from here, in the background, one batch at a time. `/api/card-detail`'s contract, deliberately:
//   - the reader comes from the Clerk session, never from the request;
//   - every slug is validated, and a batch is capped, before anything is read;
//   - the answer is read from THIS reader's own cached payload (`loadDiscoveryPayload`, the
//     page's own loader, so one cache hit), and a slug that is not in it answers nothing;
//   - `private, no-store`, because every field here is the reader's own;
//   - the role basis is the one the PAGE's payload was counted by, carried as `b`, never resolved
//     again here: an app-wide flip of LABEL_ROLE_COUNTS_ENABLED between the render and a batch would
//     otherwise answer with the other basis's rank and fit, merged into the ranking on screen
//     (admin PR 6d-2). The basis is plumbing, app-wide and gates no one's data, so honoring the
//     asked-for one is safe; the environment's kill switch still holds it to the classifier.
// A route rather than a server action because Next runs a page's actions one at a time: a
// background read queued as an action would wait on, and delay, the reader's own writes.
import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { drawFieldsFor } from "../../../lib/discovery/encode";
import { loadDiscoveryPayload } from "../../../lib/discovery/payload";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { KILL } from "../../../lib/switches/resolve";
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
  const basis = params.get("b");
  if (basis !== "labels" && basis !== "classifier") return NextResponse.json(null, { status: 400, headers: HEADERS });
  const slugs = (params.get("s") ?? "").split(",").filter(Boolean);
  if (slugs.length === 0 || slugs.length > MAX_FIELDS_BATCH || !slugs.every((s) => SLUG.test(s))) {
    return NextResponse.json(null, { status: 400, headers: HEADERS });
  }
  // The reader's resolved switches, with the role basis set to the page's: the entry is keyed on the
  // basis, so this reaches the entry the page drew from whatever the switch reads now.
  const { encoded } = await loadDiscoveryPayload(userId, sort, withBasis(await requestSwitchEnv(userId), basis));
  return NextResponse.json({ fields: drawFieldsFor(encoded, new Set(slugs)) }, { headers: HEADERS });
}

/** `env` with LABEL_ROLE_COUNTS_ENABLED set to `basis`, except under the ENVIRONMENT's kill switch
 *  (`off`), which no request raises: the page drew the classifier then too. Read off the environment
 *  itself, because the proxy's switch header carries a bit per switch and cannot say `off`. */
function withBasis(env: NodeJS.ProcessEnv, basis: "labels" | "classifier"): NodeJS.ProcessEnv {
  if (process.env.LABEL_ROLE_COUNTS_ENABLED === KILL) return env;
  return { ...env, LABEL_ROLE_COUNTS_ENABLED: basis === "labels" ? "true" : "false" };
}
