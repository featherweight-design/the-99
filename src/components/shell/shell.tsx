import { shellUserId } from "./shell-session";
import { DeckToastStackHost } from "../decks/deck-toast-stack";
import { after } from "next/server";
import { NavRail, TabBar, MobileHeader, type NavBadges } from "./nav";
import { getCollectionStats, hasAnyDeck } from "../../lib/home/summary";
import { collectionEditEnabled } from "../../lib/collection/edit-flag";
import { perfRead } from "../../lib/perf/timing";
import { readChip } from "../../lib/payments/chip";
import type { ThemeKey } from "../../lib/theme/themes";
import { NavigationPendingProvider, ShellMain } from "./navigation-pending";
import { FanContentNotice } from "./fan-content-notice";
import { isAdmin } from "../../lib/admin/access";
import { adminEnvironment } from "../../lib/admin/environment";
import { navStallLogEnabled } from "../../lib/nav-stall/flag";
import { requestSwitchEnv } from "../../lib/switches/request";
import { PlacePathsProvider } from "../commanders/place-paths";
import { socialFriendsEnabled } from "../../lib/social/flag";
import { commandersPlaceEnabled } from "../../lib/commanders/place-flag";
import { homeFeedEnabled } from "../../lib/feed/flag";
import { unseenFriendsCount } from "../../lib/feed/read";
import { waitingAsksCount } from "../../lib/social/spare-requests";
import { noticeTradeMatches } from "../../lib/social/trade-match";
import { liveMoments } from "../../lib/moments/live";
import { readSpentMoments } from "../../lib/moments/spent";
import { friendsAfterGameDue } from "../../lib/social/after-game";
import { MomentsProvider } from "../moments/moments-provider";
import { TargetsProvider } from "../discovery/targets-provider";
import { CardSearchRoot } from "../card-search/card-search";
import { HelpRoot } from "../help/help-root";
import { unseenCount } from "../../lib/feed/read";
import { pushEnabled } from "../../lib/push/flag";
import { AppBadge } from "../push/app-badge";
import { PushHeartbeat } from "../push/push-heartbeat";

/**
 * Server component. Signed-out users get the bare page (Task 8 renders the
 * hero landing at "/"); signed-in users get the full shell with rail (≥ md),
 * mobile header + bottom tabs (< md), and a scrollable main column.
 *
 * `locked` = no cards uploaded yet (uniqueCards === 0). NavRail and TabBar use
 * this to draw Collection, Commanders, Discover and Decks (Discover leaves with the Commanders place) as locked slots, each
 * opening a note that says why, until the collection is read
 * (docs/superpowers/design-tables/first-run-locked-nav.md).
 *
 * With COLLECTION_EDIT_ENABLED (no-collection entry, call 6) Collection opens at zero cards and the other three
 * stay locked: `openLock` carries whether the account has a deck, which decides the note's button (first run's
 * `Go to step 1`, or `Add your cards` outside it) and its `Your decks are on Home until then.`
 */
export default async function Shell({
  children,
  theme,
}: {
  children: React.ReactNode;
  // Resolved once in the root layout, which needs it for `<html data-theme>`
  // anyway. Passing it down keeps the cookie read to one per request.
  theme: ThemeKey;
}) {
  const userId = await shellUserId();

  if (!userId) {
    // The Fan Content notice follows every signed-out page, centered on the pages' own axis; none of them mounts it
    // (launch epic A1). The wrapper gives a short page (the error fallback, which has no minimum of its own) a full-viewport minimum, so the notice waits one scroll below the fold.
    return (
      <>
        <div className="flex min-h-dvh flex-col">{children}</div>
        <FanContentNotice align="center" />
      </>
    );
  }

  const stats = await perfRead("shell.collectionStats", () => getCollectionStats(userId));
  const locked = stats.uniqueCards === 0;
  // The reader's resolved switches, once for the shell: the lock's shape and the stall diagnostic both decide here.
  const env = await requestSwitchEnv(userId);
  // The deck probe runs only while locked with the line's switch on; every other render keeps the shipped reads.
  const openLock =
    locked && collectionEditEnabled(env)
      ? { hasDecks: await perfRead("shell.hasAnyDeck", () => hasAnyDeck(userId)) }
      : null;
  // The admin door: only the verdict leaves the server, never the list (admin locked rule 10).
  // The Friends row, from the same resolved switches (Social R1): only the boolean reaches the client.
  const door = {
    ...(isAdmin(userId) ? { adminDoor: true, adminEnv: adminEnvironment() ?? undefined } : {}),
    friends: socialFriendsEnabled(env),
    // The menu's credit chip (M1b), read PER REQUEST here and never inside a cached page payload (plan E10).
    credits: await perfRead("shell.creditChip", () => readChip(userId, env)),
    // The Commanders place: Discover leaves the bar, and with `friends` Friends takes its slot and Settings its row.
    commandersPlace: commandersPlaceEnabled(env),
    // Settings' news section: with the Commanders place, the menu's Settings row is drawn for it even with Friends off.
    homeFeed: homeFeedEnabled(env),
  };
  // The stuck-loader diagnostic (plumbing). The deployment rides along so the server can tell a page
  // that outlived a deploy from one that did not; it is already in every page's HTML.
  // The moments live for this reader and the ones already spent (discovery R1). With none live the spent set is not
  // read, and the provider is handed nothing, so no anchor registers.
  const moments = liveMoments(env);
  const spentMoments = moments.length > 0 ? await perfRead("shell.momentsSpent", () => readSpentMoments(userId)) : [];
  // M11's condition (a game logged, no friend yet) is read only while that moment is live and unspent.
  const friendsMoment =
    moments.includes("friends-after-game") && !spentMoments.includes("friends-after-game")
      ? await perfRead("shell.friendsAfterGame", () => friendsAfterGameDue(userId))
      : false;
  // M12's condition (no deck yet) is read only while that moment is live and unspent.
  const helpMoment =
    moments.includes("help-me-choose") && !spentMoments.includes("help-me-choose")
      ? !(await perfRead("shell.hasAnyDeck", () => hasAnyDeck(userId)))
      : false;
  // The bar's unseen counts (menu and Home handoff, R1 Menu 8): Home's from the feed, Friends' from what waits on the
  // reader. An absent count draws no badge. Home's is one statement over the feed's union, read only with
  // HOME_FEED_ENABLED on; a failed read draws no badge rather than breaking every page. Friends' is the unseen trade
  // matches (product call 2) and unseen answers to the reader's spare requests, cleared by a /friends visit, plus the
  // spare requests waiting on the reader's answer, cleared only by answering (plan `2026-10-22-spare-requests.md`), and read only while Friends has its slot in the bar. A trade
  // match is noticed after the response (`noticeTradeMatches`, after() only), so one that appears is counted on the next
  // render.
  const badges: NavBadges = {};
  if (homeFeedEnabled(env)) {
    const homeUnseen = await perfRead("shell.feedUnseen", () => unseenCount(userId, env)).catch((error: unknown) => {
      console.error("shell: the feed's unseen count could not be read", error instanceof Error ? error.message : "");
      return 0;
    });
    if (homeUnseen > 0) badges.home = homeUnseen;
  }
  if (door.friends && door.commandersPlace) {
    // Taken BEFORE the read, so an answer that lands during it is never taken off a count that may not hold it.
    badges.friendsAt = new Date().toISOString();
    const [seenHalf, waiting] = await Promise.all([
      perfRead("shell.friendsBadge", () => unseenFriendsCount(userId, env)),
      perfRead("shell.friendsWaiting", () => waitingAsksCount(userId, env)),
    ]);
    badges.friends = seenHalf;
    if (waiting > 0) badges.friendsWaiting = waiting;
    after(() => noticeTradeMatches(userId, env));
  }
  // An installed app carries the Home slot's count on its icon (push PR 5, G6), only with this reader's
  // PUSH_ENABLED on (`pushEnabled`, never `pushAvailable`: the key parsing stays off the pages' switch path, `flag.ts`).
  const pushOn = pushEnabled(env);
  const stall = navStallLogEnabled(env)
    ? { deployment: process.env.VERCEL_DEPLOYMENT_ID ?? null }
    : null;

  return (
    // While locked the phone's tab bar carries the lock's bracket over its tabs and grows to
    // 88px (first-run-locked-nav 4.1). Set on a `display: contents` wrapper OUTSIDE the pending
    // provider, so the bar and every surface reserving its height read the same figure: the
    // main column's padding, the sheets and docks that sit clear of it, and the provider's own
    // loading overlay, which renders beside the shell rather than inside it. Unlocked it is the
    // global 74px from globals.css.
    <div className="contents" style={locked ? ({ "--tabbar-h": "88px" } as React.CSSProperties) : undefined}>
    <PlacePathsProvider place={commandersPlaceEnabled(env)}>
    <NavigationPendingProvider stall={stall}>
      {/* The halo targets (discovery R2), on whatever the switches say: every moment's control registers here. */}
      {/* `navLocked`: the shell's own lock, which the tour taken again (R3·2) reads for its captions. */}
      <TargetsProvider navLocked={locked}>
      <MomentsProvider live={moments} spent={spentMoments}>
      <CardSearchRoot userId={userId}>
      <HelpRoot>
      {pushOn && <PushHeartbeat />}
      <div className="flex min-h-dvh flex-1">
        <NavRail locked={locked} openLock={openLock} theme={theme} {...door} friendsMoment={friendsMoment} helpMoment={helpMoment} badges={badges} />
        {/* The tab-bar reserve is on this column, not on <main>, so the Fan Content notice (a sibling of <main>, a
            `contentinfo` landmark) sits above it and clears the bar and the sheets by the same figure (launch epic A1). */}
        <div className="flex min-w-0 flex-1 flex-col pb-[var(--tabbar-h)] md:pb-0">
          <MobileHeader theme={theme} {...door} friendsMoment={friendsMoment} />
          {/* The bottom padding on mobile leaves room for the fixed tab bar, which
              is held to exactly --tabbar-h so this reservation is not an estimate. */}
          {/* `flex flex-col` continues the stretch chain the rail already starts,
              so a route child can claim the leftover height with flex-1 instead
              of guessing at the header/tab-bar offsets in a calc(). */}
          {/* `min-h` makes the page at least one screen tall (the viewport less the phone header and the tab bar, or the
              window from `md`), so the notice always starts at or below the fold: present on every page, never in the
              way (R2). `--header-h` is the measured phone header, 0 on desktop where `md:` ignores it. */}
          <ShellMain className="flex min-w-0 flex-1 flex-col min-h-[calc(100dvh-var(--header-h,79px)-var(--tabbar-h))] md:min-h-dvh">
            {children}
          </ShellMain>
          <FanContentNotice />
        </div>
        <TabBar
          locked={locked}
          openLock={openLock}
          helpMoment={helpMoment}
          friendsMoment={friendsMoment}
          friends={door.friends}
          commandersPlace={door.commandersPlace}
          badges={badges}
        />
        {pushOn && <AppBadge badges={badges} />}
        {/* The deck page's toast stack (small items 3, item 8): empty until a deck toast portals in. Here, inside the
            lock's `--tabbar-h`, and outside every page's own stacking context. */}
        <DeckToastStackHost />
      </div>
      </HelpRoot>
      </CardSearchRoot>
      </MomentsProvider>
      </TargetsProvider>
    </NavigationPendingProvider>
    </PlacePathsProvider>
    </div>
  );
}
