// /settings (menu and Home handoff, `Settings.dc.html`; plan `2026-10-22-menu-home.md` PR 3 and 4): one page under the
// account menu. What's new on Home comes first (`HOME_FEED_ENABLED`), then Spares (`SOCIAL_FRIENDS_ENABLED`), then Your
// decks (`FRIEND_DECKS_ENABLED`, friend decks README 4b). Each
// section follows its own switch; with both off for this reader the page has nothing to show, so the route does not
// exist.
//
// Signed in only (not in `src/proxy.ts`'s public list). The settings themselves are read per request; Kept back's
// rows come from the reader's cached collection list (`loadCollectionList`, keyed on their own data stamp, which a
// keep or release moves). Every write revalidates the page. Loading is the shell's `LoadingScreen`; a read that throws is the app's error boundary.

import { notFound } from "next/navigation";
import { requireUserId } from "../../lib/auth";
import { friendDecksEnabled, socialFriendsEnabled } from "../../lib/social/flag";
import { loadFriendDeckPrefs } from "../../lib/social/deck-visibility";
import { homeFeedEnabled } from "../../lib/feed/flag";
import { loadNewsSettings } from "../../lib/feed/prefs";
import { requestSwitchEnv } from "../../lib/switches/request";
import { listSharedPods } from "../../lib/social/spares";
import { loadKeptBack, readSpareMin } from "../../lib/social/spare-settings";
import { loadCollectionList } from "../../lib/collection/payload";
import { keptRows } from "../../lib/settings/kept-rows";
import { SettingsView } from "../../components/settings/settings-view";
import { SparesSection } from "../../components/settings/spares-section";
import { NewsSection } from "../../components/settings/news-section";
import { FriendDecksSection } from "../../components/settings/friend-decks-section";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  const friends = socialFriendsEnabled(env);
  if (!friends && !homeFeedEnabled(env)) notFound();
  // `loadNewsSettings` reads nothing and returns [] while the feed is off, and the section then draws nothing.
  // Your decks (`FRIEND_DECKS_ENABLED`, which needs the friends switch): the reader's own two rules.
  const [news, spares, deckPrefs] = await Promise.all([
    loadNewsSettings(userId, env),
    friends ? loadSpares(userId) : null,
    friendDecksEnabled(env) ? loadFriendDeckPrefs(userId) : null,
  ]);
  return (
    <SettingsView>
      <NewsSection kinds={news} />
      {spares && <SparesSection {...spares} />}
      {deckPrefs && <FriendDecksSection prefs={deckPrefs} />}
    </SettingsView>
  );
}

async function loadSpares(userId: string) {
  const [spareMin, shared, kept] = await Promise.all([readSpareMin(userId), listSharedPods(userId), loadKeptBack(userId)]);
  // The kept rows are the shipped collection rows, so they draw from the reader's own cached collection list; it is
  // read only when something is kept back.
  const collection = kept.length > 0 ? (await loadCollectionList(userId)).cards : [];
  return { spareMin, pods: shared.map((p) => p.name), kept: keptRows(kept, collection) };
}
