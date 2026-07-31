"use client";
// Top-level collection browse client component.
// Owns filter/sort/view/window/modal state, mirrors to URL query params
// (?q= &c= &t= &s= &sort= &view= &card=) via router.replace shallow so
// chips + view + open card deep-link (READINESS #6).

import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  filterCards,
  sortCards,
  type BrowseCard,
  type BrowseFilters,
  type SortKey,
} from "../../lib/collection/browse";
import {
  buildSetOptions,
  parseSetCodesParam,
  serializeSetCodes,
  type OwnedSetMeta,
} from "../../lib/collection/set-filter";
import { collectionFilterCopy } from "../../lib/copy/collection";
import { FilterBar, useIsDesktop, type FilterChangeIntent, type ViewMode } from "./filter-bar";
import { ChipRow } from "./chip-row";
import { RowsView } from "./rows-view";
import { GridView } from "./grid-view";
import { NoResults } from "./no-results";
import { CardModal } from "./card-modal";

const PAGE_SIZE = 200;
const SORT_KEYS = ["name", "quantity", "set", "rarity", "color"] as const satisfies readonly SortKey[];

function parseColors(param: string | null): string[] {
  if (!param) return [];
  return [...new Set(param.toUpperCase().split("").filter((c) => "WUBRG".includes(c)))];
}

function serializeParams(filters: BrowseFilters, sort: SortKey, view: ViewMode | null, card: string | null): string {
  const p = new URLSearchParams();
  if (filters.search.trim()) p.set("q", filters.search.trim());
  if (filters.colors.length > 0) p.set("c", filters.colors.join(""));
  if (filters.type) p.set("t", filters.type);
  // Comma-joined; a single bare code still parses, so pre-#86 links survive.
  if (filters.setCodes.length > 0) p.set("s", serializeSetCodes(filters.setCodes));
  if (sort !== "name") p.set("sort", sort);
  if (view !== null) p.set("view", view);  // null = auto (no explicit choice) → omit
  if (card) p.set("card", card);
  const s = p.toString();
  return s ? `?${s}` : "";
}

const setCopy = collectionFilterCopy.set;

/** Sum of quantities, i.e. the "2,933 cards" figure the announcements quote. */
function quantityOf(list: BrowseCard[]): number {
  return list.reduce((sum, c) => sum + c.quantity, 0);
}

/**
 * The live-region string for a change to the set selection, or null when the
 * selection did not move (a colour or type change announces nothing here).
 */
export function setChangeAnnouncement(
  prev: BrowseFilters,
  next: BrowseFilters,
  cards: BrowseCard[],
  options: { code: string; label: string }[],
  totalQuantity: number,
  intent?: FilterChangeIntent,
): string | null {
  const before = prev.setCodes;
  const after = next.setCodes;
  if (before.length === after.length && before.every((c, i) => c === after[i])) return null;
  const total = totalQuantity.toLocaleString();
  // Always the cleared string for `Clear`, including at exactly one selection —
  // "Bloomburrow removed. No set filter, …" belongs to toggling the last option
  // off, not to pressing the button.
  if (intent === "clear-sets") return setCopy.announceCleared(total);
  const label = (code: string) => options.find((o) => o.code === code)?.label ?? code;
  const shown = quantityOf(filterCards(cards, next)).toLocaleString();
  const added = after.find((c) => !before.includes(c));
  if (added !== undefined) return setCopy.announceAdded(label(added), after.length, shown, total);
  const removed = before.find((c) => !after.includes(c));
  if (removed !== undefined) {
    return setCopy.announceRemoved(label(removed), after.length, shown, total);
  }
  return null;
}

export function CollectionBrowser({
  cards,
  ownedSets,
}: {
  cards: BrowseCard[];
  /** `sets` catalog rows for the sets this user owns — names + release dates. */
  ownedSets: OwnedSetMeta[];
}) {
  const router = useRouter();
  const search = useSearchParams();
  const isDesktop = useIsDesktop();

  const [filters, setFilters] = useState<BrowseFilters>(() => ({
    search: search.get("q") ?? "",
    colors: parseColors(search.get("c")),
    type: search.get("t"),
    setCodes: parseSetCodesParam(search.get("s")),
  }));
  // Guard query params — shared URLs can carry unknown values; fall back to defaults.
  const [sort, setSort] = useState<SortKey>(() => {
    const s = search.get("sort");
    return s !== null && (SORT_KEYS as readonly string[]).includes(s) ? (s as SortKey) : "name";
  });
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
  // Depends on the two fields buildSetOptions actually reads, not on `filters` —
  // that object is rebuilt on every keystroke, which would recount the lot. The
  // spreads preserve `colors`' array identity, so it is a sound dep as-is.
  const { colors: filterColors, type: filterType } = filters;
  const setOptions = useMemo(
    () =>
      buildSetOptions(
        cards,
        { search: "", colors: filterColors, type: filterType, setCodes: [] },
        ownedSets,
      ),
    [cards, filterColors, filterType, ownedSets],
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
      // The set panel's add/remove/clear announcements are composed here rather
      // than in the panel: only this component knows how many cards survive the
      // new filter set, and the string quotes that figure.
      const message = setChangeAnnouncement(filters, f, cards, setOptions, totalQuantity, intent);
      if (message) setAnnouncement(message);
      setFilters(f);
      setShown(PAGE_SIZE);
    },
    [filters, cards, setOptions, totalQuantity],
  );
  const updateSort = useCallback((s: SortKey) => {
    setSort(s);
    setShown(PAGE_SIZE);
  }, []);

  const filtered = useMemo(() => filterCards(cards, filters), [cards, filters]);
  const sorted = useMemo(() => sortCards(filtered, sort), [filtered, sort]);
  const windowed = useMemo(() => sorted.slice(0, shown), [sorted, shown]);

  const openCard = useMemo(
    () => (openCardId ? sorted.find((c) => c.oracleId === openCardId) ?? null : null),
    [openCardId, sorted],
  );

  // Push state → URL. Shallow via router.replace so it doesn't refetch the RSC.
  // Serialize the card param only when the card actually resolved; avoids
  // stale ?card= for IDs not in the current filtered result set.
  useEffect(() => {
    const qs = serializeParams(filters, sort, view, openCard ? openCardId : null);
    router.replace(`/collection${qs}`, { scroll: false });
  }, [filters, sort, view, openCardId, openCard, router]);
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
        announcement={announcement}
        onAnnounce={setAnnouncement}
        onFiltersChange={updateFilters}
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
            updateFilters({ search: "", colors: [], type: null, setCodes: [] }, "clear-sets");
            updateSort("name");
          }}
          onRemoveColor={(c) => updateFilters({ ...filters, colors: filters.colors.filter((x) => x !== c) })}
          onClearType={() => updateFilters({ ...filters, type: null })}
          setLabels={setLabels}
          onRemoveSet={(code) =>
            updateFilters({ ...filters, setCodes: filters.setCodes.filter((c) => c !== code) })
          }
          onClearSearch={() => updateFilters({ ...filters, search: "" })}
        />
      </div>

      {sorted.length === 0 ? (
        <NoResults
          query={filters.search}
          totalCount={totalQuantity}
          onClearAll={() => {
            updateFilters({ search: "", colors: [], type: null, setCodes: [] }, "clear-sets");
            updateSort("name");
          }}
          onKeepSearch={() => updateFilters({ search: filters.search, colors: [], type: null, setCodes: [] })}
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
