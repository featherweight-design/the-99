import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NavRail, TabBar, MobileHeader } from "./nav";
import { getCollectionStats, hasAnyDeck } from "../../lib/home/summary";
import { noCollectionEntryEnabled } from "../../lib/collection/edit-flag";
import { perfRead } from "../../lib/perf/timing";
import { readChip } from "../../lib/payments/chip";
import type { ThemeKey } from "../../lib/theme/themes";
import { SHEET_ON_HEADER } from "../../lib/about/gate";
import { readSheetState } from "../../lib/about/sheet-state";
import { AboutSheet } from "./about-sheet";
import { NavigationPendingProvider, ShellMain } from "./navigation-pending";
import { FanContentNotice } from "./fan-content-notice";
import { isAdmin } from "../../lib/admin/access";
import { adminEnvironment } from "../../lib/admin/environment";
import { navStallLogEnabled } from "../../lib/nav-stall/flag";
import { requestSwitchEnv } from "../../lib/switches/request";
import { socialFriendsEnabled } from "../../lib/social/flag";
import { firstRunTourEnabled } from "../../lib/discovery/onboarding-flag";
import { liveMoments } from "../../lib/moments/live";
import { readSpentMoments } from "../../lib/moments/spent";
import { friendsAfterGameDue } from "../../lib/social/after-game";
import { MomentsProvider } from "../moments/moments-provider";
import { TargetsProvider } from "../discovery/targets-provider";
import { cardSearchEnabled } from "../../lib/card-search/flag";
import { CardSearchRoot } from "../card-search/card-search";
import { helpPanelEnabled } from "../../lib/discovery/onboarding-flag";
import { HelpRoot } from "../help/help-root";

/**
 * Server component. Signed-out users get the bare page (Task 8 renders the
 * hero landing at "/"); signed-in users get the full shell with rail (≥ md),
 * mobile header + bottom tabs (< md), and a scrollable main column.
 *
 * `locked` = no cards uploaded yet (uniqueCards === 0). NavRail and TabBar use
 * this to draw Collection, Commanders, Discover and Decks as locked slots, each
 * opening a note that says why, until the collection is read
 * (docs/superpowers/design-tables/first-run-locked-nav.md).
 *
 * With NO_COLLECTION_ENTRY_ENABLED (no-collection entry, call 6) Collection opens at zero cards and the other three
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
  const { userId } = await auth();

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
    locked && noCollectionEntryEnabled(env)
      ? { hasDecks: await perfRead("shell.hasAnyDeck", () => hasAnyDeck(userId)) }
      : null;
  // The proxy's decision about the one-time About sheet, carried on a request
  // header it sets on document loads only. Read on every render and handed down
  // even when it says nothing, because the sheet latches the state it MOUNTED
  // with: a later re-render of this layout (router.refresh, a revalidating
  // action) arrives without the header and must not unmount an unread sheet.
  // Off since About moved to Home's banner (plan `2026-10-15-about-on-the-banner.md`, PR A): the proxy
  // strips both headers from every request and no longer sets `SHEET_ON_HEADER`, so this is always null
  // and the sheet never mounts. PR B deletes the path.
  const requestHeaders = await headers();
  const sheet = requestHeaders.get(SHEET_ON_HEADER) === "1" ? readSheetState(requestHeaders) : null;
  // The admin door: only the verdict leaves the server, never the list (admin locked rule 10).
  // The Friends row, from the same resolved switches (Social R1): only the boolean reaches the client.
  const door = {
    ...(isAdmin(userId) ? { adminDoor: true, adminEnv: adminEnvironment() ?? undefined } : {}),
    friends: socialFriendsEnabled(env),
    // The menu's credit chip (M1b), read PER REQUEST here and never inside a cached page payload (plan E10).
    credits: await perfRead("shell.creditChip", () => readChip(userId, env)),
    // `Take the tour` under About in the account menu (discovery R3·2), with the tour's own switch.
    tour: firstRunTourEnabled(env),
  };
  // Card search (plan `2026-10-16-card-search.md`, PR C): the header icon and the sheet, or neither.
  const cardSearch = cardSearchEnabled(env);
  // The ? (discovery R2·8): only the boolean reaches the client; off, no ? is drawn anywhere.
  const help = helpPanelEnabled(env);
  // The stuck-loader diagnostic (plumbing). The deployment rides along so the server can tell a page
  // that outlived a deploy from one that did not; it is already in every page's HTML.
  // The moments live for this reader and the ones already spent (discovery R1). Off, or none live, the spent set is not
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
    <NavigationPendingProvider stall={stall}>
      {/* The halo targets (discovery R2), on whatever the switches say: every moment's control registers here. */}
      {/* `navLocked`: the shell's own lock, which the tour taken again (R3·2) reads for its captions. */}
      <TargetsProvider navLocked={locked}>
      <MomentsProvider live={moments} spent={spentMoments}>
      <CardSearchShell userId={cardSearch ? userId : null}>
      <HelpRoot on={help}>
      <div className="flex min-h-dvh flex-1">
        <NavRail locked={locked} openLock={openLock} theme={theme} {...door} friendsMoment={friendsMoment} helpMoment={helpMoment} />
        {/* The tab-bar reserve is on this column, not on <main>, so the Fan Content notice (a sibling of <main>, a
            `contentinfo` landmark) sits above it and clears the bar and the sheets by the same figure (launch epic A1). */}
        <div className="flex min-w-0 flex-1 flex-col pb-[calc(var(--tabbar-h)+var(--about-sheet-h,0px))] md:pb-0">
          <MobileHeader theme={theme} {...door} friendsMoment={friendsMoment} />
          {/* The bottom padding on mobile leaves room for the fixed tab bar, which
              is held to exactly --tabbar-h so this reservation is not an estimate. */}
          {/* `flex flex-col` continues the stretch chain the rail already starts,
              so a route child can claim the leftover height with flex-1 instead
              of guessing at the header/tab-bar offsets in a calc(). */}
          {/* `--about-sheet-h` is set by the About sheet while it is open on a
              phone, so the foot of the page scrolls clear of it (R6 §N5). */}
          {/* `min-h` makes the page at least one screen tall (the viewport less the phone header and the tab bar, or the
              window from `md`), so the notice always starts at or below the fold: present on every page, never in the
              way (R2). `--header-h` is the measured phone header, 0 on desktop where `md:` ignores it. */}
          <ShellMain className="flex min-w-0 flex-1 flex-col min-h-[calc(100dvh-var(--header-h,79px)-var(--tabbar-h))] md:min-h-dvh">
            {children}
          </ShellMain>
          <FanContentNotice />
        </div>
        <TabBar locked={locked} openLock={openLock} helpMoment={helpMoment} />
        {/* Last in the tree, so it is reached after the page in tab order (§N10). */}
        {sheet && <AboutSheet state={sheet} />}
      </div>
      </HelpRoot>
      </CardSearchShell>
      </MomentsProvider>
      </TargetsProvider>
    </NavigationPendingProvider>
    </div>
  );
}

/** The search's root while the switch is on for the reader; its children alone otherwise. */
function CardSearchShell({ userId, children }: { userId: string | null; children: React.ReactNode }) {
  return userId ? <CardSearchRoot userId={userId}>{children}</CardSearchRoot> : <>{children}</>;
}
