// The shared ancestor of the three routes that take the Commanders place strip (`/commanders`,
// `/commanders/discover`, `/commanders/choose`) and nothing else: `/commanders/[slug]` is a sibling
// OUTSIDE the group (menu and Home plan, erratum 3), as `/collection/replace` is for Collection
// (`collection/(list)/layout.tsx` explains why a layout persists across a tab press).
//
// Behind `COMMANDERS_PLACE_ENABLED`: off, the layout is a pass-through and every route renders as shipped.
import { requireUserId } from "../../../lib/auth";
import { loadCommanderCounts } from "../../../lib/commanders/counts";
import { getCollectionStats } from "../../../lib/home/summary";
import { commandersPlaceEnabled } from "../../../lib/commanders/place-flag";
import { helpMeChooseEnabled } from "../../../lib/intake/flag";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { CommandersPlaceHead } from "../../../components/commanders/commanders-place-head";
import { CollectionContentScope } from "../../../components/collection/collection-content-scope";

export default async function CommandersListLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!commandersPlaceEnabled(env)) return <>{children}</>;
  // No cards, no figures: the tabs under the strip draw their own empty state.
  const stats = await getCollectionStats(userId);
  const counts = stats.uniqueCards === 0 ? null : await loadCommanderCounts(userId, env);
  return (
    <>
      <CommandersPlaceHead helpMeChoose={helpMeChooseEnabled(env)} counts={counts} />
      <CollectionContentScope place="commanders">{children}</CollectionContentScope>
    </>
  );
}
