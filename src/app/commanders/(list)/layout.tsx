// The shared ancestor of the three routes that take the Commanders place strip (`/commanders`,
// `/commanders/discover`, `/commanders/choose`) and nothing else: `/commanders/[slug]` is a sibling
// OUTSIDE the group (menu and Home plan, erratum 3), as `/collection/replace` is for Collection
// (`collection/(list)/layout.tsx` explains why a layout persists across a tab press).
import { requireUserId } from "../../../lib/auth";
import { loadCommanderCounts } from "../../../lib/commanders/counts";
import { getCollectionStats } from "../../../lib/home/summary";
import { CommandersPlaceHead } from "../../../components/commanders/commanders-place-head";
import { CollectionContentScope } from "../../../components/collection/collection-content-scope";

export default async function CommandersListLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  // No cards, no figures: the tabs under the strip draw their own empty state.
  const stats = await getCollectionStats(userId);
  const counts = stats.uniqueCards === 0 ? null : await loadCommanderCounts(userId);
  return (
    <>
      <CommandersPlaceHead counts={counts} />
      <CollectionContentScope place="commanders">{children}</CollectionContentScope>
    </>
  );
}
