// /announcements (small items 11, item 3; board `Archive`): every stored Wizards post, newest first, by kind and by month.
// Signed in only (not in `src/proxy.ts`'s public list). Rides `ANNOUNCEMENTS_ENABLED`, resolved for this reader: off, the
// page is a 404 like the switch's other surfaces. Read per request, never cached; READS ONLY (no seen cursor, no dismissal).
// The kind and the month are the address (`?kind=`, `?m=YYYY-MM`); the view keeps the pages it has been served and writes
// the address through `mirrorUrl` (`archive-view.tsx`). Loading is the shell's `LoadingScreen`; a read that throws is the
// app's error boundary.
import { notFound } from "next/navigation";

import { ArchiveView } from "../../components/announcements/archive-view";
import { loadArchive } from "../../lib/announcements/archive";
import { anchorCursor, parseArchiveKind, parseYm } from "../../lib/announcements/archive-model";
import { requireUserId } from "../../lib/auth";
import { requestFlags } from "../../lib/flags/request";

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const userId = await requireUserId();
  const env = await requestFlags(userId);
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const kind = parseArchiveKind(one(sp.kind));
  const anchor = parseYm(one(sp.m));
  const first = await loadArchive(env, kind, anchor ? anchorCursor(anchor) : null);
  if (!first) notFound();
  return <ArchiveView kind={kind} anchor={anchor} page={first.page} counts={first.counts} now={new Date().toISOString()} />;
}
