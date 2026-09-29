import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NavRail, TabBar, MobileHeader } from "./nav";
import { getCollectionStats } from "../../lib/home/summary";
import type { ThemeKey } from "../../lib/theme/themes";
import { aboutSheetEnabled } from "../../lib/about/flag";
import { readSheetState } from "../../lib/about/sheet-state";
import { AboutSheet } from "./about-sheet";
import { NavigationPendingProvider, ShellMain } from "./navigation-pending";

/**
 * Server component. Signed-out users get the bare page (Task 8 renders the
 * hero landing at "/"); signed-in users get the full shell with rail (≥ md),
 * mobile header + bottom tabs (< md), and a scrollable main column.
 *
 * `locked` = no cards uploaded yet (uniqueCards === 0). NavRail and TabBar use
 * this to render Collection/Commanders/Decks as non-interactive until the user
 * completes Step 1 of the first-run flow (§Rail Locked state, property table).
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
  const sheet = aboutSheetEnabled() ? readSheetState(await headers()) : null;

  return (
    <NavigationPendingProvider>
      <div className="flex min-h-screen flex-1">
        <NavRail locked={locked} theme={theme} />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader theme={theme} />
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
  );
}
