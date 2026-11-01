// The shared ancestor of the four routes that take the Commanders place strip (`/commanders`,
// `/commanders/discover`, `/commanders/choose`, `/commanders/hidden`) and nothing else: `/commanders/[slug]`
// is a sibling OUTSIDE the group (menu and Home plan, erratum 3), as `/collection/replace` is for Collection
// (`collection/(list)/layout.tsx` explains why a layout persists across a tab press).
import { requireUserId } from "../../../lib/auth";
import { loadPlaceCounts } from "../../../lib/commanders/counts";
import { CommandersPlaceHead } from "../../../components/commanders/commanders-place-head";
import { CollectionContentScope } from "../../../components/collection/collection-content-scope";

export default async function CommandersListLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  // No cards, no list figures, though the Hidden tab still counts what it holds (`loadPlaceCounts`).
  const counts = await loadPlaceCounts(userId);
  return (
    <>
      <CommandersPlaceHead counts={counts} />
      <CollectionContentScope place="commanders">{children}</CollectionContentScope>
    </>
  );
}
