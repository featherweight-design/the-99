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
import type { DiscoveryItem, DiscoveryList } from "../../lib/discovery/list";
import { FilterRack } from "./rack/filter-rack";
import { PageHeader } from "./page-header";
import { RecCard } from "./rec-card";
import { useDiscoveryCache } from "./discovery-cache";
import { useRerankAnnouncement, useScopeAnnouncement, useScopeNav } from "./list-nav";
// Imported, never redeclared: it is 25, and the reveal band only lines up with
// the shipped control if both windows step by the same number.
import {
  EndOfRanking, REVEAL_STEP, RevealControl, revealAnnouncement,
} from "./reveal-control";
import { FloorEmpty, NoDecksBanner } from "./discovery-empty";
import { ExclusionLine } from "./exclusion-line";
import { resolveExclusionLine } from "../../lib/commanders/exclusion-line";
import { FilteredEmpty } from "./filtered-empty";
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
 * The lane's client-side ordering. `popularity` is the server's own order and is
 * returned untouched, which is what keeps the rank numerals meaningful: they are
 * built over the unfiltered list in the server's order and never renumber.
 *
 * `recent` sorts on `releasedAt` descending with undated sets last. It is a
 * client-side reorder rather than a fourth server ranking because the payload
 * already carries the date, and a round trip for a sort over rows in memory is
 * the request this lane's cache exists to avoid.
 */
function ordered(rows: DiscoveryItem[], order: LaneOrder): DiscoveryItem[] {
  if (order === "name") {
    return [...rows].sort((a, b) => a.name.localeCompare(b.name, "en"));
  }
  if (order === "recent") {
    return [...rows].sort((a, b) => (b.releasedAt ?? "").localeCompare(a.releasedAt ?? ""));
  }
  return rows;
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
export function DiscoveryView({ discovery: served }: { discovery: DiscoveryList }) {
  // Shadowing the prop, so everything below reads the ranking that is on screen
  // without caring whether it arrived from the server this navigation or came
  // back out of the cache. A scope already seen this visit is served with no
  // request at all, which is also what makes the design table's "motion: none"
  // true for it — there is nothing to wait for.
  const { view: discovery, serve } = useDiscoveryCache(served);
  const search = useSearchParams();
  const router = useRouter();
  const [, startNav] = useTransition();

  // One parameter object for the whole rack, seeded off the URL — the lane flip
  // carries `?c=` and `?q=` across, so a reader who filtered to Golgari arrives
  // here with those pips lit rather than with params the list ignores.
  //
  // `scope` is the exception: it is the one control the server ranks on, and
  // `loadDiscovery` downgrades `new` to `bestfit` when there is no deck to
  // measure novelty from. The ranking that actually came back wins over the one
  // the URL asked for.
  const [params, setParams] = useState<LaneParams>(() => ({
    ...parseLaneParams(search, "discover"),
    scope: served.sort === "new" ? "new" : "bestfit",
  }));
  const colors = useMemo(() => upper(params.colors), [params.colors]);

  // The query the reader has stopped typing. The field updates on every
  // keystroke — that feedback is the point — but the list, the URL, the window
  // reset and the server lookup all wait for the typing to stop: a request per
  // keystroke would ask the index seven questions for one word, and a history
  // entry per keystroke would bury the page the player arrived on.
  const [settledQuery, setSettledQuery] = useState(params.q);
  useEffect(() => {
    const timer = setTimeout(() => setSettledQuery(params.q), 350);
    return () => clearTimeout(timer);
  }, [params.q]);
  // The parameters the LIST is under, as opposed to the ones the rack is
  // showing. They differ only in `q`, and only for the 350ms the debounce lasts.
  const settled = useMemo(
    () => ({ ...params, q: settledQuery }),
    [params, settledQuery],
  );

  // Mirror the rack to the URL through the History API rather than
  // `router.replace`: a replace is a navigation, and every control here except
  // scope narrows a list the client already holds. `laneQuery` writes defaults
  // as absences and copies every parameter this lane does not own off the live
  // URL, so nothing another surface left behind is dropped.
  useEffect(() => {
    const { pathname, search: live } = window.location;
    const next = laneQuery(new URLSearchParams(live), settled, "discover");
    window.history.replaceState(null, "", `${pathname}${next}`);
  }, [settled]);

  // The scope the server actually ranked on, reconciled during render rather
  // than in an effect: an effect would paint the control on the scope that was
  // asked for once before correcting it to the one that came back.
  const [prevList, setPrevList] = useState(discovery);
  if (discovery !== prevList) {
    setPrevList(discovery);
    const scope = discovery.sort === "new" ? "new" : "bestfit";
    if (scope !== params.scope) setParams((p) => ({ ...p, scope }));
  }

  const [shown, setShown] = useState(REVEAL_STEP);

  // Every control on the rack lands here. Only `scope` reaches the server, and
  // even that goes to the cache first: `serve` reports a miss rather than
  // throwing, so the navigation is the fallback and the URL ends up the same
  // either way.
  const update = useCallback(
    (next: LaneParams) => {
      setParams(next);
      if (next.scope === params.scope) return;
      const asked = { ...next, q: settledQuery };
      if (serve(next.scope === "new" ? "new" : "fit", asked)) return;
      const { pathname, search: live } = window.location;
      const href = `${pathname}${laneQuery(new URLSearchParams(live), asked, "discover")}`;
      startNav(() => router.replace(href, { scroll: false }));
    },
    [params.scope, settledQuery, serve, router],
  );

  // Search narrows before colour, so the colour figures below describe the list
  // the reader is actually looking at. Name matching only, case-insensitive.
  // Nothing is trimmed off the middle: a player typing "ur-dragon" has typed
  // part of a name, and normalising punctuation here would be a second matcher
  // disagreeing with the server's.
  const searched = useMemo(() => {
    const q = settledQuery.trim().toLowerCase();
    if (q === "") return discovery.items;
    return discovery.items.filter((r) => r.name.toLowerCase().includes(q));
  }, [discovery.items, settledQuery]);

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

  // Empty on an ordinary load, and the flip's message on arrival from the other
  // lane — the count it names is the one the server just produced.
  const [announcement, setAnnouncement] = useState("");
  useScopeAnnouncement("play", discovery.items.length, discovery.sort, setAnnouncement);
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

  const scopeNav = useScopeNav();

  // The window goes back to the top whenever the list underneath it changes — a
  // scope flip, which is a server round-trip returning a differently ordered
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
    if (settledTrimmed === "" || colors.length === 0) return [];
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
  }, [searched, settledTrimmed, colors, params.match]);

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

  // The one control that would bring the named row back, per cause. One each,
  // because the report names one cause: a correction that flipped two controls
  // would undo a filter the reader still wants.
  const correct = useCallback(() => {
    switch (report?.cause) {
      case "scope":
        return scopeNav.go("owned");
      case "colors":
        return update({ ...params, colors: [], match: "contains" });
      case "join":
        return update({ ...params, match: "contains" });
      case "floor":
      case "unmeasured":
        return update({ ...params, scope: "bestfit" });
      default:
        return;
    }
  }, [report?.cause, scopeNav, update, params]);

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
      <PageHeader
        uniqueCardsRead={discovery.cardsRead}
        scope="play"
        onScopeChange={scopeNav.go}
        sort={discovery.sort}
        scopePending={scopeNav.pending}
        // The ranked count, not `candidateCount`, for the same reason the
        // announcements use it: the subtitle and the live region speak one
        // sentence between them, and under `sort="new"` the floor's exclusions
        // move `items.length` while the candidate count stays put.
        candidateCount={rankedCount}
      />

      {/* The rack, shared with the owned lane; `lane` is the whole of the
          difference. Discover mounts a scope control and no availability
          control — not a greyed stand-in for one. */}
      <FilterRack
        params={params}
        lane="discover"
        onChange={update}
        shown={filtered.length}
        total={discovery.items.length}
        excludedByExactly={excludedByExactly}
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
          onRankByFit={() => update({ ...params, scope: "bestfit" })}
        />
      ) : showHeldEmpty && report ? (
        // The held state (§2b). The empty's geometry, with every part it fills
        // from the colour filter's vocabulary replaced: the heading names the
        // commander, the body names the one control holding it, the count line
        // goes (its figures are the aside beside the button), and the button
        // undoes that control rather than clearing the pips.
        <FilteredEmpty
          colors={[]}
          total={discovery.items.length}
          onClear={correct}
          heading={report.heading ?? planeCopy.search.noneHeading(trimmedQuery)}
          body={report.body}
          diagnostic={null}
          cta={report.cta}
          secondary={
            report.aside ? (
              <span className="font-mono text-[11.5px] text-[color:var(--fg-faint)]">
                {report.aside}
              </span>
            ) : undefined
          }
        />
      ) : showSearchEmpty ? (
        // The same shape as the colour miss, with three of its parts replaced:
        // no pip row (no filter to show), a diagnostic in the search's own
        // vocabulary rather than the colour filter's, and a button that clears
        // what the reader actually set.
        // The candidate count, not the ranked one, and all three figures take it:
        // this state fires only once the server has looked past the rows on
        // screen and found nothing either, so "the N you have not built" is the
        // whole unbuilt pool.
        <FilteredEmpty
          colors={[]}
          total={discovery.candidateCount}
          onClear={() => update({ ...params, q: "" })}
          heading={planeCopy.search.noneHeading(trimmedQuery)}
          body={planeCopy.search.noneBody(discovery.candidateCount)}
          emphasis={planeCopy.search.noneEmphasis(discovery.candidateCount)}
          diagnostic={planeCopy.search.announce(0, discovery.candidateCount)}
          cta={planeCopy.search.noneCta}
        />
      ) : showUnknownEmpty ? (
        // The same shape again, saying less: no population figure and no
        // diagnostic, because the count of what was searched is exactly what
        // this state does not know.
        <FilteredEmpty
          colors={[]}
          total={discovery.items.length}
          onClear={() => update({ ...params, q: "" })}
          heading={planeCopy.search.unknownHeading(trimmedQuery)}
          body={planeCopy.search.unknownBody}
          diagnostic={null}
          cta={planeCopy.search.unknownCta}
        />
      ) : showFilteredEmpty ? (
        <FilteredEmpty
          colors={colors}
          total={discovery.items.length}
          onClear={() => update({ ...params, colors: [], match: "contains" })}
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
              onClick={() => scopeNav.go("owned")}
              className="font-mono text-[11.5px] cursor-pointer bg-transparent border-0 p-0 text-[color:var(--accent)] hover:underline"
            >
              {emptyCopy.filteredScopeLink}
            </button>
          }
        />
      ) : (
        <>
          {/* §2c: a match exists that this list cannot show. Above the rows,
              because it is about the list underneath it. */}
          {report ? (
            <div className="mb-[10px] sm:mb-[12px]">
              <ExcludedMatchAside report={report} onCorrect={correct} />
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
                <RecCard
                  discovery={item}
                  rank={item.rank}
                  sort={discovery.sort}
                  counts={item.counts}
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

      {/* This list's own live region, for the two events the rack's result line
          cannot describe: a re-rank, and a reveal step. */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </>
  );
}
