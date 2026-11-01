// /commanders/hidden: the Commanders place's fourth tab (design_handoff_the99_hide_commander README §3). The
// commanders the reader hid, newest first, each with the way back. Read live per request: it caches nothing, and the
// list is the reader's own small set.
//
// No collection is needed to draw it (READINESS: "no console error on /commanders/hidden for a reader with no
// collection"): a hide outlives a collection replaced or emptied, so the list reads the hides alone.
import { requireUserId } from "../../../../lib/auth";
import { loadHiddenList } from "../../../../lib/commanders/hidden-list";
import { requestSwitchEnv } from "../../../../lib/switches/request";
import { PageHeader } from "../../../../components/commanders/page-header";
import { HiddenList } from "../../../../components/commanders/hidden-list";

export default async function HiddenPage() {
  const userId = await requireUserId();
  // The reader's resolved switches (`requestSwitchEnv`): the slug lookup reads the stored scores under them.
  const env = await requestSwitchEnv(userId);
  // Freshness: no write needs to invalidate this route. Neither the loader nor anything it calls is wrapped in
  // `unstable_cache` / `cacheForUser`, the page is dynamic (it reads the session), and the client router cache holds
  // a dynamic page for 0s (`staleTimes.dynamic`'s Next 16 default; next.config.ts sets none, and no link to this tab
  // prefetches with `prefetch={true}`). So a hide, an unhide, `retryRecs` deleting scores, or a deck claim or build
  // is read on the next navigation here. The only copy that can lag is the mounted list's own state, which
  // `mergeServed` reconciles with each served payload. Its entry in `collection/invalidate.ts` costs nothing.
  const rows = await loadHiddenList(userId, env);
  // No `min-h-screen`: the board draws the zero state straight under the header (its own 40px/34px top), not
  // centred in the viewport's leftover height as `ZeroState`'s `flex-1` would place it in a full-height column.
  return (
    <section className="flex flex-col">
      <PageHeader lane="hidden" />
      <HiddenList rows={rows} />
    </section>
  );
}
