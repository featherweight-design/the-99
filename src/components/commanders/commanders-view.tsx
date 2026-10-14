"use client";

import {
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "../../lib/commanders/live-query";
import { commanderDisplayName } from "../../lib/cards/printed-name";
import type { CommanderRowItem } from "../../lib/commanders/rankings";
import { fromFreeDelta, type FreeRankingDelta } from "../../lib/recs/free-delta";
import { filterByColors } from "../../lib/commanders/filter";
import {
  defaultParams,
  laneQuery,
  parseLaneParams,
  type Avail,
  type LaneOrder,
  type LaneParams,
} from "../../lib/commanders/lane-params";
import { rankMap } from "../../lib/commanders/rank-maps";
import { nearestFix } from "../../lib/commanders/nearest-fix";
import { laneOracleIds, printedInOptions } from "../../lib/commanders/printed-in-lane";
import { filePrintedIn, isPrintedIn, type LanePrintedIn } from "../../lib/sets/printed-in";
import { printedInLabel } from "./rack/chip-line";
import { filterCopy } from "../../lib/copy/lanes";
import { availabilityCopy } from "../../lib/copy/availability";
import { rememberCommandersAvail } from "../../app/commanders/actions";
import { CommanderRow } from "./commander-row";
import { commanderDetailHref } from "./list-nav";
import { FilterRack } from "./rack/filter-rack";
import { GuidedBanner } from "./guided-banner";
import { PageHeader } from "./page-header";
import { DegradedBanner } from "./degraded-banner";
import { FilteredEmpty, FreeEmpty, OwnedSearchEmpty } from "./filtered-empty";
import {
  REVEAL_STEP, RevealControl, EndOfRanking, revealAnnouncement,
} from "./reveal-control";
import { mirrorUrl } from "../../lib/url/mirror";
import { ArrivalOrder } from "@/components/ui/arrival-queue";

export type AvailMode = "all" | "free";

// A commander whose whole pool is free. Shared rather than allocated per row,
// and the fallback for the degraded read, where the page has no counts at all:
// zero claims renders the receipt's first clause alone, which stays true.

// `filterByColors` matches against `colorIdentity`, which is upper-case
// throughout the catalog; `lane-params` writes the URL in lower case. The lift
// happens once, here, rather than inside the predicate — the collection browser
// passes it upper-case already.
const upper = (colors: string[]) => colors.map((c) => c.toUpperCase());

/** One empty selection, so a memo reading it holds still across renders. */
const NO_SETS: string[] = [];

/** The reader's word for one pip. The catalog's hues are upper-case and the copy
    module keys on the URL's lower-case form, so the lift happens here. */
const colourName = (hue: string) =>
  filterCopy.colour.names[hue.toLowerCase() as keyof typeof filterCopy.colour.names];

/**
 * The lane's client-side ordering. `fit` is the server's order and is returned
 * untouched, which is also what keeps the rank numerals meaningful: they are
 * built over the unfiltered list in fit order and never renumber.
 */
function ordered<T extends { name: string; printedName?: string | null }>(
  rows: T[],
  order: LaneOrder,
): T[] {
  if (order !== "name") return rows;
  // By the name DRAWN. An A-Z list is alphabetical in the names on screen or it is not
  // alphabetical at all — a copy printed `Freya, Queen of the Valkyries` filed under I
  // for Iroas reads as one card in the wrong place.
  return [...rows].sort((a, b) =>
    commanderDisplayName(a).localeCompare(commanderDisplayName(b), "en"),
  );
}

/**
 * EITHER name matches. The row draws the printed one, so a reader typing what they can
 * see has to find it; the oracle name is what a player who knows the card types, and it
 * is the only name the discover lane has. Dropping either would make a row unreachable
 * by a name it is legitimately known by.
 */
function matchesQuery(row: { name: string; printedName?: string | null }, q: string): boolean {
  return row.name.toLowerCase().includes(q)
    || (row.printedName ?? "").toLowerCase().includes(q);
}


// ── Component ─────────────────────────────────────────────────────────────────

export type CommandersViewProps = {
  results: CommanderRowItem[];
  degraded: boolean;
  uniqueCardsRead: number;
  candidateCount: number;
  firstRun: boolean;
  /** The same commanders re-scored against the free pool, as a diff against
      `results` — the two lists share most of their bytes. Null when unreadable. */
  freeRanking: FreeRankingDelta | null;
  /** False when no free ranking could be produced — the availability read
      failed, or the ranking itself came back unusable. Either way `What's free`
      is unavailable, and `freeRanking` is null alongside it. */
  availOk: boolean;
  /** `Printed in ▾`'s index, aligned to `laneOracleIds(results)`. Absent when the read failed,
      and then the control is not drawn and a `?p=` is not applied. */
  printedIn?: LanePrintedIn;
  /** The mode the reader last chose, saved per account: what the page opens in when the URL
      names none, and what the URL is written against, so `a=` appears only where the mode
      on screen differs from it. `all` for an account that has never chosen. */
  savedAvail?: Avail;
};

export function CommandersView({
  results,
  degraded,
  uniqueCardsRead,
  candidateCount,
  firstRun,
  freeRanking,
  availOk,
  printedIn,
  savedAvail = "all",
}: CommandersViewProps) {
  const search = useSearchParams();

  // The mode a bare URL is READ against. The server's `savedAvail` is the account's choice as of
  // this payload; a flip here saves a newer one, and a same-route navigation to a URL with no
  // `a=` has to honour it before any fresh payload says so. Reset whenever the server sends a
  // different value, adjusted during render so no frame reads the stale one. URL WRITES stay
  // against `savedAvail`, so a flip still leaves `a=` on the address: a back navigation that
  // remounts this view from a cached payload reads that `a=` and opens in the chosen mode.
  const [savedChoice, setSavedChoice] = useState<Avail>(savedAvail);
  const [savedFromServer, setSavedFromServer] = useState<Avail>(savedAvail);
  if (savedFromServer !== savedAvail) {
    setSavedFromServer(savedAvail);
    setSavedChoice(savedAvail);
  }

  // Rebuilt once per payload, not per flip: everything below reads the free
  // ranking as the plain list it was before the diff, and the toggle stays the
  // state change the design requires it to be.
  const freeItems = useMemo(
    () => (freeRanking ? fromFreeDelta(results, freeRanking) : null),
    [results, freeRanking],
  );

  // One parameter object for the whole rack, seeded off the URL. `avail` is the
  // exception, and the rule has two halves: the URL is the reader's request, the
  // prop is the server's statement of what it could prepare, and a request is
  // honoured only where the payload can serve it — `availOk` false, or a null
  // `freeRanking`, means there is no second ranking to switch to.
  //
  // The prop cannot be the only input. Flipping to `Free cards only` mirrors
  // itself into the URL through `history.replaceState`, which Next adopts into
  // router state without re-rendering the tree — so the cached tree behind that
  // URL is still the one the server sent for the default lane. Coming back to
  // this page from a commander restores exactly that tree, and a seed that took
  // the prop alone put the reader back on `All my cards` while the URL beside it
  // still read `a=free`.
  // What the URL asks for, gated on what this payload can actually serve.
  // `?a=free` is a request, not a promise: with no free ranking there is nothing
  // to switch to, and the seed refuses it exactly as the flip does.
  const fromUrl = useCallback(
    (query: URLSearchParams): LaneParams => {
      const parsed = parseLaneParams(query, "owned", savedChoice);
      return {
        ...parsed,
        avail: parsed.avail === "free" && availOk && freeRanking !== null ? "free" : "all",
      };
    },
    [availOk, freeRanking, savedChoice],
  );

  // The reader's edit, and the ONE query it is valid for.
  //
  // NOT a copy of the URL kept in sync with it. The rack's state IS the URL,
  // derived every render; an edit is an overlay that lives exactly as long as
  // the query it wrote. The write happens in the same tick as the edit — see
  // `setParams` — so by the time anything renders, the live query already is
  // that one, and there is no window in which the overlay has to be trusted
  // against some earlier query.
  //
  // That matters because the earlier query is not distinguishable from a
  // navigation back to it. Standing on `/commanders`, flipping to
  // `Free cards only` and then tapping `Commanders` in the nav returns the URL
  // to exactly the query the flip was made against — so an overlay that also
  // honoured its starting query would keep the free lane under a URL with no
  // mode on it, which is the bug it was meant to prevent, wearing the other
  // face.
  //
  // Any query other than the one the edit wrote means the URL moved for a reason
  // that is not the rack, and the overlay is dropped so the lane follows the URL.
  //
  // That case is reachable BECAUSE of `useLiveQuery`. A navigation landing back
  // on `/commanders` — the primary nav while the reader stands in
  // `Free cards only` — gives this route no new instance and no prop change, and
  // `useSearchParams` stays silent through it. Before the subscription, nothing
  // here ran: the lane sat in free under a URL with no mode, and the first
  // control touched afterwards built its next state from those stale params and
  // wrote `a=free` back into the URL the navigation had just reset. Cosmetic
  // until it was not.
  //
  // A key on the server was tried first and cannot reach it: the key is fixed
  // when the tree is first rendered, and that same tree is what the navigation
  // restores.
  const [edit, setEdit] = useState<{ query: string; params: LaneParams } | null>(null);

  // The live query, subscribed rather than read off a hook.
  //
  // `useSearchParams` is not enough on its own: a navigation landing back on the
  // route this component already occupies keeps it mounted with identical props,
  // and that hook does not fire for it. `useLiveQuery` subscribes to the two
  // events that actually move the URL, so such a navigation re-renders here and
  // the lane follows it. Its own header carries why that patch is safe.
  //
  // It is also what an edit compares against: the edit writes the URL in the same
  // tick, and this store reports that write on the same tick too, so the overlay
  // below never has to be valid for more than the one query it produced.
  const liveQuery = useLiveQuery(search.toString());

  // Memoised on the query it was parsed from, because this object is the URL
  // mirror's dependency: a fresh one per render would re-fire that effect on
  // every unrelated update, revealing a batch of rows or moving the live
  // announcement included.
  const urlParams = useMemo(() => fromUrl(new URLSearchParams(liveQuery)), [fromUrl, liveQuery]);
  const asked = edit && edit.query === liveQuery ? edit.params : urlParams;

  // The free mode, and whether this payload can still serve it — DERIVED, not
  // stored. A revalidation can take the ranking away under a reader already
  // standing in it: an availability rollup that fails on the next read arrives as
  // `availOk: false` with a null `freeRanking`, and without this the list would
  // quietly fall back to the canonical one while the segment, the receipts, the
  // detail links and the URL all went on saying `free`.
  //
  // Derived rather than written back, because writing it back is a second source
  // of truth that outlives its own reason: an overlay recording `all` against the
  // query `a=free` would go on imposing `all` if the reader returned to that same
  // query once the ranking was available again — refusing a request the payload
  // could by then serve. As a derivation it is simply recomputed, every render,
  // from the two things that decide it.
  //
  // The URL climbs down with it: the mirror effect runs off `params`, so the
  // address bar loses `a=free` on the same commit the control does.
  const canRankFree = availOk && freeItems !== null;
  // Memoised, because this object is the URL mirror's dependency: a fresh one per
  // render would re-fire that effect on every unrelated update. The climb-down
  // branch returns `asked` itself where nothing needs correcting, so the identity
  // only moves when the answer does.
  const params = useMemo<LaneParams>(
    () => (asked.avail === "free" && !canRankFree ? { ...asked, avail: "all" } : asked),
    [asked, canRankFree],
  );

  // The query `p` serialises to against the URL as it stands right now, in
  // `useSearchParams`' spelling — no leading `?`, its key order — so every
  // comparison here is between two like things.
  const queryFor = useCallback((live: URLSearchParams, p: LaneParams, base: Avail = savedAvail) => {
    const written = laneQuery(live, p, "owned", base);
    return {
      written,
      query: new URLSearchParams(written.replace(/^\?/, "")).toString(),
    };
  }, [savedAvail]);

  // The event path, and the ONLY path that writes the URL itself.
  //
  // The write sits in this callback's body, never inside the state updater: an
  // updater must be pure, because React may replay or abandon it, and a replayed
  // `replaceState` would move the URL for a render that never committed. Writing
  // here is what lets the overlay name exactly one query — the one it wrote —
  // since by the time anything renders, that is already the live one.
  const setParams = useCallback(
    (next: LaneParams | ((prev: LaneParams) => LaneParams)) => {
      const live = new URLSearchParams(window.location.search);
      const base = edit && edit.query === live.toString() ? edit.params : fromUrl(live);
      const resolved = typeof next === "function" ? next(base) : next;
      const { written, query } = queryFor(live, resolved);
      mirrorUrl(`${window.location.pathname}${written}`);
      setEdit({ query, params: resolved });
    },
    [edit, fromUrl, queryFor],
  );

  const { colors: rawColors, avail } = params;
  const colors = useMemo(() => upper(rawColors), [rawColors]);

  // Mirror the rack to the URL through the History API rather than
  // `router.replace`: a replace is a navigation, and this page's whole point is
  // that no control needs one — the server sends both rankings in the same
  // render. The URL stays shareable and `useSearchParams` still sees it.
  useEffect(() => {
    // The live pathname and the live query, not literals: this rewrites only
    // the keys the lane owns, leaving the path and every foreign parameter
    // exactly as it found them.
    const { pathname, search: live } = window.location;
    // The mirror never re-decides `a=`: an address that names a mode keeps naming it, and a bare
    // one stays bare. Re-serializing against `savedAvail` did both wrong once the reader had
    // flipped in this visit (the baseline had moved on, the prop had not): a bare navigation
    // gained `a=free`, and an explicit `a=all` was stripped and then read as the new choice. The
    // one change it makes is a CLIMB-DOWN, where the mode on screen is not the one asked for:
    // there `a=` goes, because naming the mode that could not be served would pin the address to
    // it after the free ranking recovers.
    const liveParams = new URLSearchParams(live);
    const raw = liveParams.get("a") ?? liveParams.get("avail");
    const explicit: Avail | null = raw === "all" || raw === "free" ? raw : null;
    const keep = explicit !== null && explicit === params.avail;
    // Serialized against the other mode, `a=` is written; against the mode itself, it is not.
    const base: Avail = keep ? (params.avail === "all" ? "free" : "all") : params.avail;
    const { written, query } = queryFor(liveParams, params, base);
    // Idempotent: an edit has already written its own URL, so this finds the bar
    // already correct and leaves it alone. What it is here for is the render-time
    // climb-down below, which changes `params` without an event to write from.
    if (query === new URLSearchParams(live).toString()) return;
    mirrorUrl(`${pathname}${written}`);
  }, [params, queryFor]);

  // Which list is on screen. Falling back to `results` when the free ranking is
  // missing keeps the page rendering something true rather than nothing — belt
  // and braces next to the reconciliation above, and reachable only on the
  // render that hands the mode back.
  const active = avail === "free" && freeItems ? freeItems : results;

  // Search narrows before colour, so the colour counts below describe the list
  // the reader is actually looking at. Name matching only, case-insensitive,
  // and nothing trimmed off the middle — the same matcher discovery uses.
  const searched = useMemo(() => {
    const q = params.q.trim().toLowerCase();
    return q === "" ? active : active.filter((r) => matchesQuery(r, q));
  }, [active, params.q]);

  // `Printed in` (decision 9): each row's sets, filed once per payload. With no index the
  // selection is not applied, since there is nothing to apply it against.
  const codesByOracle = useMemo(
    () => (printedIn ? filePrintedIn(new Map(), laneOracleIds(results), printedIn) : null),
    [printedIn, results],
  );
  const setCodes = codesByOracle ? params.printedIn : NO_SETS;
  // With no index the selection filters nothing, so the rack must not draw its chip or count it on
  // the badge either: a chip over an unfiltered list says the list was narrowed when it was not.
  const rackParams = useMemo(
    () => (codesByOracle || params.printedIn.length === 0 ? params : { ...params, printedIn: NO_SETS }),
    [codesByOracle, params],
  );
  const inSets = useCallback(
    <T extends { oracleId: string }>(rows: T[]): T[] =>
      setCodes.length === 0 || !codesByOracle
        ? rows
        : rows.filter((r) => isPrintedIn(codesByOracle, r.oracleId, setCodes)),
    [codesByOracle, setCodes],
  );
  // Search, then sets, then colour: every figure below counts over the list the other
  // controls left, which is what makes each one answer for a single control.
  const narrowed = useMemo(() => inSets(searched), [inSets, searched]);

  const filtered = useMemo(
    () => ordered(filterByColors(narrowed, colors, params.match), params.order),
    [narrowed, colors, params.match, params.order],
  );

  // The panel's rows: this lane's sets, each counting the rows the OTHER controls leave. Search
  // is not one of them, as on /collection's Set: the counts hold still while the reader types.
  const setOptions = useMemo(
    () =>
      printedIn && codesByOracle
        ? printedInOptions(
            printedIn.sets,
            codesByOracle,
            laneOracleIds(results),
            filterByColors(active, colors, params.match).map((r) => r.oracleId),
            setCodes,
          )
        : undefined,
    [printedIn, codesByOracle, results, active, colors, params.match, setCodes],
  );

  // What `Exactly` costs against `Any`, counted over the same searched list so
  // the figure answers for one control alone. Null when the mode is off, when
  // no pip is lit, or when the two modes agree — a "0 excluded" aside is noise.
  const excludedByExactly = useMemo(() => {
    if (params.match !== "exactly" || colors.length === 0) return null;
    const loose = filterByColors(narrowed, colors, "contains").length;
    const diff = loose - filterByColors(narrowed, colors, "exactly").length;
    return diff > 0 ? diff : null;
  }, [narrowed, colors, params.match]);

  // What `Build from` cost, and it answers for that one control — the same shape
  // as `excludedByExactly` above. Null outside free mode and null where it hid
  // nothing, because a "0 sleeved" aside is noise.
  //
  // Counted over the rows the OTHER controls left, never over the two whole
  // lists. The figure sits in a sentence that has just stated a count, so it has
  // to explain THAT count: with a query lit, subtracting the raw lengths claims
  // rows the search had already excluded, and a query matching nothing at all
  // would still print an aside. So the canonical list is run through the same
  // search and the same colour filter, and what free mode removed is the
  // difference between that and what is on screen. Ordering is not applied —
  // it cannot change a length.
  const sleevedByFree = useMemo(() => {
    if (avail !== "free" || !freeItems) return null;
    const q = params.q.trim().toLowerCase();
    const searchedAll = inSets(q === "" ? results : results.filter((r) => matchesQuery(r, q)));
    const hidden = filterByColors(searchedAll, colors, params.match).length - filtered.length;
    return hidden > 0 ? hidden : null;
  }, [avail, freeItems, results, params.q, inSets, colors, params.match, filtered.length]);

  // Two rank maps, each built once over the FULL candidate set in that mode's
  // ordering. Both are pre-filter, so filtering still never renumbers: a hidden
  // rank leaves a gap rather than closing it. The numeral does move when the
  // toggle moves, and that is the point — the score itself changed.
  const rankAll = useMemo(() => rankMap(results), [results]);
  const rankFreeBySlug = useMemo(
    () => (freeItems ? rankMap(freeItems) : null),
    [freeItems],
  );
  const rankBySlug =
    avail === "free" && rankFreeBySlug ? rankFreeBySlug : rankAll;

  // THE FREE-MODE SCORE DELTA IS GONE, and by ruling rather than by oversight.
  // §9.2 drew a "was 74, now 58" note when a commander's score fell under `Free
  // cards only`, which is a figure read off AVAILABILITY — and D1 says nothing
  // on the row may be read off ownership, because one component serves a lane of
  // owned commanders and a lane of unowned ones. The handoff's cut list does not
  // name it; the ruling that cut `not in your collection` takes it too.
  //
  // `allByOracleId` went with it. An earlier version of this comment claimed it
  // survived because the free ranking needed the canonical scores; it does not —
  // `fromFreeDelta` indexes into `results` directly, and lint is what caught the
  // claim.

  // ── Windowing (#52) ────────────────────────────────────────────────────────
  // The window belongs to the current result set, not the session, so every
  // filter change puts it back to the first batch.
  const [shown, setShown] = useState(REVEAL_STEP);

  // Every control on the rack lands here. Both rankings are already on the
  // client, so even `Build from` is a state change: no push, no transition,
  // no dimmed list waiting on a server that has nothing left to say.
  const update = useCallback(
    (next: LaneParams) => {
      // `?a=free` is a request, not a promise. With no free ranking there is
      // nothing to switch to, so the flip is refused rather than rendering an
      // empty list under a checked segment.
      const avail = next.avail === "free" && !freeItems ? params.avail : next.avail;
      setParams({ ...next, avail });
      // A flip the reader made is remembered for their next visit (Hugh, 2026-09-27). Out here
      // rather than in an updater, which must stay pure, and only when the mode moved. A Clear
      // counts: the chassis puts availability inside Clear's scope (one `activeControlCount`
      // feeds the badge, the chips and Clear, and the badge counts `Free cards only`), so a
      // Clear that resets it to `All my cards` is the reader choosing that, and is saved.
      if (avail !== params.avail) {
        setSavedChoice(avail);
        void rememberCommandersAvail(avail);
      }
      // The window belongs to the current result set, not the session: every
      // one of these changes which commanders occupy the revealed range.
      setShown(REVEAL_STEP);
    },
    // `setParams` is not a plain setter — it records which queries the edit is
    // valid for, so it changes whenever the live query does. Left out, this
    // callback would keep the first render's copy and file every later edit
    // against the query the page opened on, which drops it.
    [freeItems, params.avail, setParams],
  );

  // The zero state's wholesale escape says `Clear all filters`, so it means the
  // same thing the rack's own `Clear` means: every control back to the lane's
  // default, search included. Anything narrower would leave a control lit under
  // a button that claimed to have cleared them.
  const handleClearFilter = useCallback(() => update(defaultParams("owned")), [update]);

  // The zero state's specific correction: the one lit pip, or the Printed in selection, whose
  // removal returns the most rows, with the commander it brings back and how many come with it.
  //
  // Not availability. Availability is a scoring control — it re-scores the same
  // members and removes none — so dropping it could never return a row, and the
  // mode is excluded because the sentence the copy module owns promises the
  // reader a colour ("Drop the colour and you get N rows back"), which a mode
  // flip would not keep.
  //
  // Every candidate carries the same `changedAt`: the pips are rebuilt in WUBRG
  // order on each toggle, so nothing on this lane records which one moved last,
  // and inventing an order here would be a recency claim the rack cannot make.
  const nearest = useMemo(() => {
    const returned = new Map<string, typeof searched>();
    for (const hue of colors) {
      returned.set(
        colourName(hue),
        filterByColors(
          narrowed,
          colors.filter((c) => c !== hue),
          params.match,
        ),
      );
    }
    // `Printed in` is one control however many sets it names, so dropping it is one candidate,
    // named as its chip names it. Last in the map, so a tie goes to a pip: `changedAt` is 0 for
    // every candidate, and `nearestFix` keeps the first of equals.
    if (setCodes.length > 0) {
      returned.set(printedInLabel(setCodes), filterByColors(searched, colors, params.match));
    }
    const best = nearestFix(
      [...returned].map(([control, rows]) => ({ control, rows: rows.length, changedAt: 0 })),
    );
    if (best === null) return null;
    const back = ordered(returned.get(best.control) as typeof searched, params.order);
    // The DRAWN name: this sentence offers to bring a row back, and naming it by the
    // oracle name would promise a commander no row on this lane is captioned with.
    const kind: "color" | "sets" =
      setCodes.length > 0 && best.control === printedInLabel(setCodes) ? "sets" : "color";
    return { name: commanderDisplayName(back[0]), control: best.control, rows: best.rows, kind };
  }, [colors, narrowed, searched, setCodes, params.match, params.order]);

  // The named correction, and only it: one pip goes out and every other control
  // stays where the reader put it. The control is carried as the reader's word
  // for it, so the pip it names is found by that word rather than by index.
  const handleDropColour = useCallback(() => {
    if (nearest === null) return;
    if (setCodes.length > 0 && nearest.control === printedInLabel(setCodes)) {
      update({ ...params, printedIn: [] });
      return;
    }
    update({
      ...params,
      colors: rawColors.filter((hue) => colourName(hue) !== nearest.control),
    });
  }, [nearest, update, params, rawColors, setCodes]);

  const windowed = useMemo(() => filtered.slice(0, shown), [filtered, shown]);
  const remaining = Math.max(0, filtered.length - shown);
  // A list too short to have ever been windowed ends on a plain spacer — the
  // rule means "you've revealed everything", not "the list ended".
  const wasWindowed = filtered.length > REVEAL_STEP;

  const [announcement, setAnnouncement] = useState("");
  // The banner is raised when ANY row lost its synergy data; it says "some" unless every row did.
  const partialSynergy = degraded && !results.every((r) => r.synergyState === "degraded");
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const prevShown = useRef(shown);

  const handleReveal = useCallback(() => {
    setShown((s) => Math.min(s + REVEAL_STEP, filtered.length));
  }, [filtered.length]);

  // Both the announcement and the focus move are derived from the *committed*
  // window rather than computed in the click handler: the row to focus doesn't
  // exist yet when the handler runs, and reading `shown` there would let two
  // fast clicks announce a range that was never actually revealed.
  useLayoutEffect(() => {
    const before = prevShown.current;
    prevShown.current = shown;
    // Only a reveal widens the window; a filter change narrows it back. Clearing
    // rather than returning matters twice over: it drops stale screen-reader text
    // that no longer describes the list, and it stops React bailing out later if
    // a reveal happens to produce the string already sitting in the region — an
    // unchanged node is never re-announced.
    if (shown <= before) {
      setAnnouncement("");
      return;
    }
    setAnnouncement(revealAnnouncement(shown, filtered.length, before));
    // preventScroll: revealing must not move the reader's place. The accent ring
    // is the cue that keyboard position advanced, not a jump down the page.
    itemRefs.current[before]?.focus({ preventScroll: true });
  }, [shown, filtered.length]);

  // The re-rank announcement (§7.7), on the page's one live region. A plain
  // effect on purpose: the reveal handler above is a layout effect and clears
  // the region when the window narrows, which a flip always does. Running after
  // it is what stops the clear from swallowing this.
  const prevAvail = useRef(avail);
  useEffect(() => {
    if (prevAvail.current === avail) return;
    prevAvail.current = avail;
    // This announces the FLIP. The aside that explains what the flip hid is
    // spoken by the chassis result line, which is the region that owns the
    // count it explains, and which speaks its visible sentence.
    //
    // So a `Build from` flip speaks twice on the wide rack: the mode from here,
    // the count and its reason from there. That predates this change — the two
    // regions have both spoken on a flip since the toggle shipped — and every
    // attempt to route the aside around it during review moved the duplication
    // rather than removing it. Collapsing the lane to one region is work about
    // this lane's a11y rather than about free mode, and is in the PR's
    // follow-up list.
    setAnnouncement(availabilityCopy.ranking.announce(avail, active.length));
  }, [avail, active.length]);

  return (
    <div>
      <PageHeader lane="owned" />

      {/* Present before the first reveal — a live region inserted at announce
          time is frequently not read. Unconditional since #43: the ranking
          toggle exists on every list, including one too short to ever window. */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>

      {/* ── Global degraded banner (above everything) ── */}
      {/* One banner, never two: both reads being down folds into a single
          `both` variant with one Retry, because `retryRecs` re-runs the whole
          page and the player is making one decision, not two. */}
      {(degraded || !availOk) && (
        <div className="px-[14px] pt-[12px] sm:px-0 sm:pt-0">
          <DegradedBanner
            variant={
              degraded && !availOk ? "both" : availOk ? "synergy" : "availability"
            }
            partial={partialSynergy}
          />
        </div>
      )}

      {/* ── First-run guided banner ── */}
      {firstRun && (
        <div className="px-[14px] pt-[12px] sm:px-0 sm:pt-0">
          <GuidedBanner
            uniqueCardsRead={uniqueCardsRead}
            candidateCount={candidateCount}
          />
        </div>
      )}

      {/* The rack is shared with `/discover`; `lane` is the whole of the
          difference. Its result line answers how many rows the filters left,
          which is a different question from the reveal control's "N more
          below" — so the rack states one and never the other. */}
      <FilterRack
        params={rackParams}
        lane="owned"
        onChange={update}
        shown={filtered.length}
        total={active.length}
        excludedByExactly={excludedByExactly}
        sleevedByFree={sleevedByFree}
        printedInOptions={setOptions}
      />

      {/* ── Main content: list (or filtered-empty) ── */}
      <div className="flex flex-1 flex-col p-[12px_14px] sm:px-[34px] sm:pb-[34px] sm:pt-[14px]">
        {/* Result list, or whichever zero state explains the emptiness. The
            colour state names a pip to drop, the search state names the other
            lane and the free state names the other segment, so which one renders
            follows which control did the narrowing. Free is tested FIRST, and
            only yields to the colour state: with a pip lit the colour
            arithmetic still has an answer and is the more useful one, but with a
            QUERY lit the search state would tell a reader who owns the commander
            that they may not own it and send them to Discover. `sleevedByFree`
            counts over the rows the search left, so it is non-null here only
            when the query really did match commanders that free mode then hid. Zero with nothing lit at all is not a filtered result —
            the reader owns no commanders — and the list's own emptiness is the
            honest thing to show. */}
        {filtered.length === 0 && colors.length === 0 && setCodes.length === 0 && sleevedByFree ? (
          <FreeEmpty
            query={params.q.trim() || undefined}
            onShowAll={() => update({ ...params, avail: "all" })}
          />
        ) : filtered.length === 0 && (colors.length > 0 || setCodes.length > 0) ? (
          <FilteredEmpty
            nearest={nearest}
            onDrop={handleDropColour}
            onClearAll={handleClearFilter}
          />
        ) : filtered.length === 0 && params.q.trim() !== "" ? (
          <OwnedSearchEmpty
            query={params.q.trim()}
            total={active.length}
            onClearSearch={() => update({ ...params, q: "" })}
          />
        ) : (
          <>
            <ArrivalOrder>
            <ul className="flex flex-col gap-[10px] sm:gap-[12px] list-none p-0 m-0">
              {windowed.map((r, i) => (
                <li
                  key={r.slug}
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
                  {/* The SAME component the discover lane draws. Nothing here
                      is read off ownership (D1), so the receipt counts, the
                      delta and the availability mode no longer reach the row —
                      they belong to surfaces that survived it. */}
                  <CommanderRow
                    position={i}
                    item={{
                      slug: r.slug,
                      name: r.name,
                      // The owned lane's rows are cards the reader HOLDS, so each
                      // carries the name on their own copy; the discover lane leaves
                      // it absent and the row draws the oracle name.
                      printedName: r.printedName,
                      colorIdentity: r.colorIdentity,
                      artCropUri: r.artCropUri,
                      rank: rankBySlug.get(r.slug) ?? 0,
                      prose: r.prose,
                      gapSlot: r.gapSlot,
                      score: r.score,
                      measurableTotal: r.measurableTotal,
                      // Fit's three parts, for the segmented bar. The owned lane
                      // already carried them on its score rows; the discover
                      // lane ships them from v6 of its payload.
                      fitPool: r.fitPool,
                      fitRoles: r.fitRoles,
                      fitSynergy: r.fitSynergy,
                      deckCount: r.deckCount,
                      // EVERY ROW HERE IS OWNED, so §7.4 row 5 applies to all
                      // of them: the slot unmounts. Passed as a literal rather
                      // than read, because the lane has no price to read.
                      price: { kind: "absent" },
                      priceOk: true,
                      href: commanderDetailHref(r.slug, avail),
                    }}
                  />
                </li>
              ))}
              {remaining > 0 && (
                <li>
                  <RevealControl remaining={remaining} onReveal={handleReveal} />
                </li>
              )}
            </ul>
            </ArrivalOrder>
            {/* Mobile: clear the bottom tab bar so the control isn't half-covered. */}
            {remaining > 0 && <div className="h-[24px] sm:hidden" />}
            {remaining === 0 && wasWindowed && (
              <EndOfRanking total={filtered.length} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
