// /about — the app's own reference. Auth-gated like every other route: the app
// is invite-only, so there is no public version of this page.

import { requireUserId } from "../../lib/auth";
import { aboutVersionSeen } from "../../lib/about/read";
import { AboutPage } from "../../components/about/about-page";

export default async function AboutRoute({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [userId, params] = await Promise.all([requireUserId(), searchParams]);
  const seen = await aboutVersionSeen(userId);
  return <AboutPage seen={seen} next={params.next} />;
}
