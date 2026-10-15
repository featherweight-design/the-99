"use client";
// Top-level collection browse client component.
// Owns filter/sort/view/window/modal state, mirrors to URL query params
// (OWNED_PARAMS below, the authoritative list) via history.replaceState so
// chips + view + open card deep-link (READINESS #6).

import { collectionPriceCopy } from "../../lib/copy/collection-price";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_SORT_DIRECTION,
  filterCards,
  printedNameOf,
  sortCards,
  type BrowseListCard,
  type BrowseFilters,
  type SortDirection,
  type SortKey,
} from "../../lib/collection/browse";
import { buildColorOptions } from "../../lib/collection/color-filter";
import {
  buildSetOptions,
  serializeSetCodes,
  type OwnedSetMeta,
} from "../../lib/collection/set-filter";
import {
  buildTypeOptions,
  serializeTypes,
} from "../../lib/collection/type-filter";
import {
  buildAvailabilityOptions,
  serializeAvailability,
} from "../../lib/collection/availability-filter";
import { collectionFilterCopy, type FilterPanelCopy } from "../../lib/copy/collection";
import {
  COLLECTION_VIEW_KEY,
  FilterBar,
  isViewMode,
  type FilterChangeIntent,
  type ViewMode,
} from "./filter-bar";
import { CHASSIS_WIDE_MIN_PX } from "../ui/filter-chassis";
import { useMinWidth, useMinWidthHinted } from "../ui/use-min-width";
import { COLLECTION_VIEW_COOKIE, COLLECTION_WIDE_COOKIE } from "../ui/view-cookie";
import { collectionChips } from "../../lib/collection/chips";
import { AvailabilityGlyph } from "../ui/availability-marker";
import { collectionChassisCopy } from "../../lib/copy/collection";
import type { FilterChip } from "../ui/filter-chassis";
import { RowsView } from "./rows-view";
import { GridView } from "./grid-view";
import { HoverPreviewProvider } from "../decks/hover-preview";
import { useStoredView } from "../ui/use-stored-view";
import { NoResults } from "./no-results";
import { useCardDetail } from "../cards/card-detail-provider";
import { mirrorUrl } from "../../lib/url/mirror";
import { PAGE_SIZE, parseBrowseParams } from "../../lib/collection/window";
import { REVEAL_DONE_MS } from "../ui/reveal-from";
import type { CollectionRow } from "../../lib/collection/list-wire";
import { useCollectionFields } from "./use-collection-fields";


/**
 * The query keys this component owns. Everything else on the URL — a `ref=`, a
 * campaign tag, anything a future surface adds — belongs to someone else and is
 * carried through untouched, so the browse state is written by clearing exactly
 * these and rewriting them rather than by rebuilding the whole query string.
 */
const OWNED_PARAMS = ["q", "c", "m", "t", "s", "avail", "sort", "dir", "view", "card"] as const;

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
  // The default is an absence, as on the lanes and Sets: only `exactly` is written, and only
  // beside a lit colour, Sets' rule (#1172). The parse reads `m=exact` alone as contains, so a
  // URL carrying it with no colour would say one thing and draw another.
  if (filters.match === "exactly" && filters.colors.length > 0) p.set("m", "exact");
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

export type ViewHint = { stored: ViewMode | null; wide: boolean | null };
const NO_VIEW_HINT: ViewHint = { stored: null, wide: null };

export function CollectionBrowser({
  cards: rows,
  served: servedProp,
  ownedSets,
  availabilityOk,
  pricesFailed = false,
  viewHint = NO_VIEW_HINT,
}: {
  /**
   * The list, whole cards and WITHHELD ones (list payload plan, PR 4): the page ships the draw
   * fields for its URL's first window only. Nothing here but the views reads a draw field, so
   * filtering, search, sorting, counting and every option run over these rows as they are, and
   * only the window is resolved before it is drawn.
   */
  cards: CollectionRow[];
  /**
   * The list as the page decoded it, before any printing pick: what fetched fields are held
   * against. `cards` itself when omitted, which is the same list while nothing is picked.
   */
  served?: CollectionRow[];
  /** `sets` catalog rows for the sets this user owns — names + release dates. */
  ownedSets: OwnedSetMeta[];
  /**
   * False when the page's availability read failed. `/collection` fails quiet:
   * the markers are simply absent and the filter trigger is disabled with a
   * reason. No banner (Addendum 2, implementation notes).
   */
  availabilityOk: boolean;
  /**
   * The page's price read failed (F1). Price stays selectable and sorts every card as silent,
   * which is A to Z, and one line under the result line says so while that sort is chosen.
   */
  pricesFailed?: boolean;
  /**
   * What the page read from the two view cookies (`ui/view-cookie`): the stored view choice and
   * whether the window was wide on a past visit. Hints for the SERVER render only; absent, the
   * first render draws both views. A test that does not care passes nothing.
   */
  viewHint?: ViewHint;
}) {
  const search = useSearchParams();
  // A withheld row lacks only draw fields, which none of the filters, sorts, counts or options
  // below reads, so they take the list as it stands. The views take resolved rows alone.
  const cards = rows as BrowseListCard[];
  const served = servedProp ?? rows;
  // Whether the window is at least 768px, for the default view. The SERVER render and the
  // hydration pass take the page's cookie hint, so a desktop reader is drawn the grid from the
  // first byte instead of rows the grid replaces at hydration (`probe:view-flash`); null with no
  // hint, and then both views are drawn and CSS picks one (below).
  const isDesktop = useMinWidthHinted("(min-width: 768px)", viewHint.wide, COLLECTION_WIDE_COOKIE);
  // The result line lives in the chassis, so which of the two it draws follows
  // the CHASSIS's breakpoint rather than this file's 768. `isDesktop` still
  // picks the default view, which is its own question.
  const chassisWide = useMinWidth(`(min-width: ${CHASSIS_WIDE_MIN_PX}px)`);

  // The URL's state, parsed by the same function the page runs to cut its first window, so the
  // rows drawn first are the rows the page shipped whole. Shared URLs can carry unknown values;
  // each falls back to its default there.
  const [initial] = useState(() => parseBrowseParams((key) => search.get(key), availabilityOk));
  const [filters, setFilters] = useState<BrowseFilters>(initial.filters);
  const [sort, setSort] = useState<SortKey>(initial.sort);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initial.direction);
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
  //
  // Mirrored into a cookie, so the server render draws the stored choice too.
  const [storedView, chooseView] = useStoredView(COLLECTION_VIEW_KEY, isViewMode, {
    cookie: COLLECTION_VIEW_COOKIE,
    serverValue: viewHint.stored,
  });
  // Null only on a first visit's server render and hydration pass: no `?view=`, nothing stored
  // and no width hint. Both views are drawn then, CSS splits them, and the render after
  // hydration picks one — the toggle below shows neither segment pressed until it does, rather
  // than claiming a view the split is not actually showing.
  const resolvedView: ViewMode | null =
    view ?? storedView ?? (isDesktop === null ? null : isDesktop ? "grid" : "rows");
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
  // Where the latest press of Show more began (E9). Dropped by anything that is not a press: a filter, a search, a sort.
  const [revealFrom, setRevealFrom] = useState<number | null>(null);

  const totalQuantity = useMemo(() => cards.reduce((sum, c) => sum + c.quantity, 0), [cards]);

  // Options are rebuilt when the OTHER filters move (counts are filter-aware)
  // but not when the set selection or the search box changes — see set-filter.ts.
  // Depends on the fields buildSetOptions actually reads, not on `filters` —
  // that object is rebuilt on every keystroke, which would recount the lot. The
  // spreads preserve `colors`' array identity, so it is a sound dep as-is.
  const {
    colors: filterColors,
    match: filterMatch,
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
          match: filterMatch,
          types: filterTypes,
          setCodes: [],
          availability: filterAvailability,
        },
        ownedSets,
      ),
    [cards, filterColors, filterMatch, filterTypes, filterAvailability, ownedSets],
  );

  // Same rule the other way round: type counts move with the colors and the
  // set selection, not with the type selection or the search box.
  const typeOptions = useMemo(
    () =>
      buildTypeOptions(cards, {
        search: "",
        colors: filterColors,
        match: filterMatch,
        types: [],
        setCodes: filterSetCodes,
        availability: filterAvailability,
      }),
    [cards, filterColors, filterMatch, filterSetCodes, filterAvailability],
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
        match: filterMatch,
        types: filterTypes,
        setCodes: filterSetCodes,
      }),
    [cards, filterColors, filterMatch, filterTypes, filterSetCodes],
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
    (next: BrowseFilters, intent?: FilterChangeIntent) => {
      // Turning the last pip off returns the mode to Any, as Sets does (#1172) and as removing
      // the colour chip does: `Exactly` with nothing lit filters nothing, the control greys it,
      // and the URL does not write it, so state that kept it would disagree with both.
      const f: BrowseFilters =
        next.colors.length === 0 && next.match === "exactly" ? { ...next, match: "contains" } : next;
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
      setRevealFrom(null);
    },
    [filters, cards, setOptions, typeOptions, colorOptions, availabilityOptions, totalQuantity, publishAnnouncement],
  );
  const showMore = useCallback(() => {
    setRevealFrom(shown);
    setShown((s) => s + PAGE_SIZE);
  }, [shown]);
  const updateSort = useCallback((s: SortKey, direction: SortDirection) => {
    setSort(s);
    setSortDirection(direction);
    setShown(PAGE_SIZE);
    setRevealFrom(null);
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
  // THE ROWS ON SCREEN, which are not always the window. A `Show more`, a filter or a search that
  // reaches rows whose draw fields have not arrived keeps the rows already drawn on screen, the
  // list `aria-busy`, until they land: about one round trip, with no drawn waiting state.
  const wanted = useMemo(() => (sorted as CollectionRow[]).slice(0, shown), [sorted, shown]);
  const router = useRouter();
  const refreshStale = useCallback(() => router.refresh(), [router]);
  const { resolve } = useCollectionFields(served, wanted, refreshStale);
  const resolvedWanted = wanted.map(resolve);
  const complete = resolvedWanted.every((r) => r !== null);
  // The last rows drawn WHOLE, kept as drawn.
  const [held, setHeld] = useState<{ from: CollectionRow[]; rows: BrowseListCard[] }>(() => ({
    from: wanted,
    rows: resolvedWanted.filter((r): r is BrowseListCard => r !== null),
  }));
  if (complete && held.from !== wanted) {
    setHeld({ from: wanted, rows: resolvedWanted as BrowseListCard[] });
  }
  const windowed = complete ? (resolvedWanted as BrowseListCard[]) : held.rows;
  // The reveal is over once the last tile's fade is (the beat, the capped stagger and the 200ms fade, well inside this),
  // counted from when the new rows are on screen: a Show more whose draw fields are still arriving keeps the rows already
  // drawn, and its boundary has to be there when they mount. Dropping it then means a view switch or a breakpoint change,
  // which mounts a fresh list, replays nothing.
  useEffect(() => {
    if (revealFrom === null || !complete) return;
    const done = setTimeout(() => setRevealFrom(null), REVEAL_DONE_MS);
    return () => clearTimeout(done);
  }, [revealFrom, complete]);

  // The ordered ids Prev/Next pages through — the sorted list, not the window,
  // so paging runs past the 200 cards currently rendered. Carries each card's own
  // art and identity (H23 carousel PR 1b).
  const siblings = useMemo(
    () => sorted.map((c) => ({ oracleId: c.oracleId, name: printedNameOf(c), imageUri: c.imageUri, colorIdentity: c.colorIdentity })),
    [sorted],
  );
  const siblingIds = useMemo(() => sorted.map((c) => c.oracleId), [sorted]);

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
    if (id && siblingIds.includes(id)) openDetail(id, siblings);
  }, [search, siblingIds, siblings, openDetail]);

  // Push state → URL via history, not the router. `/collection` ships the whole
  // list in one payload and its page reads no searchParams, so every filter and
  // sort change is answered from state already in this component — a
  // `router.replace` would fetch an RSC payload identical to the one on screen.
  // Serialize the card param only when the open card is still in the current
  // result set; avoids a stale ?card= after a filter drops it.
  const openInList = openOracleId !== null && siblingIds.includes(openOracleId);

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
  const listKey = siblingIds.join(",");
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
        view={resolvedView}
        setOptions={setOptions}
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
      {pricesFailed && sort === "price" ? (
        <p className="px-[12px] md:px-[34px] pt-[6px] md:pt-[10px] font-mono text-[11.5px] md:text-[11px]" style={{ color: "var(--fg-faint)" }}>
          {collectionPriceCopy.readFailed}
        </p>
      ) : null}

      {/* Wrapping only the cards: the provider is a `div`, and the page's section is a flex column whose
          `flex-1` child is the list, so the wrapper takes over that sizing and the chassis above stays a direct child. */}
      <HoverPreviewProvider className="flex flex-1 flex-col">
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
      ) : resolvedView === null ? (
        // The first visit, before hydration: both views, CSS picks one at the same 768px the
        // default reads. The grid copy may be hidden, so its eager tiles are lazy too
        // (`mayBeHidden`), or a phone downloads a screen of art it never shows.
        <>
          <div className="hidden md:block">
            <GridView cards={windowed} totalCards={sorted.length} onShowMore={showMore} revealFrom={revealFrom} onOpen={onOpen} pendingOracleId={pendingOracleId} busy={!complete} showPrice={sort === "price"} mayBeHidden />
          </div>
          <div className="md:hidden">
            <RowsView cards={windowed} totalCards={sorted.length} onShowMore={showMore} revealFrom={revealFrom} onOpen={onOpen} pendingOracleId={pendingOracleId} busy={!complete} showPrice={sort === "price"} />
          </div>
        </>
      ) : resolvedView === "rows" ? (
        <RowsView cards={windowed} totalCards={sorted.length} onShowMore={showMore} revealFrom={revealFrom} onOpen={onOpen} pendingOracleId={pendingOracleId} busy={!complete} showPrice={sort === "price"} />
      ) : (
        <GridView cards={windowed} totalCards={sorted.length} onShowMore={showMore} revealFrom={revealFrom} onOpen={onOpen} pendingOracleId={pendingOracleId} busy={!complete} showPrice={sort === "price"} />
      )}
      </HoverPreviewProvider>
    </>
  );
}
