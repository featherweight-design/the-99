"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { filterByColors, type JoinMode } from "../../lib/commanders/filter";
import { parseColors } from "../../lib/color-param";
import { parseJoin } from "../../lib/discovery/params";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { planeCopy } from "../../lib/copy/commanders-plane";
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
import { useDiscoveryCache } from "./discovery-cache";
import {
  useAvailNav,
  useRerankAnnouncement,
  useScopeAnnouncement,
  useScopeNav,
  useSortNav,
} from "./list-nav";
// Imported, never redeclared: it is 25, and the reveal band only lines up with
// the shipped control if both windows step by the same number.
import {
  EndOfRanking, REVEAL_STEP, RevealControl, revealAnnouncement,
} from "./reveal-control";
import { FloorEmpty, NoDecksBanner } from "./discovery-empty";
import { FilteredEmpty } from "./filtered-empty";
import { FLOOR_PCT } from "../../lib/discovery/floor";

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
  discovery: served,
  avail: servedAvail,
}: {
  discovery: DiscoveryList;
  avail: "all" | "free";
}) {
  // Shadowing the two props, so everything below reads the ranking that is on
  // screen without caring whether it arrived from the server this navigation or
  // came back out of the cache. A pair already seen this visit is served with no
  // request at all, which is also what makes the design table's "motion: none"
  // true for it — there is nothing to wait for.
  const { view, serve } = useDiscoveryCache(served, servedAvail);
  const { list: discovery, avail } = view;
  // Seeded from the URL, because the scope flip carries `?c=` across: a player
  // who filtered to Golgari under the owned scope arrives here with those pips
  // still lit rather than with a param the list ignores.
  const search = useSearchParams();
  const [colors, setColors] = useState<string[]>(() => parseColors(search.get("c")));
  // Seeded the same way, and for the same reason: `?join=exact` is part of the
  // link a player shares, so the list it opens is the one they were looking at.
  const [join, setJoin] = useState<JoinMode>(() => parseJoin(search.get("join")));
  const [shown, setShown] = useState(REVEAL_STEP);
  const filtered = useMemo(
    () => filterByColors(discovery.items, colors, join),
    [discovery.items, colors, join],
  );

  const scopeNav = useScopeNav();
  const sortNav = useSortNav();
  const availNav = useAvailNav();
  const setScope = scopeNav.go;
  // The `go` functions, not the hooks' return objects: each hook builds a fresh
  // object every render to carry its `pending`, so depending on the object would
  // rebuild these callbacks on every render and the memo would buy nothing.
  const goSort = sortNav.go;
  const goAvail = availNav.go;
  // Cache first, server second. `serve` reports a miss rather than throwing, so
  // the navigation is the fallback and the URL ends up the same either way.
  const setSort = useCallback(
    (next: "fit" | "new") => {
      if (!serve(next, avail)) goSort(next);
    },
    [serve, avail, goSort],
  );
  const setAvail = useCallback(
    (next: "all" | "free") => {
      if (!serve(discovery.sort, next)) goAvail(next);
    },
    [serve, discovery.sort, goAvail],
  );
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

  // The mode narrows on the client, so its message is written here rather than
  // read back off a server round trip. It names the count the flip produced and
  // the identity it was exact about, because "Exactly" alone says nothing about
  // what left the list.
  const joinMessage = useCallback(
    (m: JoinMode) => planeCopy.join.announce(m, filtered.length, colors),
    [filtered.length, colors],
  );
  useRerankAnnouncement(join, joinMessage, setAnnouncement);

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
  const listKey = `${discovery.sort}:${avail}:${colors.join("")}:${join}`;
  const [prevListKey, setPrevListKey] = useState(listKey);
  if (listKey !== prevListKey) {
    setPrevListKey(listKey);
    setShown(REVEAL_STEP);
  }

  // The reveal's announcement and focus move, derived from the *committed*
  // window rather than written in the click handler: the row to focus does not
  // exist yet when the handler runs, and reading `shown` there would let two
  // fast clicks announce a range that was never revealed. Same shape as the
  // owned scope's, which is why both send `revealAnnouncement`.
  //
  // A layout effect, and the two re-rank announcements above are plain effects,
  // so a flip's message always lands after this one clears the region.
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const prevShown = useRef(shown);
  useLayoutEffect(() => {
    const before = prevShown.current;
    prevShown.current = shown;
    // Only a reveal widens the window; a filter or flip narrows it back to the
    // first step. Clearing rather than returning drops screen-reader text that
    // no longer describes the list, and stops React bailing out later if a
    // reveal produces the string already sitting in the region.
    if (shown <= before) {
      setAnnouncement("");
      return;
    }
    setAnnouncement(revealAnnouncement(shown, filtered.length, before));
    // preventScroll: revealing must not move the reader's place. The accent ring
    // is the cue that keyboard position advanced, not a jump down the page.
    itemRefs.current[before]?.focus({ preventScroll: true });
  }, [shown, filtered.length]);

  // A colour filter is a client-side narrowing, so it is mirrored with
  // `replaceState` rather than routed — routing would re-run the server rank for
  // a change the server does not make. Every other param is read back off the
  // live URL rather than rebuilt, because `scope`, `sort` and `avail` belong to
  // the server and this effect must not be the thing that drops one.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (colors.length > 0) params.set("c", colors.join(""));
    else params.delete("c");
    // Written only while it can do something. With no pip lit the control is not
    // rendered and the mode changes no row, so a `join` left in the URL would be
    // a filter the player cannot see, cannot clear, and did not ask for.
    if (join === "exactly" && colors.length > 0) params.set("join", "exact");
    else params.delete("join");
    const s = params.toString();
    // The live pathname, not a literal: this rewrites the query and must leave
    // the path exactly as it found it under a basePath or a route move.
    window.history.replaceState(null, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
  }, [colors, join]);

  const menu = (
    <SortMenu
      sort={discovery.sort}
      pending={sortNav.pending}
      hasDecks={discovery.hasDecks}
      onChange={setSort}
    />
  );

  const remaining = Math.max(0, filtered.length - shown);
  // A list too short to have ever been windowed ends on a plain spacer, and its
  // count line says nothing about a window that never existed.
  const wasWindowed = filtered.length > REVEAL_STEP;

  // The floor state names a percentage and the nearest miss, so it renders only
  // when the floor actually excluded someone AND a nearest miss exists. An empty
  // list with `floorExcluded === 0` is a different fact — nothing had a distance
  // to measure — and this copy would name a floor that took nobody.
  //
  // The server's list, not the filtered one: the floor is a server-side
  // exclusion the colour filter played no part in, so reading `filtered.length`
  // here would blame the floor for an emptiness the pips caused and tell a
  // player who narrowed to Azorius that none of the N candidates cleared it.
  const showFloorEmpty =
    discovery.items.length === 0 && discovery.floorExcluded > 0 && discovery.bestPct != null;
  // Only when the filter is what emptied it. Without that guard this would also
  // swallow the unfiltered no-results case, whose reason is not the colours.
  const showFilteredEmpty = !showFloorEmpty && colors.length > 0 && filtered.length === 0;

  // The one reason this state has under discovery that it does not have under
  // the owned scope: the commanders are missing because they are already built.
  // The predicate is the list's own, mode included: the clause claims these decks
  // would have been in THIS filtered list had they been unbuilt, so it has to be
  // answered by the same test the list was narrowed with. Under `exactly` a deck
  // whose identity is wider than the selection would not have appeared, and
  // counting it here would offer a reason that is not true.
  const builtClause = useMemo(() => {
    if (!showFilteredEmpty) return null;
    const matching = filterByColors(
      discovery.deckIdentities.map((colorIdentity) => ({ colorIdentity })),
      colors,
      join,
    ).length;
    if (matching === 0) return null;
    return emptyCopy.filteredBuiltClause(
      matching,
      discovery.deckIdentities.length,
      guildLabel(colors),
    );
  }, [showFilteredEmpty, discovery.deckIdentities, colors, join]);

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
        scopePending={scopeNav.pending}
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
        availPending={availNav.pending}
        onAvailChange={setAvail}
        availOk={discovery.availOk}
        wasWindowed={wasWindowed}
        shown={shown}
        filteredTotal={filtered.length}
        activeTotal={discovery.items.length}
        // The same menu in both slots, not two variants: the bar's own subtree
        // split decides which one is displayed, and the menu carries its own
        // breakpoint for the two pixels that differ between them.
        order={{ desktop: menu, mobile: menu }}
        join={join}
        onJoinChange={setJoin}
      />

      {/* State 1 sits ABOVE a full list, not in place of one: with no decks
          built the fit ranking is complete and only `Something new` is off. */}
      {!discovery.hasDecks ? <NoDecksBanner /> : null}

      {showFloorEmpty ? (
        <FloorEmpty
          floorPct={FLOOR_PCT}
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
          // Accent, not the canvas's `--fg-faint`: M-10 resolves the link that
          // way, because the drawing gives it exactly the appearance of the
          // inert aside beside the floor empty's CTA, and the one thing the
          // design says about it is that it is a link.
          secondary={
            <button
              type="button"
              onClick={() => setScope("owned")}
              className="font-mono text-[11.5px] cursor-pointer bg-transparent border-0 p-0 text-[color:var(--accent)] hover:underline"
            >
              {emptyCopy.filteredScopeLink}
            </button>
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-[10px] sm:gap-[12px] list-none p-0 m-0">
            {filtered.slice(0, shown).map((item, i) => (
              // Focusable only while the list is windowed, matching the owned
              // scope: a row that never receives the reveal's focus move has no
              // reason to be a tab stop between every card.
              <li
                key={item.slug}
                tabIndex={wasWindowed ? -1 : undefined}
                ref={
                  wasWindowed
                    ? (el) => {
                        itemRefs.current[i] = el;
                      }
                    : undefined
                }
                className={
                  wasWindowed
                    ? "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
                    : undefined
                }
              >
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

            {/* Inside the list, as the owned scope has it: the gap between the
                control and the last card is the list's own row gap, and outside
                the `<ul>` there is nothing to supply it. */}
            {remaining > 0 ? (
              <li>
                <RevealControl
                  remaining={remaining}
                  // Clamped at the source, the way the owned list clamps it: a final
                  // step that overshoots would otherwise have the live region announce
                  // a negative "more below" and a range past the end of the list.
                  onReveal={() => setShown((n) => Math.min(n + REVEAL_STEP, filtered.length))}
                  // The band names ranks in the list the reader is looking at, so it
                  // counts against the filtered length rather than the server's.
                  band={discoveryCopy.window.revealBand(
                    shown + 1,
                    Math.min(shown + REVEAL_STEP, filtered.length),
                    filtered.length,
                  )}
                />
              </li>
            ) : null}
          </ul>

          {/* Mobile: clear the bottom tab bar so the control isn't half-covered. */}
          {remaining > 0 ? (
            <div className="h-[24px] sm:hidden" />
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
