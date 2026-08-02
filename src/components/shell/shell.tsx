import { auth } from "@clerk/nextjs/server";
import { NavRail, TabBar, MobileHeader } from "./nav";
import { getCollectionStats } from "../../lib/home/summary";

/**
 * Server component. Signed-out users get the bare page (Task 8 renders the
 * hero landing at "/"); signed-in users get the full shell with rail (≥ md),
 * mobile header + bottom tabs (< md), and a scrollable main column.
 *
 * `locked` = no cards uploaded yet (uniqueCards === 0). NavRail and TabBar use
 * this to render Collection/Commanders/Decks as non-interactive until the user
 * completes Step 1 of the first-run flow (§Rail Locked state, property table).
 */
export default async function Shell({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    return <>{children}</>;
  }

  const stats = await getCollectionStats(userId);
  const locked = stats.uniqueCards === 0;

  return (
    <div className="flex min-h-screen flex-1">
      <NavRail locked={locked} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        {/* pb-[80px] on mobile leaves room for the fixed tab bar
            (48px content + 22px safe-area + ~10px gap). */}
        {/* `flex flex-col` continues the stretch chain the rail already starts,
            so a route child can claim the leftover height with flex-1 instead
            of guessing at the header/tab-bar offsets in a calc(). */}
        <main className="flex min-w-0 flex-1 flex-col pb-[80px] md:pb-0">{children}</main>
      </div>
      <TabBar locked={locked} />
    </div>
  );
}
