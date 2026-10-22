// /settings (menu and Home handoff, `Settings.dc.html`; plan `2026-10-22-menu-home.md` PR 3): one page under the
// account menu. This PR draws its Spares section only; What's new on Home joins it in PR 4. With
// `SOCIAL_FRIENDS_ENABLED` off for this reader the page has nothing to show, so the route does not exist.
//
// Signed in only (not in `src/proxy.ts`'s public list). The settings themselves are read per request; Kept back's
// rows come from the reader's cached collection list (`loadCollectionList`, keyed on their own data stamp, which a
// keep or release moves). Every write revalidates the page. Loading is the shell's `LoadingScreen`; a read that throws is the app's error boundary.

import { notFound } from "next/navigation";
import { requireUserId } from "../../lib/auth";
import { socialFriendsEnabled } from "../../lib/social/flag";
import { requestSwitchEnv } from "../../lib/switches/request";
import { listSharedPods } from "../../lib/social/spares";
import { loadKeptBack, readSpareMin } from "../../lib/social/spare-settings";
import { loadCollectionList } from "../../lib/collection/payload";
import { keptRows } from "../../lib/settings/kept-rows";
import { SettingsView } from "../../components/settings/settings-view";
import { SparesSection } from "../../components/settings/spares-section";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!socialFriendsEnabled(env)) notFound();
  const [spareMin, shared, kept] = await Promise.all([readSpareMin(userId), listSharedPods(userId), loadKeptBack(userId)]);
  // The kept rows are the shipped collection rows, so they draw from the reader's own cached collection list; it is
  // read only when something is kept back.
  const collection = kept.length > 0 ? (await loadCollectionList(userId)).cards : [];
  return (
    <SettingsView>
      <SparesSection spareMin={spareMin} pods={shared.map((p) => p.name)} kept={keptRows(kept, collection)} />
    </SettingsView>
  );
}
