"use client";
// Top-level collection browse client component.
// Owns filter/sort/view/window/modal state, mirrors to URL query params
// (?q= &c= &t= &s= &sort= &dir= &view= &card=) via router.replace shallow so
// chips + view + open card deep-link (READINESS #6).

import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_SORT_DIRECTION,
  filterCards,
  sortCards,
  type BrowseCard,
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
import type { AvailabilityState } from "../../lib/decks/availability";
import { collectionFilterCopy, type FilterPanelCopy } from "../../lib/copy/collection";
import { FilterBar, useIsDesktop, type FilterChangeIntent, type ViewMode } from "./filter-bar";
import { ChipRow } from "./chip-row";
import { RowsView } from "./rows-view";
import { GridView } from "./grid-view";
import { NoResults } from "./no-results";
import { CardModal } from "../cards/card-modal";

const PAGE_SIZE = 200;

function parseColors(param: string | null): string[] {
  if (!param) return [];
  return [...new Set(param.toUpperCase().split("").filter((c) => "WUBRG".includes(c)))];
}

function serializeParams(
  filters: BrowseFilters,
  sort: SortKey,
  direction: SortDirection,
  view: ViewMode | null,
  card: string | null,
): string {
  const p = new URLSearchParams();
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
function quantityOf(list: BrowseCard[]): number {
  return list.reduce((sum, c) => sum + c.quantity, 0);
}

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
  cards: BrowseCard[],
  options: { code: string; label: string }[],
  totalQuantity: number,
): string | null {
  if (before.length === after.length && before.every((c, i) => c === after[i])) return null;
  const total = totalQuantity.toLocaleString();
  // Always the cleared string for `Clear`, including at exactly one selection —
  // "Bloomburrow removed. No set filter, …" belongs to toggling the last option
  // off, not to pressing the button.
  if (cleared) return copy.announceCleared(total);
  const label = (code: string) => options.find((o) => o.code === code)?.label ?? code;
  const shown = quantityOf(filterCards(cards, next)).toLocaleString();
  const added = after.find((c) => !before.includes(c));
  if (added !== undefined) return copy.announceAdded(label(added), after.length, shown, total);
  const removed = before.find((c) => !after.includes(c));
  if (removed !== undefined) {
    return copy.announceRemoved(label(removed), after.length, shown, total);
  }
  return null;
}

/** The live-region string for a change to the set selection. */
export function setChangeAnnouncement(
  prev: BrowseFilters,
  next: BrowseFilters,
  cards: BrowseCard[],
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
  cards: BrowseCard[],
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
  cards: BrowseCard[],
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
  cards: BrowseCard[],
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
}: {
  cards: BrowseCard[];
  /** `sets` catalog rows for the sets this user owns — names + release dates. */
  ownedSets: OwnedSetMeta[];
  /**
   * False when the page's availability read failed. `/collection` fails quiet:
   * the markers are simply absent and the filter trigger is disabled with a
   * reason. No banner (Addendum 2, implementation notes).
   */
  availabilityOk: boolean;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const isDesktop = useIsDesktop();

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
    return v === "rows" || v === "grid" ? v : null;
  });
  const effectiveView: ViewMode = view ?? (isDesktop ? "grid" : "rows");
  const [openCardId, setOpenCardId] = useState<string | null>(() => search.get("card"));
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

  // Chips read set NAMES, not codes — the locked "names over codes" decision.
  const setLabels = useMemo(
    () => Object.fromEntries(setOptions.map((o) => [o.code, o.label])),
    [setOptions],
  );

  const [announcement, setAnnouncement] = useState("");

  // Any filter/sort change resets the window — folded into the update
  // callbacks (not an effect) to avoid a cascading render.
  const updateFilters = useCallback(
    (f: BrowseFilters, intent?: FilterChangeIntent) => {
      // The panels' add/remove/clear announcements are composed here rather than
      // in the panel: only this component knows how many cards survive the new
      // filter set, and the string quotes that figure. At most one of the two
      // selections moves per change, so the first non-null wins outright.
      const message =
        setChangeAnnouncement(filters, f, cards, setOptions, totalQuantity, intent) ??
        typeChangeAnnouncement(filters, f, cards, typeOptions, totalQuantity, intent) ??
        colorChangeAnnouncement(filters, f, cards, colorOptions, totalQuantity, intent) ??
        availabilityChangeAnnouncement(
          filters, f, cards, availabilityOptions, totalQuantity, intent,
        );
      if (message) setAnnouncement(message);
      setFilters(f);
      setShown(PAGE_SIZE);
    },
    [filters, cards, setOptions, typeOptions, colorOptions, availabilityOptions, totalQuantity],
  );
  const updateSort = useCallback((s: SortKey, direction: SortDirection) => {
    setSort(s);
    setSortDirection(direction);
    setShown(PAGE_SIZE);
  }, []);

  const filtered = useMemo(() => filterCards(cards, filters), [cards, filters]);
  const sorted = useMemo(() => sortCards(filtered, sort, sortDirection), [filtered, sort, sortDirection]);
  const windowed = useMemo(() => sorted.slice(0, shown), [sorted, shown]);

  const openCard = useMemo(
    () => (openCardId ? sorted.find((c) => c.oracleId === openCardId) ?? null : null),
    [openCardId, sorted],
  );

  // Push state → URL. Shallow via router.replace so it doesn't refetch the RSC.
  // Serialize the card param only when the card actually resolved; avoids
  // stale ?card= for IDs not in the current filtered result set.
  useEffect(() => {
    const qs = serializeParams(filters, sort, sortDirection, view, openCard ? openCardId : null);
    router.replace(`/collection${qs}`, { scroll: false });
  }, [filters, sort, sortDirection, view, openCardId, openCard, router]);
  const openIndex = useMemo(
    () => (openCard ? sorted.findIndex((c) => c.oracleId === openCard.oracleId) : -1),
    [openCard, sorted],
  );

  const onOpen = useCallback((id: string) => setOpenCardId(id), []);
  const onClose = useCallback(() => setOpenCardId(null), []);
  const onPrev = useCallback(() => {
    if (openIndex > 0) setOpenCardId(sorted[openIndex - 1].oracleId);
  }, [openIndex, sorted]);
  const onNext = useCallback(() => {
    if (openIndex >= 0 && openIndex < sorted.length - 1) setOpenCardId(sorted[openIndex + 1].oracleId);
  }, [openIndex, sorted]);

  return (
    <>
      <FilterBar
        filters={filters}
        sort={sort}
        view={effectiveView}
        setOptions={setOptions}
        typeOptions={typeOptions}
        availabilityOptions={availabilityOptions}
        availabilityOk={availabilityOk}
        announcement={announcement}
        onAnnounce={setAnnouncement}
        onFiltersChange={updateFilters}
        sortDirection={sortDirection}
        colorOptions={colorOptions}
        onSortChange={updateSort}
        onViewChange={setView}
      />
      <div className="px-[16px] md:px-[34px]">
        <ChipRow
          filters={filters}
          sort={sort}
          resultCount={sorted.length}
          uniqueCount={cards.length}
          totalQuantity={totalQuantity}
          onClearAll={() => {
            updateFilters(
              { search: "", colors: [], types: [], setCodes: [], availability: [] },
              "clear-sets",
            );
            updateSort("name", DEFAULT_SORT_DIRECTION.name);
          }}
          onRemoveColor={(c) => updateFilters({ ...filters, colors: filters.colors.filter((x) => x !== c) })}
          onRemoveType={(t) =>
            updateFilters({ ...filters, types: filters.types.filter((x) => x !== t) })
          }
          setLabels={setLabels}
          onRemoveSet={(code) =>
            updateFilters({ ...filters, setCodes: filters.setCodes.filter((c) => c !== code) })
          }
          onClearSearch={() => updateFilters({ ...filters, search: "" })}
          onRemoveAvailability={(state) =>
            updateFilters({
              ...filters,
              availability: (filters.availability ?? []).filter((s) => s !== state),
            })
          }
        />
      </div>

      {sorted.length === 0 ? (
        <NoResults
          query={filters.search}
          colors={filters.colors}
          totalCount={totalQuantity}
          onClearAll={() => {
            updateFilters(
              { search: "", colors: [], types: [], setCodes: [], availability: [] },
              "clear-sets",
            );
            updateSort("name", DEFAULT_SORT_DIRECTION.name);
          }}
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
        <RowsView cards={windowed} totalCards={sorted.length} onShowMore={() => setShown((s) => s + PAGE_SIZE)} onOpen={onOpen} />
      ) : (
        <GridView cards={windowed} totalCards={sorted.length} onShowMore={() => setShown((s) => s + PAGE_SIZE)} onOpen={onOpen} />
      )}

      {openCard && (
        <CardModal
          // Paging Prev/Next must not carry the previous card's expanded region or its
          // optimistic art pick across; remounting is cheaper than resetting both.
          key={openCard.oracleId}
          card={openCard}
          position={openIndex + 1}
          total={sorted.length}
          onClose={onClose}
          onPrev={openIndex > 0 ? onPrev : null}
          onNext={openIndex < sorted.length - 1 ? onNext : null}
        />
      )}
    </>
  );
}
