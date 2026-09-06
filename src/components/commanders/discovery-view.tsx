"use client";

import { useMemo, useState } from "react";
import { filterByColors } from "../../lib/commanders/filter";
// Type-only, and required rather than stylistic: `src/lib/discovery/list.ts`
// reaches `src/db/index.ts`, whose module body throws when DATABASE_URL is unset
// and pulls `ws` and the neon driver in with it. A type-only clause is erased at
// compile time, so none of that reaches the client bundle.
import type { DiscoveryList } from "../../lib/discovery/list";
import { RecCard } from "./rec-card";
// Imported, never redeclared: it is 25, and the reveal band only lines up with
// the shipped control if both windows step by the same number.
import { REVEAL_STEP } from "./reveal-control";

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
  // Setters are deliberately unread until the colour filter and the reveal band
  // mount in later phases.
  const [colors] = useState<string[]>([]);
  const [shown] = useState(REVEAL_STEP);
  const filtered = useMemo(
    () => filterByColors(discovery.items, colors),
    [discovery.items, colors],
  );

  // Ranks come from the server, over the full pre-filter set, so filtering never
  // renumbers — the same invariant CommandersView holds, reached differently.
  return (
    <>
      <ul>
        {filtered.slice(0, shown).map((item) => (
          <li key={item.oracleId}>
            <RecCard
              discovery={item}
              sort={discovery.sort}
              rank={item.rank}
              avail={avail}
              counts={item.counts}
            />
          </li>
        ))}
      </ul>
      {/* This list's own live region. `CommandersView` has one, but discovery
          does not render that component, so an announcement routed there would
          target a region that is not in the tree. */}
      <span className="sr-only" aria-live="polite" aria-atomic="true" />
    </>
  );
}
