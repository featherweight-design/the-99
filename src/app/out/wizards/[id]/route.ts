// A press or a push on a Wizards post (Announcements UI 3b): `/out/wizards/<contentful id>` redirects to the post on
// magic.wizards.com. Its contract:
//   - signed in (Clerk, through the proxy like every non-public path); the reader comes from the session;
//   - `ANNOUNCEMENTS_ENABLED` is re-checked for that reader (`requestSwitchEnv`);
//   - the post's address is read from `wizards_announcements` by its Contentful id, and followed only when it is an
//     https page on magic.wizards.com (`wizardsPostUrl`, the rule Home's row decides its press by);
//   - a signed-out request never reaches this handler: the proxy sends it to sign-in; the handler's own signed-out branch
//     (to Home) is defense in depth only;
//   - anything else (the switch off, an unknown id, an address off that host) goes to Home, never an error;
//   - it marks nothing seen (push D4: a landing never does; Home's own visit does);
//   - `private, no-store`, because the answer depends on the reader's switch.
// A route of the app's own because a notification's landing must stay on this origin (`public/sw.js`), and so the host
// is checked at the press from the database, never trusted from a payload or a cached page. `public/sw.js` opens a
// window for any path under `/out/` rather than navigating the app's own, since the redirect leaves the origin.
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "../../../../db";
import { wizardsAnnouncements } from "../../../../db/schema";
import { announcementsEnabled } from "../../../../lib/announcements/flag";
import { wizardsPostUrl } from "../../../../lib/feed/home";
import { requestSwitchEnv } from "../../../../lib/switches/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A Contentful id is short and plain; anything else is not looked up. */
const ID = /^[A-Za-z0-9_-]{1,64}$/;

const go = (to: string | URL) => NextResponse.redirect(to, { status: 307, headers: { "Cache-Control": "private, no-store" } });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const home = new URL("/", req.url);
  const { userId } = await auth();
  if (!userId) return go(home);
  if (!announcementsEnabled(await requestSwitchEnv(userId))) return go(home);
  const { id } = await params;
  if (!ID.test(id)) return go(home);
  const [post] = await db.select({ url: wizardsAnnouncements.url }).from(wizardsAnnouncements).where(eq(wizardsAnnouncements.contentfulId, id)).limit(1);
  const out = post ? wizardsPostUrl(post.url) : null;
  return go(out ?? home);
}
