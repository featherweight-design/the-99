// The reader's visible About entries, for the "?" panel (discovery plan R2·1b, R2 gap 6). The panel fetches them on
// its first open rather than shipping About's copy to every page: `about-entries.ts` is ~1,500 lines, and the
// client-graph guard keeps it out of every page but `/about`. Its contract:
//   - the reader comes from the Clerk session, never from the request;
//   - `HELP_PANEL_ENABLED` is re-checked for that reader, and off answers 404, as a route that is not there;
//   - the entries are `visibleEntries` under the reader's resolved switches, so a switched-off entry, and a caption
//     or key line its switch strips, never leave the server;
//   - `private, no-store`, because the answer follows this reader's switches and allowance.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { entriesPayload } from "../../../../lib/about/entries-payload";
import { visibleEntries } from "../../../../lib/about/visible";
import { helpPanelEnabled } from "../../../../lib/discovery/onboarding-flag";
import { dailyLimitFor } from "../../../../lib/model/allowance";
import { requestSwitchEnv } from "../../../../lib/switches/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Content-Type": "application/json", "Cache-Control": "private, no-store" };

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(null, { status: 401, headers: HEADERS });
  const env = await requestSwitchEnv(userId);
  if (!helpPanelEnabled(env)) return NextResponse.json(null, { status: 404, headers: HEADERS });
  const creditLimit = await dailyLimitFor(db, userId);
  return NextResponse.json({ entries: entriesPayload(visibleEntries(env), creditLimit) }, { headers: HEADERS });
}
