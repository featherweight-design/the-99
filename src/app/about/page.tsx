// /about — the app's own reference. Auth-gated like every other route: the app
// is invite-only, so there is no public version of this page.

import { requireUserId } from "../../lib/auth";
import { aboutVersionSeen } from "../../lib/about/read";
import { AboutPage } from "../../components/about/about-page";
import { aboutSheetEnabled } from "../../lib/about/flag";

/**
 * A repeated query key arrives as an array — `/about?next=/decks&next=/collection`
 * is a URL anyone can write. Typed as `string` it read as one, and `safeNext`
 * would have called `startsWith` on an array and thrown during render: a
 * crafted link crashing the page whose whole job is being reachable.
 *
 * An array is refused rather than reduced to its first value. Two destinations
 * is not a destination, and picking one would be guessing at which.
 */
function soleNext(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function AboutRoute({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const [userId, params] = await Promise.all([requireUserId(), searchParams]);
  const seen = await aboutVersionSeen(userId);
  return <AboutPage seen={seen} next={soleNext(params.next)} sheetMode={aboutSheetEnabled()} />;
}
