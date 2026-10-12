import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NavRail, TabBar, MobileHeader } from "./nav";
import { getCollectionStats } from "../../lib/home/summary";
import type { ThemeKey } from "../../lib/theme/themes";
import { aboutSheetEnabled } from "../../lib/about/flag";
import { readSheetState } from "../../lib/about/sheet-state";
import { AboutSheet } from "./about-sheet";
import { NavigationPendingProvider, ShellMain } from "./navigation-pending";
import { isAdmin } from "../../lib/admin/access";
import { adminEnvironment } from "../../lib/admin/environment";
import { resolveSwitchEnv } from "../../lib/switches/snapshot";

/**
 * Server component. Signed-out users get the bare page (Task 8 renders the
 * hero landing at "/"); signed-in users get the full shell with rail (≥ md),
 * mobile header + bottom tabs (< md), and a scrollable main column.
 *
 * `locked` = no cards uploaded yet (uniqueCards === 0). NavRail and TabBar use
 * this to draw Collection, Commanders, Discover and Decks as locked slots, each
 * opening a note that says why, until the collection is read
 * (docs/superpowers/design-tables/first-run-locked-nav.md).
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
    return <>{children}</>;
  }

  const stats = await getCollectionStats(userId);
  const locked = stats.uniqueCards === 0;
  // The proxy's decision about the one-time About sheet, carried on a request
  // header it sets on document loads only. Read on every render and handed down
  // even when it says nothing, because the sheet latches the state it MOUNTED
  // with: a later re-render of this layout (router.refresh, a revalidating
  // action) arrives without the header and must not unmount an unread sheet.
  // Decided from the reader's RESOLVED switches, as the proxy decides: the proxy strips the header
  // only when the sheet is on for this reader, so reading it on anyone else's would trust a header
  // the client sent.
  const sheet = aboutSheetEnabled(await resolveSwitchEnv(userId)) ? readSheetState(await headers()) : null;
  // The admin door: only the verdict leaves the server, never the list (admin locked rule 10).
  const door = isAdmin(userId) ? { adminDoor: true, adminEnv: adminEnvironment() ?? undefined } : {};

  return (
    // While locked the phone's tab bar carries the lock's bracket over its tabs and grows to
    // 88px (first-run-locked-nav 4.1). Set on a `display: contents` wrapper OUTSIDE the pending
    // provider, so the bar and every surface reserving its height read the same figure: the
    // main column's padding, the sheets and docks that sit clear of it, and the provider's own
    // loading overlay, which renders beside the shell rather than inside it. Unlocked it is the
    // global 74px from globals.css.
    <div className="contents" style={locked ? ({ "--tabbar-h": "88px" } as React.CSSProperties) : undefined}>
    <NavigationPendingProvider>
      <div className="flex min-h-screen flex-1">
        <NavRail locked={locked} theme={theme} {...door} />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader theme={theme} {...door} />
          {/* The bottom padding on mobile leaves room for the fixed tab bar, which
              is held to exactly --tabbar-h so this reservation is not an estimate. */}
          {/* `flex flex-col` continues the stretch chain the rail already starts,
              so a route child can claim the leftover height with flex-1 instead
              of guessing at the header/tab-bar offsets in a calc(). */}
          {/* `--about-sheet-h` is set by the About sheet while it is open on a
              phone, so the foot of the page scrolls clear of it (R6 §N5). */}
          <ShellMain className="flex min-w-0 flex-1 flex-col pb-[calc(var(--tabbar-h)+var(--about-sheet-h,0px))] md:pb-0">
            {children}
          </ShellMain>
        </div>
        <TabBar locked={locked} />
        {/* Last in the tree, so it is reached after the page in tab order (§N10). */}
        {sheet && <AboutSheet state={sheet} />}
      </div>
    </NavigationPendingProvider>
    </div>
  );
}
