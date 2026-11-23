// /settings (menu and Home handoff, `Settings.dc.html`; plan `2026-10-22-menu-home.md` PR 3 and 4): one page under the
// account menu. Notifications comes first, then Spares, then Your decks (friend decks README 4b), then Account (account
// settings handoff call 1). Account's name is the reader's profile name, made on first use as /friends makes it
// (`ensureSenderProfile`, READINESS clarification 3); its email and sign-in methods are Clerk's. Clerk's read is a Backend
// round trip, so Account streams in behind its own Suspense boundary and the rest of the page never waits on it.
//
// Signed in only (not in `src/proxy.ts`'s public list). The settings themselves are read per request; Kept back's
// rows come from the reader's cached collection list (`loadCollectionList`, keyed on their own data stamp, which a
// keep or release moves). Every write revalidates the page. Loading is the shell's `LoadingScreen`; a read that throws is the app's error boundary.

import { Suspense } from "react";
import { requireUserId } from "../../lib/auth";
import { AccountSlot } from "./account-slot";
import { loadFriendDeckPrefs } from "../../lib/social/deck-visibility";
import { loadNewsSettings } from "../../lib/feed/prefs";
import { pushAvailable } from "../../lib/push/available";
import { pushableFeedKinds } from "../../lib/push/catalog-rule";
import { pushConfig } from "../../lib/push/config";
import { loadPushKinds } from "../../lib/push/prefs";
import { requestFlags } from "../../lib/flags/request";
import { listSharedPods } from "../../lib/social/spares";
import { loadKeptBack, readSpareMin } from "../../lib/social/spare-settings";
import { loadCollectionList } from "../../lib/collection/payload";
import { readerStore, readerStoreForPage } from "../../lib/stores/preference";
import { keptRows } from "../../lib/settings/kept-rows";
import { SettingsView } from "../../components/settings/settings-view";
import { SparesSection } from "../../components/settings/spares-section";
import { NewsSection } from "../../components/settings/news-section";
import { FriendDecksSection } from "../../components/settings/friend-decks-section";
import { StoreSection } from "../../components/settings/store-section";
import { storePreferenceEnabled } from "../../lib/stores/flag";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const env = await requestFlags(userId);
  // Your decks: the reader's own two rules.
  // Push (`PUSH_ENABLED` and the VAPID keys, push handoff calls 1 to 4): the push column's ticks among the same kinds,
  // and the PUBLIC key a browser subscribes with. Unavailable, the section is as shipped. The private key never leaves
  // the server.
  const config = pushAvailable(env) ? pushConfig(env) : null;
  // Store (store choice handoff, call 1): first, and only while the reader's switch is on; off, the page is as shipped.
  const storeOn = storePreferenceEnabled(env);
  const [news, pushOn, spares, deckPrefs, store] = await Promise.all([
    loadNewsSettings(userId, env),
    config ? loadPushKinds(userId, pushableFeedKinds(env)) : null,
    loadSpares(userId, env),
    loadFriendDeckPrefs(userId),
    // Strict: a failed read draws no section rather than Mana Pool checked over a store the reader chose.
    storeOn
      ? readerStore(userId, env).catch((error: unknown) => {
          console.error("[store] settings store read failed; drawing no Store section", error);
          return null;
        })
      : null,
  ]);
  const push = config && pushOn ? { publicKey: config.publicKey, on: pushOn, kinds: pushableFeedKinds(env) } : null;
  return (
    <SettingsView>
      {store ? <StoreSection store={store} /> : null}
      <NewsSection kinds={news} push={push} />
      <SparesSection {...spares} />
      <FriendDecksSection prefs={deckPrefs} />
      <Suspense fallback={null}>
        <AccountSlot userId={userId} />
      </Suspense>
    </SettingsView>
  );
}

async function loadSpares(userId: string, env: NodeJS.ProcessEnv) {
  const [spareMin, shared, kept] = await Promise.all([readSpareMin(userId), listSharedPods(userId), loadKeptBack(userId)]);
  // The kept rows are the shipped collection rows, so they draw from the reader's own cached collection list; it is
  // read only when something is kept back.
  // At the reader's store, the list every other collection surface reads (its cache files one entry per store).
  const collection = kept.length > 0 ? (await loadCollectionList(userId, await readerStoreForPage(userId, env))).cards : [];
  return { spareMin, pods: shared.map((p) => p.name), kept: keptRows(kept, collection) };
}
