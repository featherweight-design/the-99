// The shared ancestor of the three routes that take the Commanders place strip (`/commanders`,
// `/commanders/discover`, `/commanders/choose`) and nothing else: `/commanders/[slug]` is a sibling
// OUTSIDE the group (menu and Home plan, erratum 3), as `/collection/replace` is for Collection
// (`collection/(list)/layout.tsx` explains why a layout persists across a tab press).
//
// Behind `COMMANDERS_PLACE_ENABLED`: off, the layout is a pass-through and every route renders as shipped.
import { requireUserId } from "../../../lib/auth";
import { commandersPlaceEnabled } from "../../../lib/commanders/place-flag";
import { helpMeChooseEnabled } from "../../../lib/intake/flag";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { CommandersPlaceHead } from "../../../components/commanders/commanders-place-head";
import { CollectionContentScope } from "../../../components/collection/collection-content-scope";
import { commandersPlaceFromPathname } from "../../../components/commanders/commanders-place-head";

export default async function CommandersListLayout({ children }: { children: React.ReactNode }) {
  const env = await requestSwitchEnv(await requireUserId());
  if (!commandersPlaceEnabled(env)) return <>{children}</>;
  return (
    <>
      <CommandersPlaceHead helpMeChoose={helpMeChooseEnabled(env)} />
      <CollectionContentScope inPlace={(pathname) => commandersPlaceFromPathname(pathname) !== null}>{children}</CollectionContentScope>
    </>
  );
}
