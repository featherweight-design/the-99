"use client";

import { useCallback, useMemo, useState } from "react";
import { filterByColors } from "../../lib/commanders/filter";
import { availabilityCopy } from "../../lib/copy/availability";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
// Type-only, and required rather than stylistic: `src/lib/discovery/list.ts`
// reaches `src/db/index.ts`, whose module body throws when DATABASE_URL is unset
// and pulls `ws` and the neon driver in with it. A type-only clause is erased at
// compile time, so none of that reaches the client bundle.
import type { DiscoveryList } from "../../lib/discovery/list";
import { FilterBar } from "./filter-bar";
import { PageHeader } from "./page-header";
import { SortMenu } from "./sort-menu";
import {
  useAvailNav, useRerankAnnouncement, useScopeAnnouncement, useScopeNav, useSortNav,
} from "./list-nav";
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
  const [colors, setColors] = useState<string[]>([]);
  // The reveal band mounts in a later phase; until then the window is the first
  // step and nothing moves it.
  const [shown] = useState(REVEAL_STEP);
  const filtered = useMemo(
    () => filterByColors(discovery.items, colors),
    [discovery.items, colors],
  );

  const setScope = useScopeNav();
  const setSort = useSortNav();
  const setAvail = useAvailNav();
  // Empty on an ordinary load, and the flip's message on arrival from the other
  // scope — the count it names is the one the server just produced.
  const [announcement, setAnnouncement] = useState("");
  useScopeAnnouncement("play", discovery.candidateCount, discovery.sort, setAnnouncement);
  // Both re-ranks happen on the server, so each message names the count that came
  // back with the new ordering rather than one predicted at click time.
  const sortMessage = useCallback(
    (s: "fit" | "new") => discoveryCopy.sort.announce(s, filtered.length),
    [filtered.length],
  );
  const availMessage = useCallback(
    (a: "all" | "free") => availabilityCopy.ranking.announce(a, filtered.length),
    [filtered.length],
  );
  useRerankAnnouncement(discovery.sort, sortMessage, setAnnouncement);
  useRerankAnnouncement(avail, availMessage, setAnnouncement);

  const toggleColor = useCallback((c: string) => {
    setColors((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }, []);
  const clearColors = useCallback(() => setColors([]), []);

  const menu = (
    <SortMenu sort={discovery.sort} hasDecks={discovery.hasDecks} onChange={setSort} />
  );

  // Ranks come from the server, over every item this list carries, so filtering
  // never renumbers — the same invariant CommandersView holds, reached differently.
  return (
    <>
      <PageHeader
        uniqueCardsRead={discovery.cardsRead}
        avail={avail}
        scope="play"
        onScopeChange={setScope}
        sort={discovery.sort}
        candidateCount={discovery.candidateCount}
      />

      {/* The shipped bar, shared with the owned scope. Only the `Order` slot
          differs: discovery has two orderings to choose between, so the slot the
          owned scope fills with an inert label is a menu here. */}
      <FilterBar
        colors={colors}
        onToggleColor={toggleColor}
        onClearColors={clearColors}
        avail={avail}
        onAvailChange={setAvail}
        availOk={discovery.availOk}
        wasWindowed={false}
        shown={Math.min(shown, filtered.length)}
        filteredTotal={filtered.length}
        activeTotal={discovery.items.length}
        // The same menu in both slots, not two variants: the bar's own subtree
        // split decides which one is displayed, and the menu carries its own
        // breakpoint for the two pixels that differ between them.
        order={{ desktop: menu, mobile: menu }}
      />

      {/* No rows yet. `RecCard`'s discovery arm renders nothing until the row
          lands, so mapping the items here would emit one empty `<li>` per
          candidate — a list that announces its length to a screen reader and
          has nothing readable in it. The controls above are this phase; the
          rows are the next one. */}

      {/* This list's own live region. `CommandersView` has one, but discovery
          does not render that component, so an announcement routed there would
          target a region that is not in the tree. */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </>
  );
}
