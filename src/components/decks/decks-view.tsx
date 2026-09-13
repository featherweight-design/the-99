"use client";

// The Decks surface. The page authenticates and loads; this owns the filters,
// the order, and the URL that carries both.
//
// Filtering and sorting never navigate: the server already sent every deck, so
// a router call would refetch a list that has not changed. The URL is written
// with `history.replaceState` instead, which is what AGENTS.md's "Caching a
// list a reader flips between" asks for on a re-parameterised list.

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  DECK_SORT_KEY,
  DEFAULT_DECK_SORT,
  deckSortFromParams,
  isDeckSort,
  sortDecks,
  type DeckSort,
} from "../../lib/decks/sort";
import { useStoredView } from "../ui/use-stored-view";
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
import type { DeckFolderWithCount } from "../../lib/decks/folders";
import {
  ALL_DECKS,
  FOLDER_PARAM,
  UNFILED,
  narrowToShelf,
  shelfCounts,
  shelfFromParams,
  shelfToParam,
  shelfTotal,
  showsUnfiled,
  matchFolder,
  type Shelf,
} from "../../lib/decks/folder-view";
import { ImportDeckButton } from "./import-deck-button";
import { NewDeckButton } from "./new-deck-button";
import { SearchIcon } from "./search-icon";

export type DecksViewProps = {
  decks: DeckListItem[];
  /**
   * Every shelf this player has, in name order, with the deck count the server
   * read. The counts drawn on screen come from `shelfCounts` over the loaded
   * decks rather than from these rows — see the note there — but the LIST is
   * this: a folder holding no decks has no deck row to be named by.
   */
  folders: DeckFolderWithCount[];
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
const OWNED_PARAMS = ["status", "colour", "played", "q", "sort", FOLDER_PARAM];

/**
 * The shelf is a THIRD FIELD here and never a fifth on `DeckFilters` (handoff
 * decision 7). That is what makes `EMPTY_FILTERS`, `activeFilterCount`, the
 * `Filters` badge and `Clear all filters` unable to move it — by construction
 * rather than by care.
 */
/**
 * `sort` is null when the URL names no order — NOT "the default". The order has
 * three sources and they rank: the URL, then what this browser last chose, then
 * `lastPlayed`. Collapsing the first absence into the default would make the
 * stored preference unreachable, because the default serialises as an absence
 * and every apply would write one.
 */
type ViewState = { filters: DeckFilters; sort: DeckSort | null; shelf: Shelf };

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

export function DecksView({
  decks,
  folders,
  shopping,
  buildable,
  cards,
  now: nowIso,
}: DecksViewProps) {
  // Seeded from the URL, so a shared link paints filtered on the first frame
  // rather than painting everything and then correcting itself. Read through
  // `useSearchParams` rather than `window.location`, which the server render
  // does not have; every later read is in a callback, where `window` is safe.
  const search = useSearchParams();
  const [state, setState] = useState<ViewState>(() => ({
    ...filtersFromParams(search),
    // `filtersFromParams` answers with the default where the URL is silent, and
    // silence is the thing the stored preference needs to see. Read again.
    sort: deckSortFromParams(search.get("sort")),
    // Read against the folders that exist, so a stale or hand-edited id lands
    // on All decks rather than on an empty grid for a shelf that is not there.
    shelf: shelfFromParams(search, folders),
  }));

  // The order this browser last chose, kept across visits. It sits UNDER the URL
  // and OVER the default, which is `/collection`'s own rule for its view toggle
  // and for the same reason: a shared link carrying `?sort=` describes the list
  // its sender meant, and nothing a reader stored should overwrite that.
  //
  // The STORED value is never serialised. Arriving at a bare `/decks` and being
  // shown your own order leaves the address bar bare, so the URL still means
  // "somebody chose this here" — while pressing the control does write `?sort=`,
  // because that press IS a choice made here and it is what makes the list
  // shareable. Two different acts; only one touches the URL.
  //
  // The server snapshot is null, so the first paint is the URL's order or the
  // default and the stored one lands on the pass after. That is a visible flip
  // for a reader whose preference is not the default, and it is the honest one:
  // the server cannot know what this browser stores.
  const [storedSort, chooseSort] = useStoredView(DECK_SORT_KEY, isDeckSort);
  const sort = state.sort ?? storedSort ?? DEFAULT_DECK_SORT;
  const [sheet, setSheet] = useState<{
    open: boolean;
    focusSearch: boolean;
    /**
     * Set only when the breakpoint closed the sheet. `useDialogA11y` restores
     * focus to the trigger it opened from, and that trigger is removed in the
     * same commit as the sheet — so focus would land on `<body>`. The wide
     * form's search field is the nearest equivalent and takes it instead.
     */
    handOffFocus?: boolean;
  }>({
    open: false,
    focusSearch: false,
  });

  const apply = useCallback((next: ViewState) => {
    setState(next);
    // A null sort serialises as an absence, which is what `serializeDeckSort`
    // already does with the default — so the stored preference stays off the URL
    // while a filter click rewrites everything else.
    const params = filtersToParams(next.filters, next.sort ?? DEFAULT_DECK_SORT);
    // The shelf writes itself, beside the filters and never inside them.
    const folderValue = shelfToParam(next.shelf);
    if (folderValue !== null) params.set(FOLDER_PARAM, folderValue);
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
    (filters: DeckFilters) => apply({ filters, sort: state.sort, shelf: state.shelf }),
    [apply, state.sort, state.shelf],
  );
  const onSort = useCallback(
    (next: DeckSort) => {
      apply({ filters: state.filters, sort: next, shelf: state.shelf });
      chooseSort(next);
    },
    [apply, chooseSort, state.filters, state.shelf],
  );

  // Derived during render, never in an effect: an effect would paint the
  // previous list once before correcting it.
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const sorted = useMemo(() => sortDecks(decks, sort), [decks, sort]);
  // THE SHELF NARROWS FIRST, in the same client-side pass. Everything below —
  // the grid, the result line's denominator and the panels' per-option counts —
  // is measured against the shelf the reader is standing on, which is what
  // makes a status reading 0 mean "0 here" rather than "0 anywhere".
  const narrowed = useMemo(() => narrowToShelf(sorted, state.shelf), [sorted, state.shelf]);
  const shown = useMemo(
    () => filterDecks(narrowed, state.filters, now),
    [narrowed, state.filters, now],
  );
  // One map, feeding both the shelf line's segments and the result line's
  // denominator, so the two figures cannot drift apart. See `shelfCounts`.
  const counts = useMemo(() => shelfCounts(decks, folders), [decks, folders]);

  const active = activeFilterCount(state.filters);
  const zero = decks.length === 0;
  const chips = chipLabels(state.filters);
  // The chassis switches form on its own breakpoint, not Tailwind's — 1000px,
  // because `/collection`'s seven controls need 987 and the row must never wrap.
  const wide = useMinWidth(`(min-width: ${CHASSIS_WIDE_MIN_PX}px)`);

  // THE SELECTED SHELF CAN STOP EXISTING UNDER THE READER. A folder action
  // revalidates `/decks`, and the App Router can hand this client component new
  // server props without remounting it — so a deleted folder would leave
  // `state.shelf` naming an id that is no longer in `folders`, and the grid and
  // both denominators would read as an empty shelf rather than falling back.
  //
  // Adjusted during render rather than in an effect, the way the breakpoint
  // reconciliation below is: React re-runs this pass before touching the DOM, so
  // nothing paints against the missing shelf. The URL is rewritten too — left
  // alone it would restore the dead shelf on the next mount.
  //
  // `Unfiled` is in this too. It has no segment until the first folder exists
  // (`showsUnfiled`), so deleting the last folder while the reader stands on it
  // leaves a shelf that nothing on screen can show as selected — the same state
  // `shelfFromParams` refuses to read from a URL.
  const shelfMissing =
    state.shelf !== null
    && (state.shelf === UNFILED
      ? !showsUnfiled(folders)
      : !folders.some((f) => f.id === state.shelf));
  if (shelfMissing) setState({ ...state, shelf: ALL_DECKS });

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
    if (wide && sheet.open) setSheet({ open: false, focusSearch: false, handOffFocus: true });
    // Consumed on the way back. Left set, a later compact → wide resize would
    // autofocus the search field again without the reader ever opening the
    // sheet.
    else if (!wide && sheet.handOffFocus) setSheet({ ...sheet, handOffFocus: false });
  }

  // The URL half of that reconciliation, and the one part that belongs in an
  // effect: `replaceState` is a DOM write, not state, so it cannot happen during
  // render. Left undone, the dead `?folder=` would restore the vanished shelf on
  // the next mount.
  //
  // Keyed on the FOLDER LIST and measured against the live URL, not against
  // `shelfMissing`: the render-time reset above clears that flag before any
  // effect runs, so an effect watching it would never fire.
  useEffect(() => {
    const live = new URLSearchParams(window.location.search);
    const named = live.get(FOLDER_PARAM);
    // `null` rather than falsy: a bare `?folder=` is All decks to the parser and
    // has to leave the URL too, or a bookmark keeps a parameter that means the
    // absence of one.
    if (named === null) return;
    // `none` survives only while there is an `Unfiled` segment to select, and a
    // folder id matches whatever case it arrived in — the same rule the parser
    // reads it by.
    if (named === UNFILED ? showsUnfiled(folders) : matchFolder(folders, named) !== undefined) {
      return;
    }
    live.delete(FOLDER_PARAM);
    const query = live.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [folders]);

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
    const count = filterDecks(narrowed, { ...state.filters, statuses: [status] }, now).length;
    return {
      code: status,
      label: refreshCopy.status[STATUS_COPY_KEY[status]],
      count,
      disabled: count === 0 && !state.filters.statuses.includes(status),
    };
  });

  const playedOptions = (["thisMonth", "never"] as const).map((window) => {
    const count = filterDecks(narrowed, { ...state.filters, played: window }, now).length;
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
                      // Takes the focus the closing sheet could not return to
                      // its own trigger, which unmounts in the same commit.
                      autoFocus={sheet.handOffFocus}
                    />
                  </div>
                  <FilterPanel
                    desktopRowMinPx={44}
                    compact={!wide}
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
                    compact={!wide}
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
                // Compact keeps only search here; sort and Filters are the
                // trailing cluster, per STATES §156's `search · sort · Filters`.
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
              )
            }
            // Compact's persistent row is `search · sort · Filters`
            // (STATES §156), so the Filters trigger joins the trailing cluster
            // rather than preceding sort in the controls.
            sort={
              wide ? (
                <DeckSortMenu sort={sort} onChange={onSort} />
              ) : (
                <div className="flex items-center gap-[8px]">
                  <DeckSortMenu sort={sort} onChange={onSort} />
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
                </div>
              )
            }
            chips={chassisChips}
            onClearAll={() => onFilters(EMPTY_FILTERS)}
            // The denominator is the SHELF, not the library: with the library's
            // figure the line would describe a list the reader is not looking
            // at. It comes off the same map the segment above prints from.
            resultLine={deckChassisCopy.result(shown.length, shelfTotal(counts, state.shelf))}
            // The sheet is aria-modal and now carries its own region, so the
            // chassis's goes quiet while it is open rather than announcing the
            // same count from behind the modal.
            silentResult={!wide && sheet.open}
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
            // The SHELF's figure, the same one the chassis divides by — the
            // sheet prints `shown of total` in its header and announces it in
            // its own live region, so the library's count here would have the
            // modal saying one thing while the line behind it said another.
            total={shelfTotal(counts, state.shelf)}
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
                // Clears the FILTERS and keeps the shelf: the filtered empty
                // state is offered on a shelf the reader chose, and leaving it
                // is a different act with its own control.
                onClick={() =>
                  apply({ filters: EMPTY_FILTERS, sort: state.sort, shelf: state.shelf })
                }
                // Switches at the chassis breakpoint, not `sm:`. This sits
                // below the compact chassis at 640-999px, where `sm:h-[32px]`
                // would put it under the touch floor — the same mismatch the
                // sort trigger and the sheet both had.
                className="flex h-[44px] cursor-pointer items-center rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[14px] text-[14px] text-[color:var(--fg)] min-[1000px]:h-[32px] min-[1000px]:rounded-[8px] min-[1000px]:text-[12.5px]"
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
