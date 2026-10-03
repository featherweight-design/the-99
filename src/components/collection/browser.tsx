"use client";
// Top-level collection browse client component.
// Owns filter/sort/view/window/modal state, mirrors to URL query params
// (OWNED_PARAMS below, the authoritative list) via history.replaceState so
// chips + view + open card deep-link (READINESS #6).

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  DEFAULT_SORT_DIRECTION,
  filterCards,
  sortCards,
  type BrowseListCard,
  type BrowseFilters,
  type SortDirection,
  type SortKey,
} from "../../lib/collection/browse";
// SORT_KEYS lives with the Sort ▾ option builder, so the panel's rows and this
// query-param guard cannot drift apart when a key is added.
import { SORT_KEYS, parseSortDirection } from "../../lib/collection/sort-options";
import { buildColorOptions } from "../../lib/collection/color-filter";
import {
  buildSetOptions,
  parseSetCodesParam,
  serializeSetCodes,
  type OwnedSetMeta,
} from "../../lib/collection/set-filter";
import {
  buildTypeOptions,
  parseTypesParam,
  serializeTypes,
} from "../../lib/collection/type-filter";
import {
  buildAvailabilityOptions,
  initialAvailability,
  serializeAvailability,
} from "../../lib/collection/availability-filter";
import { collectionFilterCopy, type FilterPanelCopy } from "../../lib/copy/collection";
import {
  COLLECTION_VIEW_KEY,
  FilterBar,
  isViewMode,
  useIsDesktop,
  type FilterChangeIntent,
  type ViewMode,
} from "./filter-bar";
import { CHASSIS_WIDE_MIN_PX } from "../ui/filter-chassis";
import { useMinWidth } from "../ui/use-min-width";
import { collectionChips } from "../../lib/collection/chips";
import { AvailabilityGlyph } from "../ui/availability-marker";
import { collectionChassisCopy } from "../../lib/copy/collection";
import type { FilterChip } from "../ui/filter-chassis";
import { RowsView } from "./rows-view";
import { GridView } from "./grid-view";
import { useStoredView } from "../ui/use-stored-view";
import { NoResults } from "./no-results";
import { useCardDetail } from "../cards/card-detail-provider";
import { parseColors } from "../../lib/color-param";
import { mirrorUrl } from "../../lib/url/mirror";

const PAGE_SIZE = 200;

/**
 * The query keys this component owns. Everything else on the URL — a `ref=`, a
 * campaign tag, anything a future surface adds — belongs to someone else and is
 * carried through untouched, so the browse state is written by clearing exactly
 * these and rewriting them rather than by rebuilding the whole query string.
 */
const OWNED_PARAMS = ["q", "c", "t", "s", "avail", "sort", "dir", "view", "card"] as const;

function serializeParams(
  filters: BrowseFilters,
  sort: SortKey,
  direction: SortDirection,
  view: ViewMode | null,
  card: string | null,
  existing: string,
): string {
  const p = new URLSearchParams(existing);
  for (const key of OWNED_PARAMS) p.delete(key);
  if (filters.search.trim()) p.set("q", filters.search.trim());
  if (filters.colors.length > 0) p.set("c", filters.colors.join(""));
  // Comma-joined; a single bare type still parses, so pre-#100 links survive.
  if (filters.types.length > 0) p.set("t", serializeTypes(filters.types));
  // Comma-joined; a single bare code still parses, so pre-#86 links survive.
  if (filters.setCodes.length > 0) p.set("s", serializeSetCodes(filters.setCodes));
  // Comma-joined, same shape as t= and s=.
  if (filters.availability && filters.availability.length > 0) {
    p.set("avail", serializeAvailability(filters.availability));
  }
  if (sort !== "name") p.set("sort", sort);
  // Only when it is NOT the key's natural direction, so the common case keeps a
  // clean URL and a pre-#119 link still lands on the order it always did.
  if (direction !== DEFAULT_SORT_DIRECTION[sort]) p.set("dir", direction);
  if (view !== null) p.set("view", view);  // null = auto (no explicit choice) → omit
  if (card) p.set("card", card);
  const s = p.toString();
  return s ? `?${s}` : "";
}

const setCopy = collectionFilterCopy.set;
const typeCopy = collectionFilterCopy.type;
const colorCopy = collectionFilterCopy.color;
const availCopy = collectionFilterCopy.availability;

/** Sum of quantities, i.e. the "2,933 cards" figure the announcements quote. */
function quantityOf(list: BrowseListCard[]): number {
  return list.reduce((sum, c) => sum + c.quantity, 0);
}

/**
 * The clear intent each chip's removal carries, keyed by the chip it belongs to.
 * Lives here rather than in `chips.ts` because the intents are the mount's
 * vocabulary and that module is pure — it has no business naming this layer's
 * announcement paths.
 */
const CHIP_CLEAR_INTENT: Record<string, FilterChangeIntent | undefined> = {
  colors: "clear-colors",
  types: "clear-types",
  sets: "clear-sets",
  avail: "clear-availability",
};

/**
 * The live-region string for a change to one multi-select, or null when that
 * selection did not move. Set and Type share it: the two copy blocks have the
 * same shape, and only the field read and the clear intent differ.
 */
function selectionAnnouncement(
  before: string[],
  after: string[],
  copy: FilterPanelCopy,
  cleared: boolean,
  next: BrowseFilters,
  cards: BrowseListCard[],
  options: { code: string; label: string }[],
  totalQuantity: number,
): string | null {
  if (before.length === after.length && before.every((c, i) => c === after[i])) return null;
  // Always the cleared string for `Clear`, including at exactly one selection —
  // "Bloomburrow removed. No set filter, …" belongs to toggling the last option
  // off, not to pressing the button.
  // What survives `next`, which is what every branch below reports. Clearing
  // ONE dimension does not clear the others, so announcing the whole
  // collection here claimed a list the reader is not looking at.
  const shown = quantityOf(filterCards(cards, next));
  if (cleared) return copy.announceCleared(shown);
  const label = (code: string) => options.find((o) => o.code === code)?.label ?? code;
  const added = after.find((c) => !before.includes(c));
  if (added !== undefined) return copy.announceAdded(label(added), after.length, shown, totalQuantity);
  const removed = before.find((c) => !after.includes(c));
  if (removed !== undefined) {
    return copy.announceRemoved(label(removed), after.length, shown, totalQuantity);
  }
  return null;
}

/** The live-region string for a change to the set selection. */
export function setChangeAnnouncement(
  prev: BrowseFilters,
  next: BrowseFilters,
  cards: BrowseListCard[],
  options: { code: string; label: string }[],
  totalQuantity: number,
  intent?: FilterChangeIntent,
): string | null {
  return selectionAnnouncement(
    prev.setCodes, next.setCodes, setCopy, intent === "clear-sets",
    next, cards, options, totalQuantity,
  );
}

/**
 * The live-region string for a change to the color selection. Fires for the
 * desktop pip row too, not just the mobile Color ▾ panel — the pips are the same
 * selection and used to change it silently.
 */
export function colorChangeAnnouncement(
  prev: BrowseFilters,
  next: BrowseFilters,
  cards: BrowseListCard[],
  options: { code: string; label: string }[],
  totalQuantity: number,
  intent?: FilterChangeIntent,
): string | null {
  return selectionAnnouncement(
    prev.colors, next.colors, colorCopy, intent === "clear-colors",
    next, cards, options, totalQuantity,
  );
}

/** The live-region string for a change to the type selection. */
export function typeChangeAnnouncement(
  prev: BrowseFilters,
  next: BrowseFilters,
  cards: BrowseListCard[],
  options: { code: string; label: string }[],
  totalQuantity: number,
  intent?: FilterChangeIntent,
): string | null {
  return selectionAnnouncement(
    prev.types, next.types, typeCopy, intent === "clear-types",
    next, cards, options, totalQuantity,
  );
}

/**
 * The live-region string for a change to the availability selection. Same
 * shape as its three siblings; the `?? []` pair exists only because
 * `BrowseFilters.availability` is optional and theirs are required.
 */
export function availabilityChangeAnnouncement(
  prev: BrowseFilters,
  next: BrowseFilters,
  cards: BrowseListCard[],
  options: { code: string; label: string }[],
  totalQuantity: number,
  intent?: FilterChangeIntent,
): string | null {
  return selectionAnnouncement(
    prev.availability ?? [], next.availability ?? [], availCopy,
    intent === "clear-availability",
    next, cards, options, totalQuantity,
  );
}

export function CollectionBrowser({
  cards,
  ownedSets,
  availabilityOk,
  hasCollection,
}: {
  cards: BrowseListCard[];
  /** `sets` catalog rows for the sets this user owns — names + release dates. */
  ownedSets: OwnedSetMeta[];
  /**
   * False when the page's availability read failed. `/collection` fails quiet:
   * the markers are simply absent and the filter trigger is disabled with a
   * reason. No banner (Addendum 2, implementation notes).
   */
  availabilityOk: boolean;
  /**
   * Whether the reader has a collection AT ALL, from the page's own stats. Not derived
   * from `cards`: that array holds catalog-backed rows only, so a collection made
   * entirely of unmatched cards would read as no collection and hide the sets entry.
   */
  hasCollection: boolean;
}) {
  const search = useSearchParams();
  const isDesktop = useIsDesktop();
  // The result line lives in the chassis, so which of the two it draws follows
  // the CHASSIS's breakpoint rather than this file's 768. `isDesktop` still
  // picks the default view, which is its own question.
  const chassisWide = useMinWidth(`(min-width: ${CHASSIS_WIDE_MIN_PX}px)`);

  const [filters, setFilters] = useState<BrowseFilters>(() => ({
    search: search.get("q") ?? "",
    colors: parseColors(search.get("c")),
    types: parseTypesParam(search.get("t")),
    setCodes: parseSetCodesParam(search.get("s")),
    availability: initialAvailability(availabilityOk, search.get("avail")),
  }));
  // Guard query params — shared URLs can carry unknown values; fall back to defaults.
  const [sort, setSort] = useState<SortKey>(() => {
    const s = search.get("sort");
    return s !== null && (SORT_KEYS as readonly string[]).includes(s) ? (s as SortKey) : "name";
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() =>
    parseSortDirection(search.get("dir"), sort),
  );
  // null = "auto" (no explicit user choice); resolves to rows on mobile, grid on desktop.
  const [view, setView] = useState<ViewMode | null>(() => {
    const v = search.get("view");
    return isViewMode(v ?? "") ? (v as ViewMode) : null;
  });
  // The choice this browser made on some earlier visit. It sits UNDER the URL
  // and OVER the width default: a shared link carrying `?view=` describes the
  // list its sender meant, and nothing a reader stored should overwrite that.
  //
  // The STORED value is never serialised — arriving at a bare `/collection` and
  // being shown your grid leaves the address bar bare, so the URL still means
  // "somebody chose this here". Pressing the toggle does still write `?view=`,
  // exactly as it did before this file knew anything about storage: that press
  // IS a choice made here, and it is what makes the current list shareable.
  // The two are different acts and only one of them touches the URL.
  const [storedView, chooseView] = useStoredView(COLLECTION_VIEW_KEY, isViewMode);
  const effectiveView: ViewMode = view ?? storedView ?? (isDesktop ? "grid" : "rows");
  const chooseAndKeepView = useCallback(
    (next: ViewMode) => {
      setView(next);
      chooseView(next);
    },
    [chooseView],
  );
  // The modal itself lives in the page's CardDetailProvider, which fetches the card's
  // printings and oracle text on click. The browse list ships without them.
  const {
    open: openDetail,
    openOracleId,
    pendingOracleId,
    setSiblings,
    close: closeDetail,
  } = useCardDetail();
  const [shown, setShown] = useState(PAGE_SIZE);

  const totalQuantity = useMemo(() => cards.reduce((sum, c) => sum + c.quantity, 0), [cards]);

  // Options are rebuilt when the OTHER filters move (counts are filter-aware)
  // but not when the set selection or the search box changes — see set-filter.ts.
  // Depends on the fields buildSetOptions actually reads, not on `filters` —
  // that object is rebuilt on every keystroke, which would recount the lot. The
  // spreads preserve `colors`' array identity, so it is a sound dep as-is.
  const {
    colors: filterColors,
    types: filterTypes,
    setCodes: filterSetCodes,
    availability: filterAvailability,
  } = filters;
  const setOptions = useMemo(
    () =>
      buildSetOptions(
        cards,
        {
          search: "",
          colors: filterColors,
          types: filterTypes,
          setCodes: [],
          availability: filterAvailability,
        },
        ownedSets,
      ),
    [cards, filterColors, filterTypes, filterAvailability, ownedSets],
  );

  // Same rule the other way round: type counts move with the colors and the
  // set selection, not with the type selection or the search box.
  const typeOptions = useMemo(
    () =>
      buildTypeOptions(cards, {
        search: "",
        colors: filterColors,
        types: [],
        setCodes: filterSetCodes,
        availability: filterAvailability,
      }),
    [cards, filterColors, filterSetCodes, filterAvailability],
  );

  // Same rule again: color counts move with the types and sets, not with the
  // color selection or the search box.
  const colorOptions = useMemo(
    () =>
      buildColorOptions(cards, {
        search: "",
        colors: [],
        types: filterTypes,
        setCodes: filterSetCodes,
        availability: filterAvailability,
      }),
    [cards, filterTypes, filterSetCodes, filterAvailability],
  );

  // Same rule a fourth time: availability counts move with the colors, types
  // and sets, never with this panel's own selection — counting under it would
  // make every option read as a subset of itself.
  const availabilityOptions = useMemo(
    () =>
      buildAvailabilityOptions(cards, {
        search: "",
        colors: filterColors,
        types: filterTypes,
        setCodes: filterSetCodes,
      }),
    [cards, filterColors, filterTypes, filterSetCodes],
  );


  const [announcement, setAnnouncement] = useState("");
  const [announceSeq, setAnnounceSeq] = useState(0);

  /**
   * The one way an announcement is published. Every writer goes through it —
   * filter changes, sort, the panels' arrow-key and search-match messages —
   * because `ResultLine` prefers the id over the text as the event's identity.
   * A writer that set the message without bumping the sequence would have every
   * later message read as the same event and go unspoken until some other path
   * moved the counter.
   */
  const publishAnnouncement = useCallback((message: string) => {
    setAnnouncement(message);
    setAnnounceSeq((n) => n + 1);
  }, []);
  // Bumped whenever an announcement is published, so a repeated sentence is a
  // new event rather than an unchanged string the live region would not re-read.

  // Any filter/sort change resets the window — folded into the update
  // callbacks (not an effect) to avoid a cascading render.
  const updateFilters = useCallback(
    (f: BrowseFilters, intent?: FilterChangeIntent) => {
      // The panels' add/remove/clear announcements are composed here rather than
      // in the panel: only this component knows how many cards survive the new
      // filter set, and the string quotes that figure. At most one of the two
      // selections moves per change, so the first non-null wins outright.
      const message =
        // Short-circuits the per-dimension chain: with every filter emptied at
        // once, whichever dimension answered first would name itself as the
        // thing that changed.
        (intent === "clear-all"
          ? collectionChassisCopy.announceClearedAll(totalQuantity)
          : null) ??
        setChangeAnnouncement(filters, f, cards, setOptions, totalQuantity, intent) ??
        typeChangeAnnouncement(filters, f, cards, typeOptions, totalQuantity, intent) ??
        colorChangeAnnouncement(filters, f, cards, colorOptions, totalQuantity, intent) ??
        availabilityChangeAnnouncement(
          filters, f, cards, availabilityOptions, totalQuantity, intent,
        );
      if (message) publishAnnouncement(message);
      setFilters(f);
      setShown(PAGE_SIZE);
    },
    [filters, cards, setOptions, typeOptions, colorOptions, availabilityOptions, totalQuantity, publishAnnouncement],
  );
  const updateSort = useCallback((s: SortKey, direction: SortDirection) => {
    setSort(s);
    setSortDirection(direction);
    setShown(PAGE_SIZE);
  }, []);

  const filtered = useMemo(() => filterCards(cards, filters), [cards, filters]);
  const sorted = useMemo(() => sortCards(filtered, sort, sortDirection), [filtered, sort, sortDirection]);

  const anyFilterActive =
    filters.search.trim() !== "" ||
    filters.colors.length > 0 ||
    filters.types.length > 0 ||
    filters.setCodes.length > 0 ||
    (filters.availability ?? []).length > 0;

  // `collectionChips` needs a label per code; the bar already built these.
  const chassisChips: FilterChip[] = collectionChips(filters, {
    types: typeOptions,
    sets: setOptions,
    availability: availabilityOptions,
  }).map((chip) => ({
    key: chip.key,
    label: chip.label,
    spoken: chip.spoken,
    dots: chip.dots,
    // The same marker the list rows draw. `chips.ts` reports the states as
    // codes because it is pure; building the glyph is this layer's job.
    leading:
      chip.markers && chip.markers.length > 0 ? (
        <span aria-hidden className="flex shrink-0 items-center gap-[3px]">
          {chip.markers.map((state) => (
            <AvailabilityGlyph
              key={state}
              // `chips.ts` filters `free` out, which is the markerless state.
              state={state as "soft" | "hard" | "over"}
              seam="var(--bg)"
            />
          ))}
        </span>
      ) : undefined,
    // A chip stands for a whole CONTROL, so removing one is the same event as
    // that control's Clear — `chip.next` empties the dimension outright. Without
    // the intent the change falls through to the per-value branch, and removing
    // a `2 colours` chip unsets both while the live region says only
    // "White removed". The search chip has no clear intent because no
    // announcement claims a search change.
    onRemove: () => updateFilters(chip.next, CHIP_CLEAR_INTENT[chip.key]),
  }));

  // `ChipRow`'s clear also reset the sort. The chassis's Clear names itself
  // "Clear all filters" and promises the sort is unchanged, so it no longer
  // does — a visible behaviour change on this route, and the chassis's promise
  // is the one that has to hold.
  //
  // The intent is what makes the live region say "Filters cleared" — so it is
  // carried only when a filter was actually on. `NoResults` draws its CTA in
  // the catalog-unmatched state too, where the reader has a collection but not
  // one card of it resolved: nothing is filtered, the button changes nothing,
  // and announcing a clear would describe an event that did not happen.
  // The write still goes through, so a search of nothing but whitespace — which
  // `anyFilterActive` trims to inactive — is still emptied.
  const clearAllFilters = () =>
    updateFilters(
      { search: "", colors: [], types: [], setCodes: [], availability: [] },
      anyFilterActive ? "clear-all" : undefined,
    );
  const windowed = useMemo(() => sorted.slice(0, shown), [sorted, shown]);

  // The ordered ids Prev/Next pages through — the sorted list, not the window,
  // so paging runs past the 200 cards currently rendered.
  const siblings = useMemo(() => sorted.map((c) => c.oracleId), [sorted]);

  const onOpen = useCallback(
    (id: string) => openDetail(id, siblings),
    [openDetail, siblings],
  );

  // A `?card=` on arrival opens the modal, but only when the id is actually in the
  // filtered and sorted list the link also describes — an id filtered out by the
  // rest of the URL is not a card this page is showing. Mount-only: after that the
  // modal owns itself, and re-opening on every sort change would fight the reader.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current) return;
    deepLinked.current = true;
    const id = search.get("card");
    if (id && siblings.includes(id)) openDetail(id, siblings);
  }, [search, siblings, openDetail]);

  // Push state → URL via history, not the router. `/collection` ships the whole
  // list in one payload and its page reads no searchParams, so every filter and
  // sort change is answered from state already in this component — a
  // `router.replace` would fetch an RSC payload identical to the one on screen.
  // Serialize the card param only when the open card is still in the current
  // result set; avoids a stale ?card= after a filter drops it.
  const openInList = openOracleId !== null && siblings.includes(openOracleId);

  // This list is a live filter of a larger one, so the order the modal pages
  // through has to move with it: re-file it on every change, and close the modal
  // outright when the card it is showing is no longer one of these results. Both
  // fell out of the old modal for free, because it read the open card back out of
  // `sorted` on every render and rendered nothing when it was not there.
  //
  // ONLY WHEN THE LIST MOVES. A card outside the list is also one the reader went to
  // on purpose: the combo block's partner name opens its partner in this modal, and
  // a partner is rarely in the filtered results — `q=mystical` does not hold
  // Approach of the Second Sun. Closing on "not in the list" alone shut the modal
  // the instant the partner opened, which is what a reader saw as the link closing
  // everything. So the close fires when the RESULTS change and the open card is not
  // among them, and never because the reader moved to another card.
  //
  // Compared by CONTENT, not by array: an art pick patches the list and hands back a
  // new array with the same ids, and that is not the list moving.
  const listKey = siblings.join(",");
  const lastListKey = useRef(listKey);
  useEffect(() => {
    const listMoved = lastListKey.current !== listKey;
    lastListKey.current = listKey;
    if (openOracleId === null) return;
    if (openInList) setSiblings(siblings);
    else if (listMoved) closeDetail();
  }, [siblings, listKey, openOracleId, openInList, setSiblings, closeDetail]);

  useEffect(() => {
    const qs = serializeParams(
      filters,
      sort,
      sortDirection,
      view,
      openInList ? openOracleId : null,
      // The live URL, not the mount-time one: a param this component does not
      // own can arrive after mount and must survive the next filter change.
      window.location.search,
    );
    mirrorUrl(`/collection${qs}`);
  }, [filters, sort, sortDirection, view, openOracleId, openInList]);

  return (
    <>
      <FilterBar
        colorOptions={colorOptions}
        shown={sorted.length}
        total={cards.length}
        chips={chassisChips}
        onClearAll={clearAllFilters}
        // A counter per announcement, so the same sentence spoken twice — the
        // same search re-run to the same count — is heard twice.
        announceId={announceSeq}
        // What the queue measures staleness against. The count alone cannot:
        // two filters can leave the same number of rows.
        revision={JSON.stringify(filters)}
        warnResult={sorted.length === 0}
        resultLine={
          chassisWide
            ? collectionChassisCopy.result(
                sorted.length,
                cards.length,
                totalQuantity,
                anyFilterActive,
              )
            : // The phone keeps the shorter line the chip row drew: row 3 also
              // carries the view toggle at 390px.
              collectionChassisCopy.resultCompact(sorted.length)
        }
        filters={filters}
        sort={sort}
        view={effectiveView}
        setOptions={setOptions}
        hasCollection={hasCollection}
        typeOptions={typeOptions}
        availabilityOptions={availabilityOptions}
        availabilityOk={availabilityOk}
        announcement={announcement}
        onAnnounce={publishAnnouncement}
        onFiltersChange={updateFilters}
        sortDirection={sortDirection}
        onSortChange={updateSort}
        onViewChange={chooseAndKeepView}
      />
      

      {sorted.length === 0 ? (
        <NoResults
          query={filters.search}
          colors={filters.colors}
          totalCount={totalQuantity}
          // The same `clearAllFilters` the chassis's Clear uses. This was a
          // second implementation of the same action that still reset the sort
          // and announced itself as a set clear — two visible controls with one
          // name behaving differently.
          onClearAll={clearAllFilters}
          onKeepSearch={() =>
            updateFilters({
              search: filters.search,
              colors: [],
              types: [],
              setCodes: [],
              availability: [],
            })
          }
        />
      ) : effectiveView === "rows" ? (
        <RowsView cards={windowed} totalCards={sorted.length} onShowMore={() => setShown((s) => s + PAGE_SIZE)} onOpen={onOpen} pendingOracleId={pendingOracleId} />
      ) : (
        <GridView cards={windowed} totalCards={sorted.length} onShowMore={() => setShown((s) => s + PAGE_SIZE)} onOpen={onOpen} pendingOracleId={pendingOracleId} />
      )}
    </>
  );
}
