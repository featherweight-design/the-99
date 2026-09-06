"use client";

// Type-only, and required rather than stylistic: `src/lib/discovery/list.ts`
// reaches `src/db/index.ts`, whose module body throws when DATABASE_URL is unset
// and pulls `ws` and the neon driver in with it. A type-only clause is erased at
// compile time, so none of that reaches the client bundle.
import type { DiscoveryList } from "../../lib/discovery/list";

/**
 * Discovery's list is its own client component rather than an adaptation of
 * `CommandersView`: that one takes `CommanderListItem[]` and holds the owned
 * scope's two client-side rankings and its `ScoreDelta` state, none of which
 * discovery has. Fabricating a score or a synergy state to fit its props would
 * put invented numbers one prop away from a surface whose premise is that every
 * figure prints its denominator.
 */
export function DiscoveryView({
  discovery,
  avail,
}: {
  discovery: DiscoveryList;
  avail: "all" | "free";
}) {
  // No list yet. `RecCard`'s discovery arm renders nothing until the row lands,
  // so mapping the items here would emit one empty `<li>` per candidate — a list
  // that announces its length to a screen reader and has nothing in it. The
  // items are on the props and the route is reachable; the rows are the next
  // phase.
  void discovery;
  void avail;

  // This list's own live region. `CommandersView` has one, but discovery does
  // not render that component, so an announcement routed there would target a
  // region that is not in the tree.
  return <span className="sr-only" aria-live="polite" aria-atomic="true" />;
}
