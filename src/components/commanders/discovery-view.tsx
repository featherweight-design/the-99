"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { filterByColors } from "../../lib/commanders/filter";
import {
  discoverSort,
  laneQuery,
  parseLaneParams,
  type LaneOrder,
  type LaneParams,
} from "../../lib/commanders/lane-params";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { planeCopy } from "../../lib/copy/commanders-plane";
import { colorWords, guildLabel } from "../../lib/copy/color-labels";
// Type-only, and required rather than stylistic: `src/lib/discovery/list.ts`
// reaches `src/db/index.ts`, whose module body throws when DATABASE_URL is unset
// and pulls `ws` and the neon driver in with it. A type-only clause is erased at
// compile time, so none of that reaches the client bundle.
import type { DiscoveryItem } from "../../lib/discovery/list";
// Not type-only: `decodeDiscovery` runs on the client. Safe to import as a
// value for the same reason the clause above is not — `encode.ts` imports
// nothing but types from `list.ts`, so the database module never comes with it.
import { decodeDiscovery, type EncodedDiscovery } from "../../lib/discovery/encode";
import { FilterRack } from "./rack/filter-rack";
import { PageHeader } from "./page-header";
import { CommanderRow } from "./commander-row";
import { commanderDetailHref } from "./list-nav";
import { useDiscoveryCache } from "./discovery-cache";
import { laneHref, useRerankAnnouncement } from "./list-nav";
// Imported, never redeclared: it is 25, and the reveal band only lines up with
// the shipped control if both windows step by the same number.
import {
  EndOfRanking, REVEAL_STEP, RevealControl, revealAnnouncement,
} from "./reveal-control";
import { DiscoveryEmpty, FloorEmpty, NoDecksBanner, SearchPending } from "./discovery-empty";
import { ExclusionLine } from "./exclusion-line";
import { resolveExclusionLine } from "../../lib/commanders/exclusion-line";
import { ZERO_PRIMARY, ZERO_SECONDARY, ZeroState } from "./filtered-empty";
import { GhostButton, PrimaryButton } from "../ui/button";
import { ExcludedMatchAside } from "./excluded-match";
import { FLOOR_PCT } from "../../lib/discovery/floor";
import { findExcludedMatches } from "../../app/commanders/actions";
// Type-only for the same reason `DiscoveryList` is: the module it comes from is
// imported by the server action, which reaches the database.
import type { ExcludedMatch } from "../../lib/discovery/excluded-match";
import {
  resolveExcludedReport,
  type ColourExcludedMatch,
} from "../../lib/commanders/excluded-report";

// The empty-state strings, aliased once: four call sites below name them, and
// `discoveryCopy.empty.` on each would bury the key that actually differs.
const emptyCopy = discoveryCopy.empty;

// One frozen array, so "the server has said nothing about this query" is the
// same value every render and the report memo below does not re-run for it.
const EMPTY_MATCHES: ExcludedMatch[] = [];

// `filterByColors` matches against `colorIdentity`, which is upper-case
// throughout the catalog; `lane-params` writes the URL in lower case. The lift
// happens once, here, exactly as the owned lane does it.
const upper = (colors: string[]) => colors.map((c) => c.toUpperCase());

/**
 * The lane's client-side ordering — three of its five orders, over rows the
 * client already holds. A round trip for a sort of a list in memory is the
 * request this lane's cache exists to avoid, and the payload carries every
 * figure they rank on. None of these touches `rank`, which stays the position in
 * the server's own ranking.
 *
 * The other two, `bestfit` and `new`, fall through untouched: they ARE the
 * server's ranking, and the payload already arrives in that order. That
 * fallthrough is the whole of the fix — the build before this one re-sorted
 * every payload by a separate order control, so the ranking the reader asked for
 * never reached the screen.
 *
 * `popularity` sorts on the EDHREC deck count, which is the figure the row
 * prints under that name. It is NOT the server's own order: the server ranks on
 * support or on novelty, so returning the list untouched here would have printed
 * `Popularity` over whichever of those was active and called it the deck count.
 *
 * A row with no figure sorts last in both figure orders. An undated set and an
 * uncounted commander are absences, and an absence ordered as a zero would be
 * the claim that nobody has built it.
 */
function ordered(rows: DiscoveryItem[], order: LaneOrder): DiscoveryItem[] {
  if (order === "name") {
    return [...rows].sort((a, b) => a.name.localeCompare(b.name, "en"));
  }
  if (order === "recent") {
    return [...rows].sort((a, b) => (b.releasedAt ?? "").localeCompare(a.releasedAt ?? ""));
  }
  if (order === "popularity") {
    return [...rows].sort((a, b) => (b.deckCount ?? -1) - (a.deckCount ?? -1));
  }
  return rows;
}

/**
 * The parameters with `order` corrected to the ranking the server actually
 * returned. Only `new` can be refused — `loadDiscovery` downgrades it when there
 * is no built deck to measure novelty from — and the four orders that ask for
 * the fit ranking always get it, so a mismatch has exactly one meaning and one
 * repair. Returning the same object when nothing moved is what lets the caller
 * skip a set during render.
 */
function settleOrder(p: LaneParams, sort: "fit" | "new"): LaneParams {
  return discoverSort(p.order) === sort ? p : { ...p, order: "bestfit" };
}

/**
 * Discovery's list is its own client component rather than an adaptation of
 * `CommandersView`: that one takes `CommanderListItem[]` and holds the owned
 * lane's two client-side rankings and its `ScoreDelta` state, none of which
 * discovery has. Fabricating a score or a synergy state to fit its props would
 * put invented numbers one prop away from a surface whose premise is that every
 * figure prints its denominator.
 *
 * There is no availability control here, and no way to ask for one. The lane
 * scores against the whole collection, always: the novelty floor read whichever
 * pool was selected, so the control silently removed rows from a list it only
 * claimed to reorder.
 */
export function DiscoveryView({
  encoded,
  chooseLink = false,
}: {
  encoded: EncodedDiscovery;
  /** Help me choose's link on the result line; the route passes the feature's flag. */
  chooseLink?: boolean;
}) {
  // Decoded once per payload, and memoised on it: the cache below files rankings
  // by identity, so a fresh object every render would refile the same ranking on
  // every one of them.
  const served = useMemo(() => decodeDiscovery(encoded), [encoded]);
  // Shadowing the prop, so everything below reads the ranking that is on screen
  // without caring whether it arrived from the server this navigation or came
  // back out of the cache. A ranking already seen this visit is served with no
  // request at all, which is also what makes the design table's "motion: none"
  // true for it — there is nothing to wait for.
  const { view: discovery, serve } = useDiscoveryCache(served);
  const search = useSearchParams();
  const router = useRouter();
  // #338's contract: a control whose flip is a server round-trip says so for the
  // duration. Order is the only control left that can reach the server, and only
  // for the two of its values that name a ranking — and even then it usually does
  // not: a cache hit answers in memory and this never turns true.
  const [navPending, startNav] = useTransition();

  // One parameter object for the whole rack, seeded off the URL — the lane flip
  // carries `?c=` and `?q=` across, so a reader who filtered to Golgari arrives
  // here with those pips lit rather than with params the list ignores.
  //
  // `order` is the exception: two of its five values are what the server ranks
  // on, and `loadDiscovery` downgrades `new` to the fit ranking when there is no
  // deck to measure novelty from. The ranking that actually came back wins over
  // the one the URL asked for — but only ever by replacing `new`, since the other
  // four all ask for the fit ranking and get it.
  const [params, setParams] = useState<LaneParams>(() =>
    settleOrder(parseLaneParams(search, "discover"), served.sort),
  );
  const colors = useMemo(() => upper(params.colors), [params.colors]);

  // The query the reader has stopped typing. The list narrows on every keystroke
  // — that feedback is the point, and the rows are already in memory — but the
  // URL, the window reset and the server lookup all wait for the typing to stop:
  // a request per keystroke would ask the index seven questions for one word,
  // and a history entry per keystroke would bury the page the player arrived on.
  const [settledQuery, setSettledQuery] = useState(params.q);
  useEffect(() => {
    const timer = setTimeout(() => setSettledQuery(params.q), 350);
    return () => clearTimeout(timer);
  }, [params.q]);
  // The parameters as the URL and the server see them, as opposed to the ones
  // the rack and the list are under. They differ only in `q`, and only for the
  // 350ms the debounce lasts.
  const settled = useMemo(
    () => ({ ...params, q: settledQuery }),
    [params, settledQuery],
  );

  // Mirror the rack to the URL through the History API rather than
  // `router.replace`: a replace is a navigation, and everything here except a
  // ranking flip narrows a list the client already holds. `laneQuery` writes defaults
  // as absences and copies every parameter this lane does not own off the live
  // URL, so nothing another surface left behind is dropped.
  //
  // Never while a ranking flip is in flight. Next intercepts
  // `history.replaceState` and adopts the URL into router state, keeping the tree
  // it already has; doing that to the URL the pending navigation is *heading for*
  // makes that navigation look like one that has already happened, and its
  // payload is dropped on arrival. The flip fetched the novelty ranking and then
  // rendered the fit list — the whole of the defect. The router writes the URL
  // itself when the payload lands, and this effect re-runs on the way out of
  // pending to pick up anything typed meanwhile.
  useEffect(() => {
    if (navPending) return;
    const { pathname, search: live } = window.location;
    const next = laneQuery(new URLSearchParams(live), settled, "discover");
    window.history.replaceState(null, "", `${pathname}${next}`);
  }, [settled, navPending]);

  // The ranking the server actually produced, reconciled during render rather
  // than in an effect: an effect would paint the control on the order that was
  // asked for once before correcting it to the one that came back.
  const [prevList, setPrevList] = useState(discovery);
  if (discovery !== prevList) {
    setPrevList(discovery);
    setParams((p) => settleOrder(p, discovery.sort));
  }

  const [shown, setShown] = useState(REVEAL_STEP);

  // Every control on the rack lands here. Only a change of RANKING reaches the
  // server, which is narrower than a change of order: three of the five orders
  // arrange the fit ranking, so flipping between them asks the server nothing.
  // Even a ranking flip goes to the cache first — `serve` reports a miss rather
  // than throwing, so the navigation is the fallback and the URL ends up the same
  // either way.
  const update = useCallback(
    (next: LaneParams) => {
      setParams(next);
      const sort = discoverSort(next.order);
      if (sort === discoverSort(params.order)) return;
      const asked = { ...next, q: settledQuery };
      if (serve(sort, asked)) return;
      const { pathname, search: live } = window.location;
      const href = `${pathname}${laneQuery(new URLSearchParams(live), asked, "discover")}`;
      startNav(() => router.replace(href, { scroll: false }));
    },
    [params.order, settledQuery, serve, router],
  );

  // Search narrows before colour, so the colour figures below describe the list
  // the reader is actually looking at. Name matching only, case-insensitive.
  // Nothing is trimmed off the middle: a player typing "ur-dragon" has typed
  // part of a name, and normalising punctuation here would be a second matcher
  // disagreeing with the server's.
  const searched = useMemo(() => {
    const q = params.q.trim().toLowerCase();
    if (q === "") return discovery.items;
    return discovery.items.filter((r) => r.name.toLowerCase().includes(q));
  }, [discovery.items, params.q]);

  const filtered = useMemo(
    () => ordered(filterByColors(searched, colors, params.match), params.order),
    [searched, colors, params.match, params.order],
  );

  // What `Exactly` costs against `Any`, counted over the SAME searched list on
  // both sides so the figure answers for one control alone. The defect this
  // replaced composed colour and search in a single memo, so the aside printed a
  // figure with the name search folded into it. Null when the mode is off, when
  // no pip is lit, or when the two modes agree — a "0 excluded" aside is noise.
  const excludedByExactly = useMemo(() => {
    if (params.match !== "exactly" || colors.length === 0) return null;
    const loose = filterByColors(searched, colors, "contains").length;
    const diff = loose - filterByColors(searched, colors, "exactly").length;
    return diff > 0 ? diff : null;
  }, [searched, colors, params.match]);

  const [announcement, setAnnouncement] = useState("");
  // The re-rank happens on the server, so the message names the count that came
  // back with the new ordering rather than one predicted at click time — and the
  // server's count, not the filtered one: a colour filter is a client-side
  // narrowing the re-rank never touched.
  // `items.length`, not `candidateCount`: the latter counts every candidate found
  // before the novelty sort's exclusions, and the message names what is on the
  // list — it literally says "clear the floor".
  //
  // Nothing else announces here. The rack's result line is a live region of its
  // own and already speaks every client-side narrowing; a second region saying
  // the same thing would read a chorus after each keystroke.
  const rankedCount = discovery.items.length;
  const sortMessage = useCallback(
    (s: "fit" | "new") => discoveryCopy.sort.announce(s, rankedCount),
    [rankedCount],
  );
  useRerankAnnouncement(discovery.sort, sortMessage, setAnnouncement);

  // The window goes back to the top whenever the list underneath it changes — a
  // ranking flip, which is a server round-trip returning a differently ordered
  // list under this same mounted component, and every client-side narrowing and
  // reorder. Keeping the old depth would open the list part-way down a ranking
  // the player has not seen the top of: rank 800 under one filter is a different
  // commander under the next.
  //
  // Adjusted during render rather than in an effect, which is what React
  // prescribes for state derived from a prop change — an effect would render the
  // deep window once before correcting it.
  const listKey = [
    discovery.sort,
    colors.join(""),
    params.match,
    params.order,
    settledQuery.trim(),
  ].join(":");
  const [prevListKey, setPrevListKey] = useState(listKey);
  if (listKey !== prevListKey) {
    setPrevListKey(listKey);
    setShown(REVEAL_STEP);
  }

  // The reveal's announcement and focus move, derived from the *committed*
  // window rather than written in the click handler: the row to focus does not
  // exist yet when the handler runs, and reading `shown` there would let two
  // fast clicks announce a range that was never revealed. Same shape as the
  // owned lane's, which is why both send `revealAnnouncement`.
  //
  // A layout effect, and the re-rank announcement above is a plain effect, so a
  // flip's message always lands after this one clears the region.
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

  const remaining = Math.max(0, filtered.length - shown);
  // A list too short to have ever been windowed ends on a plain spacer.
  const wasWindowed = filtered.length > REVEAL_STEP;

  // The floor state names a percentage and the nearest miss, so it renders only
  // when the floor actually excluded someone AND a nearest miss exists. An empty
  // list with `floorExcluded === 0` is a different fact — nothing had a distance
  // to measure — and this copy would name a floor that took nobody.
  //
  // The server's list, not the filtered one: the floor is a server-side
  // exclusion the colour filter played no part in, so reading `filtered.length`
  // here would blame the floor for an emptiness the pips caused.
  const showFloorEmpty =
    discovery.items.length === 0 && discovery.floorExcluded > 0 && discovery.bestPct != null;
  // The live query, not the settled one: a heading naming the previous query for
  // 350ms would quote a word the reader has already finished changing.
  const trimmedQuery = params.q.trim();
  // Named nothing, rather than filtered to nothing. Read against the server's
  // list rather than `filtered`, because a name that IS in the list and was
  // removed by a pip is a colour exclusion wearing a search miss — this state
  // would tell the reader to check a spelling that is already correct.
  const nameMatchesAny = useMemo(() => {
    if (trimmedQuery === "") return false;
    const q = trimmedQuery.toLowerCase();
    return discovery.items.some((r) => r.name.toLowerCase().includes(q));
  }, [discovery.items, trimmedQuery]);
  // The matches the SERVER removed, for the settled query only: one round trip
  // per query the reader has stopped typing, and none at all until the field
  // holds something the index can answer (the action's own floor is 2 too).
  // The answer is stamped with the question it answers, and read back only while
  // the two still agree: an answer is discarded by being out of date rather than
  // by a second setState clearing it, so no render ever pairs one query's rows
  // with another query's report.
  const [answer, setAnswer] = useState<{
    key: string;
    matches: ExcludedMatch[];
    /** False when the round trip failed. `matches: []` then means "we did not
        find out", not "there is nothing" — and the two lead to opposite
        sentences, so they cannot share a shape. */
    ok: boolean;
  } | null>(null);
  const settledTrimmed = settledQuery.trim();
  const lookupKey = `${discovery.sort}:${settledTrimmed}`;
  useEffect(() => {
    if (settledTrimmed.length < 2) return;
    let live = true;
    findExcludedMatches(settledTrimmed, { sort: discovery.sort })
      // A null answer is the action declining to classify a query that matches
      // more names than it will count. It lands in the same shape a failure
      // does, because it leaves the same thing unknown.
      .then((matches) => {
        if (live)
          setAnswer({
            key: `${discovery.sort}:${settledTrimmed}`,
            matches: matches ?? [],
            ok: matches !== null,
          });
      })
      // A lookup that fails leaves the list saying only what it can see. Filed
      // under its key all the same, so a failure settles the question rather
      // than hanging it: the states below wait for an answer, and one that never
      // arrives would hold them off the screen forever. `ok: false` is what
      // stops the settling being read as an answer.
      .catch(() => {
        if (live)
          setAnswer({ key: `${discovery.sort}:${settledTrimmed}`, matches: [], ok: false });
      });
    return () => {
      live = false;
    };
  }, [settledTrimmed, discovery.sort]);
  const serverExcluded = useMemo(
    () => (answer?.key === lookupKey ? answer.matches : EMPTY_MATCHES),
    [answer, lookupKey],
  );

  // The matches the CLIENT removed. They are in the payload, so the colour
  // answer needs no round trip. `joinOnly` is the row the pips would have kept:
  // it survives `contains` and not `exactly`, which is what makes the mode the
  // cause rather than the selection.
  const colourExcluded = useMemo<ColourExcludedMatch[]>(() => {
    if (trimmedQuery === "" || colors.length === 0) return [];
    const kept = new Set(filterByColors(searched, colors, params.match).map((r) => r.slug));
    return searched
      .filter((r) => !kept.has(r.slug))
      .map((r) => ({
        name: r.name,
        colorIdentity: r.colorIdentity,
        joinOnly:
          params.match === "exactly" &&
          filterByColors([r], colors, "contains").length === 1,
      }));
  }, [searched, trimmedQuery, colors, params.match]);

  const report = useMemo(
    () =>
      resolveExcludedReport({
        server: serverExcluded,
        colour: colourExcluded,
        colors,
        listHasRows: filtered.length > 0,
      }),
    [serverExcluded, colourExcluded, colors, filtered.length],
  );

  // Every match is excluded, and the report knows which control did it. It
  // outranks both empties below: they say what is missing, and this one says
  // why and offers the single control that would undo it.
  const showHeldEmpty = !showFloorEmpty && filtered.length === 0 && report !== null;
  // Which of the two things the surface may say about a miss depends on one
  // question: has the index been looked at for the query ON SCREEN?
  const settledForQuery = trimmedQuery === "" || settledTrimmed === trimmedQuery;
  const current = answer?.key === lookupKey ? answer : null;
  // Asked, and answered. The only footing "no commander is named that" has.
  const indexChecked = settledForQuery && current !== null && current.ok;
  // Asked and unanswerable, or never asked at all: the action declines a query
  // under two characters, and a query it never saw is one it never checked.
  // A failed round trip lands here too.
  const indexUnchecked =
    settledForQuery && (settledTrimmed.length < 2 || (current !== null && !current.ok));
  // Neither yet. The typing has not settled, or the round trip is in flight, and
  // every conclusion below is one more render away.
  const pending = trimmedQuery !== "" && !indexChecked && !indexUnchecked;
  const showSearchEmpty =
    !showFloorEmpty &&
    !showHeldEmpty &&
    indexChecked &&
    trimmedQuery !== "" &&
    filtered.length === 0 &&
    !nameMatchesAny;
  // Only when the filter is what emptied it. Without that guard this would also
  // swallow the unfiltered no-results case, whose reason is not the colours. It
  // waits on the same lookup: with a query in the field, blaming the colours is
  // one more conclusion the server has not confirmed yet. It outranks the
  // unchecked-index state below, because the colours are a cause this reader can
  // act on and the unchecked index is not — but only where they ARE the cause.
  const showFilteredEmpty =
    !showFloorEmpty &&
    !showHeldEmpty &&
    !showSearchEmpty &&
    !pending &&
    (trimmedQuery === "" || nameMatchesAny) &&
    colors.length > 0 &&
    filtered.length === 0;
  // The list is empty, the reader is owed a sentence, and the index cannot
  // supply one. It gets written about the list alone.
  const showUnknownEmpty =
    !showFloorEmpty &&
    !showHeldEmpty &&
    !showSearchEmpty &&
    !showFilteredEmpty &&
    indexUnchecked &&
    trimmedQuery !== "" &&
    filtered.length === 0;

  // The list's own receipt. Counted against the ranked list rather than the
  // query's narrowing: the line is about the filters, and the rack's result line
  // has already counted the search. Under `bestfit` the sort excludes nothing,
  // and the resolver drops both of its clauses rather than printing a zero.
  const line = useMemo(
    () =>
      resolveExclusionLine({
        colorExcluded:
          discovery.items.length -
          filterByColors(discovery.items, colors, params.match).length,
        colors,
        join: params.match,
        floorExcluded: discovery.floorExcluded,
        unmeasured: discovery.unmeasured,
        bestPct: discovery.bestPct,
        sort: discovery.sort,
      }),
    [discovery, colors, params.match],
  );

  // Where the owned lane's copy of this search lives. The `scope` cause is the
  // one exclusion this lane cannot undo from here — the commander is missing
  // because a deck is already built around it, and the list that shows those is
  // the other route — so its correction is a link rather than a control, and
  // `correct` below has no case for it.
  const ownedHref = laneHref("owned", trimmedQuery);

  // The one control that would bring the named row back, per cause. One each,
  // because the report names one cause: a correction that flipped two controls
  // would undo a filter the reader still wants.
  const correct = useCallback(() => {
    switch (report?.cause) {
      case "colors":
        return update({ ...params, colors: [], match: "contains" });
      case "join":
        return update({ ...params, match: "contains" });
      case "floor":
      case "unmeasured":
        return update({ ...params, order: "bestfit" });
      default:
        return;
    }
  }, [report?.cause, update, params]);

  // The one reason this state has under discovery that it does not have under
  // the owned lane: the commanders are missing because they are already built.
  // The predicate is the list's own, mode included: the clause claims these decks
  // would have been in THIS filtered list had they been unbuilt, so it has to be
  // answered by the same test the list was narrowed with.
  const builtClause = useMemo(() => {
    if (!showFilteredEmpty) return null;
    const matching = filterByColors(
      discovery.deckIdentities.map((colorIdentity) => ({ colorIdentity })),
      colors,
      params.match,
    ).length;
    if (matching === 0) return null;
    return emptyCopy.filteredBuiltClause(
      matching,
      discovery.deckIdentities.length,
      guildLabel(colors),
    );
  }, [showFilteredEmpty, discovery.deckIdentities, colors, params.match]);

  // Ranks come from the server, over every item this list carries, so filtering
  // never renumbers — the same invariant CommandersView holds, reached differently.
  return (
    <>
      <PageHeader lane="discover" />

      {/* The rack, shared with the owned lane; `lane` is the whole of the
          difference. Discover mounts five orders and no availability control —
          not a greyed stand-in for one. */}
      <FilterRack
        params={params}
        lane="discover"
        onChange={update}
        shown={filtered.length}
        total={discovery.items.length}
        orderPending={navPending}
        excludedByExactly={excludedByExactly}
        chooseLink={chooseLink}
      />

      {/* The inset the owned lane draws its list in, and for the same reason:
          the rows run to the page edge without it, which clipped the right of
          every desktop row. `flex-1` so a zero state can centre in what the
          rack left. */}
      <div className="flex flex-1 flex-col p-[12px_14px] sm:px-[34px] sm:pb-[34px] sm:pt-[14px]">
        {/* State 1 sits ABOVE a full list, not in place of one: with no decks
            built the fit ranking is complete and only `Something new` is off. */}
        {!discovery.hasDecks ? <NoDecksBanner /> : null}

        {showFloorEmpty ? (
          <FloorEmpty
            floorPct={FLOOR_PCT}
            candidateCount={discovery.candidateCount}
            cardsRead={discovery.cardsRead}
            bestPct={discovery.bestPct as number}
            onRankByFit={() => update({ ...params, order: "bestfit" })}
          />
        ) : showHeldEmpty && report ? (
          // The held state (§2b). The shared zero-state shell, with every part it
          // would fill from the colour filter's vocabulary replaced: the heading
          // names the commander, the body names the one control holding it, and
          // the button undoes that control rather than clearing the pips. The
          // aside keeps its figures beside the button, inert.
          <ZeroState
            heading={report.heading ?? planeCopy.search.noneHeading(trimmedQuery)}
            body={report.body}
            primary={
              report.cause === "built" ? (
                <PrimaryButton href={ownedHref} className={ZERO_PRIMARY}>
                  {report.cta}
                </PrimaryButton>
              ) : (
                <PrimaryButton onClick={correct} className={ZERO_PRIMARY}>
                  {report.cta}
                </PrimaryButton>
              )
            }
            secondary={
              report.aside ? (
                <span className="self-center font-mono text-[11.5px] text-[color:var(--fg-faint)]">
                  {report.aside}
                </span>
              ) : undefined
            }
          />
        ) : showSearchEmpty ? (
          // D5. The candidate count, not the ranked one: this state fires only
          // once the server has looked past the rows on screen and found nothing
          // either, so the figure names the whole unbuilt pool.
          <DiscoveryEmpty
            query={trimmedQuery}
            total={discovery.candidateCount}
            onClearSearch={() => update({ ...params, q: "" })}
          />
        ) : showUnknownEmpty ? (
          // The same shell saying less: no population figure, because the count of
          // what was searched is exactly what this state does not know. That also
          // costs it the other lane's link, which only means anything alongside a
          // claim about what this lane holds.
          <ZeroState
            heading={planeCopy.search.unknownHeading(trimmedQuery)}
            body={planeCopy.search.unknownBody}
            primary={
              <PrimaryButton
                onClick={() => update({ ...params, q: "" })}
                className={ZERO_PRIMARY}
              >
                {planeCopy.search.unknownCta}
              </PrimaryButton>
            }
          />
        ) : showFilteredEmpty ? (
          <ZeroState
            heading={emptyCopy.filteredHeading}
            // The ranked count: "the N you have not built" names the list the
            // filter just emptied, and under `sort="new"` the candidate count is
            // the larger pre-exclusion figure the reader never saw a row of.
            // The built clause is the one genuinely new reason this state has under
            // discovery, so the whole clause is marked rather than a phrase inside it.
            body={
              <>
                {emptyCopy.filteredBody(colorWords(colors), discovery.items.length)}
                {builtClause ? (
                  <>
                    {" "}
                    <strong className="font-semibold text-[color:var(--fg)]">
                      {builtClause}
                    </strong>
                  </>
                ) : null}
              </>
            }
            primary={
              <PrimaryButton
                onClick={() => update({ ...params, colors: [], match: "contains" })}
                className={ZERO_PRIMARY}
              >
                {emptyCopy.filteredCta}
              </PrimaryButton>
            }
            // The other lane, reached the way D5 reaches it: a route, so a link.
            secondary={
              <GhostButton href={ownedHref} className={ZERO_SECONDARY}>
                {emptyCopy.filteredScopeLink}
              </GhostButton>
            }
          />
        ) : pending && filtered.length === 0 ? (
          // Every state above needs the lookup that has not landed, and the one
          // below is a list with no rows in it.
          <SearchPending />
        ) : (
          <>
            {/* §2c: a match exists that this list cannot show. Above the rows,
                because it is about the list underneath it. */}
            {report ? (
              <div className="mb-[10px] sm:mb-[12px]">
                <ExcludedMatchAside
                  report={report}
                  onCorrect={correct}
                  href={report.cause === "built" ? ownedHref : undefined}
                />
              </div>
            ) : null}

            {/* The receipt for the list itself. At 375px the aside outranks it —
                one thing below the rack explains the list, and the aside is about
                a row the reader just typed. Desktop renders both: it has the
                width. One element with a responsive class rather than two
                subtrees, so the sentence exists once in the DOM. */}
            {line ? (
              <ExclusionLine
                text={line.text}
                figures={line.figures}
                className={`mb-[10px] sm:mb-[12px] ${report ? "hidden sm:flex" : "flex"}`}
              />
            ) : null}

            <ul className="flex flex-col gap-[10px] sm:gap-[12px] list-none p-0 m-0">
              {filtered.slice(0, shown).map((item, i) => (
                // Focusable only while the list is windowed, matching the owned
                // lane: a row that never receives the reveal's focus move has no
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
                  {/* `item.rank`, not the map index — see above. `priceOk` is a
                      LIST-level fact: one read serves every row, so a failed one
                      omits the figure on all of them rather than on some. */}
                  <CommanderRow
                    item={{
                      slug: item.slug,
                      name: item.name,
                      colorIdentity: item.colorIdentity,
                      artCropUri: item.artCropUri,
                      rank: item.rank,
                      prose: item.prose,
                      gapSlot: item.gapSlot,
                      score: item.score,
                      measurableTotal: item.measurableTotal,
                      // Fit's three parts, for the segmented bar. The owned lane
                      // already carried them on its score rows; the discover
                      // lane ships them from v6 of its payload.
                      fitPool: item.fitPool,
                      fitRoles: item.fitRoles,
                      fitSynergy: item.fitSynergy,
                      deckCount: item.deckCount,
                      price: item.price,
                      priceOk: discovery.priceOk,
                      // This lane has no availability control, so the detail
                      // link carries the default scope rather than a mode this
                      // surface cannot be in.
                      href: commanderDetailHref(item.slug, "all"),
                    }}
                  />
                </li>
              ))}

              {/* Inside the list, as the owned lane has it: the gap between the
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
      </div>

      {/* This list's own live region, for the two events the rack's result line
          cannot describe: a re-rank, and a reveal step. */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </>
  );
}
