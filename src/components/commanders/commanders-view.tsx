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
import type { CommanderListItem } from "../../lib/recs/recommend";
import { fromFreeDelta, type FreeRankingDelta } from "../../lib/recs/free-delta";
import { filterByColors } from "../../lib/commanders/filter";
import {
  defaultParams,
  laneQuery,
  parseLaneParams,
  type LaneOrder,
  type LaneParams,
} from "../../lib/commanders/lane-params";
import { rankMap } from "../../lib/commanders/rank-maps";
import { nearestFix } from "../../lib/commanders/nearest-fix";
import { filterCopy } from "../../lib/copy/lanes";
import type { ReceiptCounts } from "../../lib/commanders/in-use";
import { availabilityCopy } from "../../lib/copy/availability";
import { RecCard, type ScoreDelta } from "./rec-card";
import { FilterRack } from "./rack/filter-rack";
import { GuidedBanner } from "./guided-banner";
import { PageHeader } from "./page-header";
import { DegradedBanner } from "./degraded-banner";
import { FilteredEmpty, OwnedSearchEmpty } from "./filtered-empty";
import {
  REVEAL_STEP, RevealControl, EndOfRanking, revealAnnouncement,
} from "./reveal-control";

export type AvailMode = "all" | "free";

// A commander whose whole pool is free. Shared rather than allocated per row,
// and the fallback for the degraded read, where the page has no counts at all:
// zero claims renders the receipt's first clause alone, which stays true.
const NO_CLAIMS: ReceiptCounts = { inUse: 0, wantedByBrew: 0 };

// `filterByColors` matches against `colorIdentity`, which is upper-case
// throughout the catalog; `lane-params` writes the URL in lower case. The lift
// happens once, here, rather than inside the predicate — the collection browser
// passes it upper-case already.
const upper = (colors: string[]) => colors.map((c) => c.toUpperCase());

/** The reader's word for one pip. The catalog's hues are upper-case and the copy
    module keys on the URL's lower-case form, so the lift happens here. */
const colourName = (hue: string) =>
  filterCopy.colour.names[hue.toLowerCase() as keyof typeof filterCopy.colour.names];

/**
 * The lane's client-side ordering. `fit` is the server's order and is returned
 * untouched, which is also what keeps the rank numerals meaningful: they are
 * built over the unfiltered list in fit order and never renumber.
 */
function ordered<T extends { name: string }>(rows: T[], order: LaneOrder): T[] {
  if (order !== "name") return rows;
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, "en"));
}

function matchesQuery(name: string, q: string): boolean {
  return name.toLowerCase().includes(q);
}


// ── Component ─────────────────────────────────────────────────────────────────

export type CommandersViewProps = {
  results: CommanderListItem[];
  degraded: boolean;
  uniqueCardsRead: number;
  candidateCount: number;
  firstRun: boolean;
  /**
   * Which ranking to open on, parsed from `?avail=`. Only the initial mode: both
   * rankings arrive in the same render, so the toggle switches between two lists
   * already on the client and this component owns the mode from mount on.
   */
  avail: AvailMode;
  /** The same commanders re-scored against the free pool, as a diff against
      `results` — the two lists share most of their bytes. Null when unreadable. */
  freeRanking: FreeRankingDelta | null;
  /** False when no free ranking could be produced — the availability read
      failed, or the ranking itself came back unusable. Either way `What's free`
      is unavailable, and `freeRanking` is null alongside it. */
  availOk: boolean;
  /** Receipt clause counts by oracleId, for both modes. */
  receiptCounts: Map<string, ReceiptCounts>;
};

export function CommandersView({
  results,
  degraded,
  uniqueCardsRead,
  candidateCount,
  firstRun,
  avail: initialAvail,
  freeRanking,
  availOk,
  receiptCounts,
}: CommandersViewProps) {
  const search = useSearchParams();

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
  const [params, setParams] = useState<LaneParams>(() => {
    const parsed = parseLaneParams(search, "owned");
    const canRankFree = availOk && freeRanking !== null;
    return {
      ...parsed,
      avail: parsed.avail === "free" && canRankFree ? "free" : initialAvail,
    };
  });
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
    const next = laneQuery(new URLSearchParams(live), params, "owned");
    window.history.replaceState(null, "", `${pathname}${next}`);
  }, [params]);

  // Which list is on screen. Falling back to `results` when the free ranking is
  // missing keeps the page rendering something true rather than nothing.
  const active = avail === "free" && freeItems ? freeItems : results;

  // Search narrows before colour, so the colour counts below describe the list
  // the reader is actually looking at. Name matching only, case-insensitive,
  // and nothing trimmed off the middle — the same matcher discovery uses.
  const searched = useMemo(() => {
    const q = params.q.trim().toLowerCase();
    return q === "" ? active : active.filter((r) => matchesQuery(r.name, q));
  }, [active, params.q]);

  const filtered = useMemo(
    () => ordered(filterByColors(searched, colors, params.match), params.order),
    [searched, colors, params.match, params.order],
  );

  // What `Exactly` costs against `Any`, counted over the same searched list so
  // the figure answers for one control alone. Null when the mode is off, when
  // no pip is lit, or when the two modes agree — a "0 excluded" aside is noise.
  const excludedByExactly = useMemo(() => {
    if (params.match !== "exactly" || colors.length === 0) return null;
    const loose = filterByColors(searched, colors, "contains").length;
    const diff = loose - filterByColors(searched, colors, "exactly").length;
    return diff > 0 ? diff : null;
  }, [searched, colors, params.match]);

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

  // The all-mode score for each commander, joined on oracleId. Both arrays are
  // already on the client, so the delta is a join and not a fetch.
  const allByOracleId = useMemo(
    () => new Map(results.map((r) => [r.oracleId, r])),
    [results],
  );

  // §9.2: free mode only, and only where the score actually moved. It compares a
  // commander to its OWN other score, never to another row, so it is correct at
  // rank 3 and at rank 200 whether or not either is revealed.
  const deltaFor = useCallback(
    (r: CommanderListItem): ScoreDelta | null => {
      if (avail !== "free") return null;
      const was = allByOracleId.get(r.oracleId)?.score;
      if (was === undefined) return null;
      const drop = Math.round(was) - Math.round(r.score);
      return drop > 0 ? { drop, was: Math.round(was) } : null;
    },
    [avail, allByOracleId],
  );

  // ── Windowing (#52) ────────────────────────────────────────────────────────
  // The window belongs to the current result set, not the session, so every
  // filter change puts it back to the first batch.
  const [shown, setShown] = useState(REVEAL_STEP);

  // Every control on the rack lands here. Both rankings are already on the
  // client, so even `Score against` is a state change: no push, no transition,
  // no dimmed list waiting on a server that has nothing left to say.
  const update = useCallback(
    (next: LaneParams) => {
      setParams((prev) => ({
        ...next,
        // `?a=free` is a request, not a promise. With no free ranking there is
        // nothing to switch to, so the flip is refused rather than rendering an
        // empty list under a checked segment.
        avail: next.avail === "free" && !freeItems ? prev.avail : next.avail,
      }));
      // The window belongs to the current result set, not the session: every
      // one of these changes which commanders occupy the revealed range.
      setShown(REVEAL_STEP);
    },
    [freeItems],
  );

  // The zero state's wholesale escape says `Clear all filters`, so it means the
  // same thing the rack's own `Clear` means: every control back to the lane's
  // default, search included. Anything narrower would leave a control lit under
  // a button that claimed to have cleared them.
  const handleClearFilter = useCallback(() => update(defaultParams("owned")), [update]);

  // The zero state's specific correction: the one lit pip whose removal returns
  // the most rows, with the commander it brings back and how many come with it.
  //
  // Colours only. Availability is a scoring control — it re-scores the same
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
          searched,
          colors.filter((c) => c !== hue),
          params.match,
        ),
      );
    }
    const best = nearestFix(
      [...returned].map(([control, rows]) => ({ control, rows: rows.length, changedAt: 0 })),
    );
    if (best === null) return null;
    const back = ordered(returned.get(best.control) as typeof searched, params.order);
    return { name: back[0].name, control: best.control, rows: best.rows };
  }, [colors, searched, params.match, params.order]);

  // The named correction, and only it: one pip goes out and every other control
  // stays where the reader put it. The control is carried as the reader's word
  // for it, so the pip it names is found by that word rather than by index.
  const handleDropColour = useCallback(() => {
    if (nearest === null) return;
    update({
      ...params,
      colors: rawColors.filter((hue) => colourName(hue) !== nearest.control),
    });
  }, [nearest, update, params, rawColors]);

  const windowed = useMemo(() => filtered.slice(0, shown), [filtered, shown]);
  const remaining = Math.max(0, filtered.length - shown);
  // A list too short to have ever been windowed ends on a plain spacer — the
  // rule means "you've revealed everything", not "the list ended".
  const wasWindowed = filtered.length > REVEAL_STEP;

  const [announcement, setAnnouncement] = useState("");
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
        params={params}
        lane="owned"
        onChange={update}
        shown={filtered.length}
        total={active.length}
        excludedByExactly={excludedByExactly}
      />

      {/* ── Main content: list (or filtered-empty) ── */}
      <div className="flex flex-1 flex-col p-[12px_14px] sm:px-[34px] sm:pb-[34px] sm:pt-[14px]">
        {/* Result list, or whichever zero state explains the emptiness. The
            colour state names a pip to drop and the search state names the
            other lane, so which one renders follows which control did the
            narrowing. Zero with neither lit is not a filtered result — the
            reader owns no commanders — and the list's own emptiness is the
            honest thing to show. */}
        {filtered.length === 0 && colors.length > 0 ? (
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
                  <RecCard
                    commander={r}
                    rank={rankBySlug.get(r.slug) ?? 0}
                    avail={avail}
                    counts={receiptCounts.get(r.oracleId) ?? NO_CLAIMS}
                    delta={deltaFor(r)}
                  />
                </li>
              ))}
              {remaining > 0 && (
                <li>
                  <RevealControl remaining={remaining} onReveal={handleReveal} />
                </li>
              )}
            </ul>
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
