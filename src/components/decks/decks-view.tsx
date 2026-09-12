"use client";

// The Decks surface. The page authenticates and loads; this owns the filters,
// the order, and the URL that carries both.
//
// Filtering and sorting never navigate: the server already sent every deck, so
// a router call would refetch a list that has not changed. The URL is written
// with `history.replaceState` instead, which is what AGENTS.md's "Caching a
// list a reader flips between" asks for on a re-parameterised list.

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { colorNames } from "../../lib/copy/color-labels";
import { refreshCopy } from "../../lib/copy/refresh";
import {
  COLOUR_ORDER,
  EMPTY_FILTERS,
  STATUS_ORDER,
  type PlayedWindow,
  activeFilterCount,
  filterDecks,
  filtersFromParams,
  filtersToParams,
  type DeckFilters,
} from "../../lib/decks/filter";
import type { StatusPill } from "../../lib/decks/status";
import type { DeckListItem } from "../../lib/decks/read";
import type { ShoppingRollup } from "../../lib/decks/shopping-rollup";
import { sortDecks, type DeckSort } from "../../lib/decks/sort";
import { CHASSIS_WIDE_MIN_PX } from "../ui/filter-chassis";
import { ColourPips } from "../ui/colour-pips";
import { FilterChassis, type FilterChip } from "../ui/filter-chassis";
import { FilterPanel } from "../ui/filter-panel";
import { useMinWidth } from "../ui/use-min-width";
import { deckChassisCopy } from "../../lib/copy/filter-chassis";
import { DeckCard } from "./deck-card";
import { PLAYED_LABEL, SearchField, STATUS_COPY_KEY, toggleIn } from "./deck-filter-column";
import { DeckFilterSheet } from "./deck-filter-sheet";
import { DeckSortMenu } from "./deck-sort-menu";
import { DecksZero } from "./decks-zero";
import { ImportDeckButton } from "./import-deck-button";
import { NewDeckButton } from "./new-deck-button";
import { SearchIcon } from "./search-icon";

export type DecksViewProps = {
  decks: DeckListItem[];
  shopping: ShoppingRollup;
  /** Commanders in the ready-to-build set. Only the zero state prints it. */
  buildable: number;
  /** Copies owned, not distinct names — the second half of `buildableFrom`. */
  cards: number;
  /**
   * The server's clock, as an ISO string. A `Date` prop does not survive the
   * server/client boundary intact, and every consumer here — `formatWhen`, the
   * `This month` predicate — wants the server's instant, not the browser's.
   */
  now: string;
};

/** The parameters this view owns. Everything else on the URL is left alone. */
const OWNED_PARAMS = ["status", "colour", "played", "q", "sort"];

type ViewState = { filters: DeckFilters; sort: DeckSort };

/** One removable chip per active value — a heading with two values has two. */
function chipLabels(filters: DeckFilters): { key: string; label: string; without: DeckFilters }[] {
  return [
    ...filters.statuses.map((status) => ({
      key: `status:${status}`,
      label: refreshCopy.status[STATUS_COPY_KEY[status]],
      without: { ...filters, statuses: filters.statuses.filter((s) => s !== status) },
    })),
    ...filters.colours.map((colour) => ({
      key: `colour:${colour}`,
      label: colorNames([colour])[0],
      without: { ...filters, colours: filters.colours.filter((c) => c !== colour) },
    })),
    ...(filters.played
      ? [
          {
            key: "played",
            label: PLAYED_LABEL[filters.played],
            without: { ...filters, played: null },
          },
        ]
      : []),
    // The search chip is labelled with the term itself: "Search" would name the
    // field rather than the filter, and the reader needs to see what is on.
    ...(filters.search.trim()
      ? [{ key: "q", label: filters.search.trim(), without: { ...filters, search: "" } }]
      : []),
  ];
}

export function DecksView({ decks, shopping, buildable, cards, now: nowIso }: DecksViewProps) {
  // Seeded from the URL, so a shared link paints filtered on the first frame
  // rather than painting everything and then correcting itself. Read through
  // `useSearchParams` rather than `window.location`, which the server render
  // does not have; every later read is in a callback, where `window` is safe.
  const search = useSearchParams();
  const [state, setState] = useState<ViewState>(() => filtersFromParams(search));
  const [sheet, setSheet] = useState<{ open: boolean; focusSearch: boolean }>({
    open: false,
    focusSearch: false,
  });

  const apply = useCallback((next: ViewState) => {
    setState(next);
    const params = filtersToParams(next.filters, next.sort);
    // Every parameter this view does not own is read back off the live URL and
    // preserved — `?select=` rides in from the synergy picks and must survive a
    // filter click.
    const live = new URLSearchParams(window.location.search);
    for (const key of OWNED_PARAMS) live.delete(key);
    for (const [key, value] of params) live.set(key, value);
    const query = live.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, []);

  const onFilters = useCallback(
    (filters: DeckFilters) => apply({ filters, sort: state.sort }),
    [apply, state.sort],
  );
  const onSort = useCallback(
    (sort: DeckSort) => apply({ filters: state.filters, sort }),
    [apply, state.filters],
  );

  // Derived during render, never in an effect: an effect would paint the
  // previous list once before correcting it.
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const sorted = useMemo(() => sortDecks(decks, state.sort), [decks, state.sort]);
  const shown = useMemo(
    () => filterDecks(sorted, state.filters, now),
    [sorted, state.filters, now],
  );

  const active = activeFilterCount(state.filters);
  const zero = decks.length === 0;
  const chips = chipLabels(state.filters);
  // The chassis switches form on its own breakpoint, not Tailwind's — 1000px,
  // because `/collection`'s seven controls need 987 and the row must never wrap.
  const wide = useMinWidth(`(min-width: ${CHASSIS_WIDE_MIN_PX}px)`);

  // Crossing to wide unmounts the sheet but would leave `open` true, so
  // crossing back would remount it already open — a modal the reader never
  // asked for, with the search field stealing focus on the way in.
  //
  // Adjusted during render rather than in an effect: React re-runs this pass
  // before touching the DOM, so nothing paints with the stale value, and an
  // effect that calls setState is what this repo's lint rejects as a cascading
  // render.
  const [wasWide, setWasWide] = useState(wide);
  if (wasWide !== wide) {
    setWasWide(wide);
    if (wide && sheet.open) setSheet({ open: false, focusSearch: false });
  }

  // `chipLabels` already knows how to remove one value; the chassis only needs
  // the label and the callback, so this is a shape change rather than a second
  // source of truth about what is on.
  const chassisChips: FilterChip[] = chips.map((chip) => ({
    key: chip.key,
    label: chip.label,
    onRemove: () => onFilters(chip.without),
  }));

  // Counts are what survives the OTHER active filters, which is what makes a
  // zero meaningful: a status showing 0 would return nothing *given the colours
  // already on*, rather than being a status no deck has ever had.
  const statusOptions = STATUS_ORDER.map((status) => {
    const count = filterDecks(sorted, { ...state.filters, statuses: [status] }, now).length;
    return {
      code: status,
      label: refreshCopy.status[STATUS_COPY_KEY[status]],
      count,
      disabled: count === 0 && !state.filters.statuses.includes(status),
    };
  });

  const playedOptions = (["thisMonth", "never"] as const).map((window) => {
    const count = filterDecks(sorted, { ...state.filters, played: window }, now).length;
    return {
      code: window,
      label: PLAYED_LABEL[window],
      count,
      disabled: count === 0 && state.filters.played !== window,
    };
  });

  return (
    <div className="flex min-w-0 flex-auto flex-col bg-[color:var(--bg)] font-sans text-[color:var(--fg)]">
      <header className="flex items-center gap-[10px] px-[16px] pt-[16px] pb-0 sm:gap-[12px] sm:border-x-0 sm:border-t-0 sm:border-b sm:border-solid sm:border-b-[color:var(--border)] sm:px-[22px] sm:pb-[16px]">
        <h1 className="m-0 font-display text-[22px] font-bold text-[color:var(--fg)] sm:text-[20px]">
          {refreshCopy.decks.title}
        </h1>
        {/* The count and the grid are one statement: this figure is the number
            of tiles rendered, and if they disagree the count is the bug. */}
        <div className="flex-auto" />

        {/* Both survive every state, zero included: the toolbar does not change
            shape between empty and populated (README decision 6). Desktop only
            here — the phone pair is the full-width row below. */}
        <div className="hidden sm:flex sm:items-center sm:gap-[10px]">
          <ImportDeckButton />
          <NewDeckButton />
        </div>
      </header>

      <div className="flex gap-[8px] px-[16px] pt-[12px] pb-0 sm:hidden">
        <NewDeckButton />
        <ImportDeckButton />
      </div>

      {zero ? (
        <DecksZero buildable={buildable} cards={cards} />
      ) : (
        <div className="flex min-h-0 flex-auto flex-col">
          <FilterChassis
            form={wide ? "wide" : "compact"}
            controls={
              wide ? (
                <>
                  {/* Search leads, and is the only control allowed to shrink —
                      `min-w-0` on the chassis's leading group is what lets it. */}
                  <div className="min-w-0 flex-auto">
                    <SearchField
                      value={state.filters.search}
                      onChange={(search) => onFilters({ ...state.filters, search })}
                      size="column"
                    />
                  </div>
                  <FilterPanel
                    desktopRowMinPx={44}
                    copy={deckChassisCopy.status}
                    options={statusOptions}
                    selected={state.filters.statuses}
                    onToggle={(code) =>
                      onFilters({
                        ...state.filters,
                        statuses: toggleIn(STATUS_ORDER, state.filters.statuses, code as StatusPill),
                      })
                    }
                    onClear={() => onFilters({ ...state.filters, statuses: [] })}
                    widthPx={280}
                    footerStatus={false}
                  />
                  <ColourPips
                    form="wide"
                    value={state.filters.colours}
                    onToggle={(code) =>
                      onFilters({
                        ...state.filters,
                        colours: toggleIn(COLOUR_ORDER, state.filters.colours, code),
                      })
                    }
                  />
                  <FilterPanel
                    desktopRowMinPx={44}
                    copy={deckChassisCopy.played}
                    options={playedOptions}
                    selected={state.filters.played ? [state.filters.played] : []}
                    onToggle={(code) =>
                      onFilters({
                        ...state.filters,
                        played: state.filters.played === code ? null : (code as PlayedWindow),
                      })
                    }
                    onClear={() => onFilters({ ...state.filters, played: null })}
                    widthPx={280}
                    footerStatus={false}
                  />
                </>
              ) : (
                // Compact puts every dimension in the sheet, which is the one
                // control the row keeps. `DeckFilterSheet` already draws them.
                <>
                  {/* The search affordance the old phone header carried. It
                      opens the same sheet with the field focused, because a
                      full field cannot share 390px with a filter trigger and a
                      sort trigger without one of them wrapping — which
                      decision 18 forbids outright. */}
                  <button
                    type="button"
                    onClick={() => setSheet({ open: true, focusSearch: true })}
                    aria-label={refreshCopy.filters.searchPlaceholder}
                    aria-haspopup="dialog"
                    aria-expanded={sheet.open}
                    className="flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center rounded-[9px] border border-solid border-[color:var(--border-strong)] bg-transparent p-0 text-[color:var(--fg-body)]"
                  >
                    <SearchIcon size={16} />
                  </button>
                <button
                  type="button"
                  onClick={() => setSheet({ open: true, focusSearch: false })}
                  aria-haspopup="dialog"
                  aria-expanded={sheet.open}
                  className={`flex h-[44px] cursor-pointer items-center gap-[7px] rounded-[9px] border border-solid bg-transparent px-[12px] font-sans text-[13px] ${
                    active > 0
                      ? "border-[color:var(--accent)] text-[color:var(--fg)]"
                      : "border-[color:var(--border-strong)] text-[color:var(--fg-body)]"
                  }`}
                >
                  {refreshCopy.filters.sheetTitle}
                  {active > 0 && (
                    <span className="rounded-[4px] bg-[color:var(--accent)] px-[5px] py-[1px] font-mono text-[10px] text-[color:var(--bg)]">
                      {refreshCopy.filters.triggerBadge(active)}
                    </span>
                  )}
                </button>
                </>
              )
            }
            sort={<DeckSortMenu sort={state.sort} onChange={onSort} />}
            chips={chassisChips}
            onClearAll={() => onFilters(EMPTY_FILTERS)}
            resultLine={deckChassisCopy.result(shown.length, decks.length)}
            after={
              /* Unmounted when wide, never merely hidden. Resizing from compact
                 to wide with the sheet open would otherwise leave an
                 `aria-modal` dialog holding the scroll lock and the focus trap
                 with nothing on screen to close it. */
              !wide && (
          <DeckFilterSheet
            filters={state.filters}
            onChange={onFilters}
            shown={shown.length}
            total={decks.length}
            open={sheet.open}
            onDismiss={() => setSheet({ open: false, focusSearch: false })}
            autoFocusSearch={sheet.focusSearch}
          />
              )
            }
          />

          {shown.length === 0 ? (
            // No mark and no body copy: the zero state offers two routes in,
            // and this one offers the single route out of a filter the reader
            // set themselves. Conflating them makes an empty grid read as a
            // broken app.
            <div className="flex min-h-0 flex-auto flex-col items-center justify-center gap-[14px] px-[22px] py-[40px] text-center">
              <h2 className="m-0 font-display text-[20px] font-bold text-[color:var(--fg)]">
                {refreshCopy.filters.emptyHeading}
              </h2>
              <button
                type="button"
                onClick={() => apply({ filters: EMPTY_FILTERS, sort: state.sort })}
                className="flex h-[44px] cursor-pointer items-center rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[14px] text-[14px] text-[color:var(--fg)] sm:h-[32px] sm:rounded-[8px] sm:text-[12.5px]"
              >
                {refreshCopy.filters.emptyAction}
              </button>
            </div>
          ) : (
            <ul className="m-0 flex min-h-0 min-w-0 flex-auto list-none flex-col gap-[12px] px-[16px] pt-[14px] pb-0 sm:grid sm:grid-cols-3 sm:content-start sm:gap-[14px] sm:p-[18px_22px]">
              {shown.map((deck) => (
                <li key={deck.id} className="flex-none">
                  <DeckCard deck={deck} shopping={shopping.byDeck.get(deck.id)} now={now} />
                </li>
              ))}
            </ul>
          )}

        </div>
      )}
    </div>
  );
}
