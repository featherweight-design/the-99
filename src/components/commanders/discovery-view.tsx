"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { filterByColors } from "../../lib/commanders/filter";
import { parseColors } from "../../lib/color-param";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { colorWords, guildLabel } from "../../lib/copy/color-labels";
// Type-only, and required rather than stylistic: `src/lib/discovery/list.ts`
// reaches `src/db/index.ts`, whose module body throws when DATABASE_URL is unset
// and pulls `ws` and the neon driver in with it. A type-only clause is erased at
// compile time, so none of that reaches the client bundle.
import type { DiscoveryList } from "../../lib/discovery/list";
import { FilterBar } from "./filter-bar";
import { PageHeader } from "./page-header";
import { RecCard } from "./rec-card";
import { SortMenu } from "./sort-menu";
import {
  useAvailNav,
  useRerankAnnouncement,
  useScopeAnnouncement,
  useScopeNav,
  useSortNav,
} from "./list-nav";
// Imported, never redeclared: it is 25, and the reveal band only lines up with
// the shipped control if both windows step by the same number.
import { EndOfRanking, REVEAL_STEP, RevealControl } from "./reveal-control";
import { FloorEmpty, NoDecksBanner } from "./discovery-empty";
import { FilteredEmpty } from "./filtered-empty";
import { NOVELTY_FLOOR } from "../../lib/discovery/floor";

// The empty-state strings, aliased once: four call sites below name them, and
// `discoveryCopy.empty.` on each would bury the key that actually differs.
const emptyCopy = discoveryCopy.empty;

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
  // Seeded from the URL, because the scope flip carries `?c=` across: a player
  // who filtered to Golgari under the owned scope arrives here with those pips
  // still lit rather than with a param the list ignores.
  const search = useSearchParams();
  const [colors, setColors] = useState<string[]>(() => parseColors(search.get("c")));
  const [shown, setShown] = useState(REVEAL_STEP);
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
  useScopeAnnouncement("play", discovery.items.length, discovery.sort, setAnnouncement);
  // Both re-ranks happen on the server, so each message names the count that came
  // back with the new ordering rather than one predicted at click time — and the
  // server's count, not the filtered one: a colour filter is a client-side
  // narrowing that neither re-rank changed, so speaking its length would say the
  // re-rank moved a number it never touched.
  // `items.length`, not `candidateCount`: the latter counts every candidate found
  // before the novelty sort's exclusions, and both messages name what is on the
  // list — one of them literally says "clear the floor".
  const rankedCount = discovery.items.length;
  const sortMessage = useCallback(
    (s: "fit" | "new") => discoveryCopy.sort.announce(s, rankedCount),
    [rankedCount],
  );
  const availMessage = useCallback(
    (a: "all" | "free") => discoveryCopy.avail.announce(a, rankedCount),
    [rankedCount],
  );
  useRerankAnnouncement(discovery.sort, sortMessage, setAnnouncement);
  useRerankAnnouncement(avail, availMessage, setAnnouncement);

  const toggleColor = useCallback((c: string) => {
    setColors((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }, []);
  const clearColors = useCallback(() => setColors([]), []);

  // The window goes back to the top whenever the list underneath it changes —
  // a sort or availability flip, both of which are server round-trips that
  // return a differently ordered list under this same mounted component, and a
  // colour filter, which narrows one on the client. Keeping the old depth would
  // open the list part-way down a ranking the player has not seen the top of:
  // rank 800 under one filter is a different commander under the next.
  //
  // Adjusted during render rather than in an effect, which is what React
  // prescribes for state derived from a prop change — an effect would render
  // the deep window once before correcting it. The scope flip needs no entry
  // here at all: it unmounts this component.
  const listKey = `${discovery.sort}:${avail}:${colors.join("")}`;
  const [prevListKey, setPrevListKey] = useState(listKey);
  if (listKey !== prevListKey) {
    setPrevListKey(listKey);
    setShown(REVEAL_STEP);
  }

  // A colour filter is a client-side narrowing, so it is mirrored with
  // `replaceState` rather than routed — routing would re-run the server rank for
  // a change the server does not make. Every other param is read back off the
  // live URL rather than rebuilt, because `scope`, `sort` and `avail` belong to
  // the server and this effect must not be the thing that drops one.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (colors.length > 0) params.set("c", colors.join(""));
    else params.delete("c");
    const s = params.toString();
    // The live pathname, not a literal: this rewrites the query and must leave
    // the path exactly as it found it under a basePath or a route move.
    window.history.replaceState(null, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
  }, [colors]);

  const menu = (
    <SortMenu sort={discovery.sort} hasDecks={discovery.hasDecks} onChange={setSort} />
  );

  const remaining = Math.max(0, filtered.length - shown);

  // The floor state names a percentage and the nearest miss, so it renders only
  // when the floor actually excluded someone AND a nearest miss exists. An empty
  // list with `floorExcluded === 0` is a different fact — nothing had a distance
  // to measure — and this copy would name a floor that took nobody.
  const showFloorEmpty =
    filtered.length === 0 && discovery.floorExcluded > 0 && discovery.bestPct != null;
  // Only when the filter is what emptied it. Without that guard this would also
  // swallow the unfiltered no-results case, whose reason is not the colours.
  const showFilteredEmpty = !showFloorEmpty && colors.length > 0 && filtered.length === 0;

  // The one reason this state has under discovery that it does not have under
  // the owned scope: the commanders are missing because they are already built.
  // The predicate is the list's own — `selected ⊆ colorIdentity`, not equality —
  // because the clause claims these decks would have been in THIS filtered list
  // had they been unbuilt, and an equality test would make that false for every
  // deck whose identity is wider than the filter.
  const builtClause = useMemo(() => {
    if (!showFilteredEmpty) return null;
    const matching = filterByColors(
      discovery.deckIdentities.map((colorIdentity) => ({ colorIdentity })),
      colors,
    ).length;
    if (matching === 0) return null;
    return emptyCopy.filteredBuiltClause(
      matching,
      discovery.deckIdentities.length,
      guildLabel(colors),
    );
  }, [showFilteredEmpty, discovery.deckIdentities, colors]);

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
        // The ranked count, not `candidateCount`, for the same reason the
        // announcements use it: the subtitle and the live region speak one
        // sentence between them, and under `sort="new"` the floor's exclusions
        // move `items.length` while the candidate count stays put. It is also
        // what the bar's own "showing N of M" counts against two lines below,
        // and what the owned scope already passes here.
        candidateCount={rankedCount}
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

      {/* State 1 sits ABOVE a full list, not in place of one: with no decks
          built the fit ranking is complete and only `Something new` is off. */}
      {!discovery.hasDecks ? <NoDecksBanner cardsRead={discovery.cardsRead} /> : null}

      {showFloorEmpty ? (
        <FloorEmpty
          floorPct={Math.round(NOVELTY_FLOOR * 100)}
          candidateCount={discovery.candidateCount}
          cardsRead={discovery.cardsRead}
          bestPct={discovery.bestPct as number}
          onRankByFit={() => setSort("fit")}
        />
      ) : showFilteredEmpty ? (
        <FilteredEmpty
          colors={colors}
          total={discovery.items.length}
          onClear={clearColors}
          heading={emptyCopy.filteredHeading}
          // The ranked count: "the N you have not built" names the list the
          // filter just emptied, and under `sort="new"` the candidate count is
          // the larger pre-exclusion figure the reader never saw a row of.
          body={emptyCopy.filteredBody(colorWords(colors), discovery.items.length)}
          extraClause={builtClause ?? undefined}
          cta={emptyCopy.filteredCta}
          secondary={
            <button
              type="button"
              onClick={() => setScope("owned")}
              className="font-mono text-[11.5px] cursor-pointer bg-transparent border-0 p-0 text-[color:var(--fg-faint)] hover:text-[color:var(--accent)]"
            >
              {emptyCopy.filteredScopeLink}
            </button>
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-[10px] sm:gap-[12px] list-none p-0 m-0">
            {filtered.slice(0, shown).map((item) => (
              <li key={item.slug}>
                {/* `item.rank`, not the map index: the server ranked every item
                    this list carries, so a colour filter narrows what is shown
                    without renumbering what it leaves behind. */}
                <RecCard
                  discovery={item}
                  rank={item.rank}
                  sort={discovery.sort}
                  avail={avail}
                  counts={item.counts}
                />
              </li>
            ))}
          </ul>

          {remaining > 0 ? (
            <RevealControl
              remaining={remaining}
              onReveal={() => setShown((n) => n + REVEAL_STEP)}
              // The band names ranks in the list the reader is looking at, so it
              // counts against the filtered length rather than the server's.
              band={discoveryCopy.window.revealBand(
                shown + 1,
                Math.min(shown + REVEAL_STEP, filtered.length),
                filtered.length,
              )}
            />
          ) : filtered.length > REVEAL_STEP ? (
            <EndOfRanking total={filtered.length} />
          ) : null}
        </>
      )}

      {/* This list's own live region. `CommandersView` has one, but discovery
          does not render that component, so an announcement routed there would
          target a region that is not in the tree. */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </>
  );
}
