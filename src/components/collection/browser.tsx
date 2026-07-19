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
import { FilterBar, useIsDesktop, type ViewMode } from "./filter-bar";
import { ChipRow } from "./chip-row";
import { RowsView } from "./rows-view";
import { GridView } from "./grid-view";
import { NoResults } from "./no-results";
import { CardModal } from "./card-modal";

const PAGE_SIZE = 200;
const SORT_KEYS = ["name", "quantity", "set", "rarity", "color"] as const satisfies readonly SortKey[];

function parseColors(param: string | null): string[] {
  if (!param) return [];
  return [...new Set(param.split("").filter((c) => "WUBRG".includes(c)))];
}

function serializeParams(filters: BrowseFilters, sort: SortKey, view: ViewMode | null, card: string | null): string {
  const p = new URLSearchParams();
  if (filters.search.trim()) p.set("q", filters.search.trim());
  if (filters.colors.length > 0) p.set("c", filters.colors.join(""));
  if (filters.type) p.set("t", filters.type);
  if (filters.setCode) p.set("s", filters.setCode);
  if (sort !== "name") p.set("sort", sort);
  if (view !== null) p.set("view", view);  // null = auto (no explicit choice) → omit
  if (card) p.set("card", card);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function CollectionBrowser({
  cards,
}: {
  cards: BrowseCard[];
}) {
  const router = useRouter();
  const search = useSearchParams();
  const isDesktop = useIsDesktop();

  const [filters, setFilters] = useState<BrowseFilters>(() => ({
    search: search.get("q") ?? "",
    colors: parseColors(search.get("c")),
    type: search.get("t"),
    setCode: search.get("s"),
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

  // Any filter/sort change resets the window — folded into the update
  // callbacks (not an effect) to avoid a cascading render.
  const updateFilters = useCallback((f: BrowseFilters) => {
    setFilters(f);
    setShown(PAGE_SIZE);
  }, []);
  const updateSort = useCallback((s: SortKey) => {
    setSort(s);
    setShown(PAGE_SIZE);
  }, []);

  const availableSetCodes = useMemo(() => {
    const s = new Set<string>();
    for (const c of cards) for (const sc of c.setCodes) s.add(sc);
    return [...s].sort();
  }, [cards]);

  const totalQuantity = useMemo(() => cards.reduce((sum, c) => sum + c.quantity, 0), [cards]);

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
        availableSetCodes={availableSetCodes}
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
            updateFilters({ search: "", colors: [], type: null, setCode: null });
            updateSort("name");
          }}
          onRemoveColor={(c) => updateFilters({ ...filters, colors: filters.colors.filter((x) => x !== c) })}
          onClearType={() => updateFilters({ ...filters, type: null })}
          onClearSet={() => updateFilters({ ...filters, setCode: null })}
          onClearSearch={() => updateFilters({ ...filters, search: "" })}
        />
      </div>

      {sorted.length === 0 ? (
        <NoResults
          query={filters.search}
          totalCount={totalQuantity}
          onClearAll={() => {
            updateFilters({ search: "", colors: [], type: null, setCode: null });
            updateSort("name");
          }}
          onKeepSearch={() => updateFilters({ search: filters.search, colors: [], type: null, setCode: null })}
        />
      ) : effectiveView === "rows" ? (
        <RowsView cards={windowed} totalCards={sorted.length} onShowMore={() => setShown(shown + PAGE_SIZE)} onOpen={onOpen} />
      ) : (
        <GridView cards={windowed} totalCards={sorted.length} onShowMore={() => setShown(shown + PAGE_SIZE)} onOpen={onOpen} />
      )}

      {openCard && (
        <CardModal
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
