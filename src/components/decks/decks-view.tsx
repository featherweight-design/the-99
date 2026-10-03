"use client";

// The Decks surface. The page authenticates and loads; this owns the filters,
// the order, and the URL that carries both.
//
// Filtering and sorting never navigate: the server already sent every deck, so
// a router call would refetch a list that has not changed. The URL is written
// with `history.replaceState` instead, which is what AGENTS.md's "Caching a
// list a reader flips between" asks for on a re-parameterised list.

import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { colorNames } from "../../lib/copy/color-labels";
import { refreshCopy } from "../../lib/copy/refresh";
import {
  COLOUR_ORDER,
  EMPTY_FILTERS,
  STATE_ORDER,
  STATUS_ORDER,
  type DeckState,
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
import { useLiveQuery } from "../../lib/commanders/live-query";
import { CHASSIS_WIDE_MIN_PX } from "../ui/filter-chassis";
import { ColourPips } from "../ui/colour-pips";
import { FilterChassis, type FilterChip } from "../ui/filter-chassis";
import { FilterPanel } from "../ui/filter-panel";
import { useMinWidth } from "../ui/use-min-width";
import { deckChassisCopy } from "../../lib/copy/filter-chassis";
import { DeckCard } from "./deck-card";
import { PLAYED_LABEL, SearchField, STATE_LABEL, STATUS_COPY_KEY, toggleIn } from "./deck-filter-column";
import { DeckFilterSheet } from "./deck-filter-sheet";
import { DeckSortMenu } from "./deck-sort-menu";
import { DecksZero } from "./decks-zero";
import { ShelfLine, ShelfTrigger, shelfSegments } from "./shelf-line";
import { ShelfMenu } from "./shelf-menu";
import { ShelfSheet } from "./shelf-sheet";
import { ShelfEmpty, UnfiledEmpty } from "./shelf-empty";
import { FolderCreateDialog } from "./folder-create-dialog";
import { createFolderAction, moveDeckAction } from "../../app/decks/folder-actions";
import { folderCopy } from "../../lib/copy/folders";
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
import { DecksMarkKey } from "./decks-mark-key";
import { mirrorUrl } from "../../lib/url/mirror";

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
// Every parameter `filtersToParams` can WRITE has to be listed here, or
// unticking its last value leaves the old one stranded: the live URL is cleared
// of these and then re-set from the serialiser, so a key missing from this list
// is never cleared and never overwritten. `state` was exactly that miss, caught
// by a chip-removal case rather than by reading.
const OWNED_PARAMS = ["status", "state", "colour", "played", "q", "sort", FOLDER_PARAM];

/**
 * The shelf is a field of THIS state and never one of `DeckFilters` (handoff
 * decision 7). That is what makes `EMPTY_FILTERS`, `activeFilterCount`, the
 * `Filters` badge and `Clear all filters` unable to move it — by construction
 * rather than by care.
 *
 * Stated as a boundary rather than as a count: the note used to say "never a
 * fifth", which the deck-state facet made false by adding `states` beside the
 * four that were there. The rule was never about how many there are.
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
    ...filters.states.map((code) => ({
      key: `state:${code}`,
      label: STATE_LABEL[code],
      without: { ...filters, states: filters.states.filter((s) => s !== code) },
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
  decks: serverDecks,
  folders: serverFolders,
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
    // The SERVER's folders: this runs once, at mount, before anything local
    // exists to merge in.
    shelf: shelfFromParams(search, serverFolders),
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

  /**
   * THE URL IS RE-READ WHEN IT CHANGES, through the repo's own observer.
   *
   * The seed above runs once, which was enough while the URL and this state
   * could only disagree through this view's writes. They disagree the other way
   * too: the shell's `Decks` link clears the query without unmounting anything,
   * so a reader who chose `Newest` kept it while the address bar said nothing —
   * and, now that an absence means "follow what this browser stored", kept it
   * over their own stored order.
   *
   * `useLiveQuery`, not `useSearchParams`. Built for exactly this and already
   * shipped for the commander lanes: it subscribes to `popstate`, to the
   * Navigation API where there is one, and to `history.pushState` /
   * `replaceState` where there is not. `useSearchParams` is not reliably
   * notified for a same-document navigation, and it does not hear this view's
   * own `replaceState` at all — which is what made a first attempt at this
   * reconcile from a stale query and undo the choice just made.
   *
   * EVERY parameter this view owns, not just the sort — `status`, `state`,
   * `colour`, `played`, `q` and `sort`, which is what `OWNED_PARAMS` lists.
   * Reconciling one would give this view two rules for two halves of its own
   * state, and the same navigation leaves a status filter on with a bare URL.
   * Named rather than counted: the count was five until the deck-state facet
   * made it six, and a number in prose goes stale the moment a facet lands.
   *
   * `apply` records the query it writes, so this view's own write agrees on the
   * next render and nothing re-parses. It would be harmless if it did — the
   * parse of what `apply` just serialised is the state `apply` just set — but a
   * re-render per filter click for no change is still a re-render.
   *
   * During render rather than in an effect: an effect paints the previous list
   * once and then corrects it, which is the cascading-render pattern this repo's
   * lint rejects. State rather than a ref, because a ref read during render is
   * what the lint rejects next, and React documents this shape as adjusting
   * state on a changed input.
   */
  const liveQuery = useLiveQuery(search.toString());
  const [seenQuery, setSeenQuery] = useState(liveQuery);
  const reconciling = liveQuery !== seenQuery;
  if (reconciling) {
    const live = new URLSearchParams(liveQuery);
    setSeenQuery(liveQuery);
    setState({
      ...filtersFromParams(live),
      sort: deckSortFromParams(live.get("sort")),
      // The SERVER's folders: this reconciliation can run before the merged
      // list below exists, and a folder made a moment ago is on the URL only if
      // this view put it there.
      shelf: shelfFromParams(live, serverFolders),
    });
  }

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

  /**
   * `handOff` mirrors the filter sheet's own flag: crossing to wide unmounts the
   * trigger `useDialogA11y` would return focus to, so focus would land on the
   * body. It is set where the sheet is closed and cleared on the way back, in
   * the same render-time reconciliation — never in the effect that consumes it.
   */
  const [shelfSheet, setShelfSheet] = useState<{ open: boolean; handOff?: boolean }>({
    open: false,
  });
  /**
   * The deck whose move panel opened the create dialog. `New folder…` is on that
   * list so the destination can be made FROM THE ACT (handoff decision 16) — so
   * the deck is filed into the folder it just made, rather than being left
   * unfiled while the page walks off to the new empty shelf.
   */
  // Held for ONE path only — a move whose action rejected, where the server may
  // have committed with its response lost. Every other outcome arrives through
  // that action's own `revalidatePath`, and refreshing on top of it fetched an
  // expensive route twice per write.
  const router = useRouter();
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  // Which card's overflow panel a finished create-from-move should close, and a
  // sequence so a second create on the same card closes it again.
  // Set when a create came from a card's move panel and that card survives, so
  // the dialog's own focus rescue stands down and lets the panel place focus.
  const panelTakesFocus = useRef(false);
  const [createFiled, setCreateFiled] = useState<{
    deckId: string;
    seq: number;
  } | null>(null);
  /**
   * The deck a create just filed, held until the dialog is dismissed. The panel
   * is told in the SAME commit that unmounts the dialog, because the dialog's
   * trap returns focus into that panel as it goes: told any earlier, the panel
   * could close first and take the restored focus with it to the body. The move
   * no longer holds the create open for a round trip, so nothing else orders
   * the two.
   */
  const filedOnDismiss = useRef<string | null>(null);

  const [creating, setCreating] = useState(false);
  /**
   * The folder this reader just made, held until the refreshed payload carries
   * it. Without it the create flow eats itself: `onShelf` selects an id that is
   * not in `folders` yet, and the missing-shelf reconciliation below reads that
   * as a deleted folder and drops the reader back on All decks — instead of the
   * shelf the create dialog just made.
   */
  const [justMade, setJustMade] = useState<
    (DeckFolderWithCount & { against: readonly DeckFolderWithCount[] }) | null
  >(null);

  /**
   * THERE IS NO CLIENT REFRESH IN THIS ROUND, and that is deliberate.
   *
   * Every folder action calls `revalidatePath("/decks")`, and a Server Action
   * that revalidates the route it was called from already sends the updated RSC
   * payload back with its own response. Calling `router.refresh()` on top asked
   * for the same expensive route a SECOND time — measured at two round trips per
   * write against one — and that extra fetch is what could land as the route's
   * `loading.tsx` flashing between the filters and the decks.
   *
   * Proved rather than assumed: `scripts/probe-folder-flash.mjs` files, unfiles,
   * renames and deletes against a real browser, asserts the segment's count and
   * the renamed and deleted shelves, and counts both round trips and document
   * loads.
   *
   * `justMade` still earns its place: the action's payload arrives a moment
   * after the dialog closes, and without it the new segment would appear a beat
   * late.
   */

  /**
   * THE ONE ANSWER TO "WHAT I WAS STANDING ON IS GONE". Three paths can remove
   * the focused control out from under a keyboard reader — a move that takes the
   * card off the shelf being viewed, a create from inside a menu on that card,
   * and the breakpoint closing the sheet — and each of them leaves focus on the
   * body. The shelf control is the one thing on screen in all three, at either
   * width, so it is where focus goes rather than three separate rescues.
   */
  const focusShelfControl = useCallback(() => {
    const target =
      document.querySelector<HTMLElement>("[data-shelf-line] button[aria-current='true']")
      ?? document.querySelector<HTMLElement>("[data-shelf-trigger] button");
    target?.focus();
  }, []);

  /**
   * The shelf announcement lives HERE, not in the sheet, because the sheet
   * unmounts on selection and a region removed in the same commit as its text
   * is never read. The chassis's own result line is silent while the sheet is
   * open and cannot cover this either.
   */
  /**
   * The sentence AND a sequence. Two moves into the same folder produce the
   * same words, and a live region whose text does not change is not re-read —
   * so the second receipt would be silent. The key remounts the region, which
   * is what makes an identical sentence a new announcement.
   */
  const [shelfSaid, setShelfSaid] = useState({ text: "", n: 0 });
  const say = useCallback(
    (text: string) => setShelfSaid((prev) => ({ text, n: prev.n + 1 })),
    [],
  );

  /**
   * THE MOVE IS OPTIMISTIC (Hugh's walk, H24): the deck takes its new shelf on
   * the press, and the grid, the shelf counts and both denominators move with
   * it, because every one of them is derived from this list rather than from
   * the server's. Waiting on the action left the deck on its old shelf for a
   * round trip after the menu had closed.
   *
   * The override is dispatched inside the move's transition, which for a
   * revalidating server action ends when the new payload lands. On success the
   * payload agrees and nothing repaints; on a refusal React drops the override
   * and the deck goes back to the shelf the server names, with no explicit
   * revert. The pattern `optimistic-deck.tsx` uses for the decklist.
   */
  const [decks, fileOptimistic] = useOptimistic(
    serverDecks,
    (current: DeckListItem[], move: { deckId: string; id: string | null; name: string | null }) =>
      current.map((deck) =>
        deck.id === move.deckId ? { ...deck, folderId: move.id, folderName: move.name } : deck,
      ),
  );
  const [, startMove] = useTransition();
  /**
   * Every door that moves a deck calls this one function, so the prediction,
   * the announcement and the outcomes live in one place.
   *
   * THE ANNOUNCEMENT IS MADE ON THE PRESS, outside the transition: a state
   * update inside an async transition is held until it settles, which would put
   * the receipt a round trip behind the deck it describes.
   */
  const moveDeck = useCallback(
    (
      deckId: string,
      to: { id: string | null; name: string | null },
      failed: string = folderCopy.move.failed,
    ) => {
      say(to.name ? folderCopy.move.announceFiled(to.name) : folderCopy.move.announceUnfiled);
      startMove(async () => {
        fileOptimistic({ deckId, ...to });
        // THREW AND REFUSED ARE DIFFERENT ANSWERS. `false` is a conflict the
        // reader cannot act on (the deck or the folder is gone), the action
        // revalidated for exactly that reason, and the prediction dropping is
        // the whole response. A rejection is a failure they can act on, and
        // silence there would leave them believing the move landed.
        const answer = await moveDeckAction(deckId, to.id).catch(() => "threw" as const);
        if (answer === "threw") {
          say(failed);
          // THE ONE PATH THAT STILL REFRESHES. Every other outcome reaches the
          // client through the action's own `revalidatePath`; a rejected action
          // may have committed on the server with its response lost, and no
          // payload is coming for that one.
          router.refresh();
          return;
        }
        // A refusal can mean the deck itself is gone (M6), which takes its card
        // with it on any shelf, so focus goes to the one control that survives.
        // The deck has already been announced on its new shelf, so the revert
        // is announced too: a screen reader would otherwise keep a success the
        // screen took back. On the next task, OUTSIDE the action: a state update
        // made inside it is entangled with the transition, which then holds the
        // reverted shelf and the rescued focus with it.
        if (!answer) {
          focusShelfControl();
          setTimeout(() => say(folderCopy.move.refused), 0);
        }
      });
    },
    [fileOptimistic, focusShelfControl, router, say],
  );
  /**
   * A one-shot: the result line stays quiet through the frame in which the
   * sheet hands its announcement over, so the shelf change is said once rather
   * than twice — the shelf's name here and the result sentence there.
   */
  const [handingOff, setHandingOff] = useState(false);
  useEffect(() => {
    if (!handingOff) return;
    const t = setTimeout(() => setHandingOff(false), 400);
    return () => clearTimeout(t);
  }, [handingOff]);

  const apply = useCallback((next: ViewState) => {
    setState(next);
    // A null sort serialises as an absence, which is what `serializeDeckSort`
    // already does with the default — so the stored preference stays off the URL
    // while a filter click rewrites everything else.
    const params = filtersToParams(next.filters, next.sort ?? DEFAULT_DECK_SORT);
    // AN EXPLICIT ORDER STAYS ON THE URL EVEN WHEN IT IS THE DEFAULT.
    // `serializeDeckSort` drops `lastPlayed` because "the default serialises as
    // an absence, so the clean URL is the clean state" — which was true while
    // absence and default meant the same thing. They no longer do: an absence
    // now means "follow what this browser stored". So a reader who arrives at
    // `?sort=lastPlayed`, or presses `Last played`, and then clicks a filter
    // would have had that order rewritten away and a stored `name` take over on
    // the next visit. Present means this order; absent means no opinion here.
    if (next.sort !== null) params.set("sort", next.sort);
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
    // This view's own write is not a navigation to reconcile against, and
    // `useLiveQuery` DOES hear it — so it is recorded here or the next render
    // re-parses what was just serialised. An optimisation rather than a
    // correctness fix: the parse of what `apply` just wrote is the state `apply`
    // just set, so removing this line costs a render per filter click and
    // changes nothing on screen. Mutation-checked, and no test fails without it.
    setSeenQuery(query);
    mirrorUrl(query ? `?${query}` : window.location.pathname);
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
  const active = activeFilterCount(state.filters);
  const zero = decks.length === 0;
  const chips = chipLabels(state.filters);
  // The chassis switches form on its own breakpoint, not Tailwind's — 1000px,
  // because `/collection`'s seven controls need 987 and the row must never wrap.
  const wide = useMinWidth(`(min-width: ${CHASSIS_WIDE_MIN_PX}px)`);

  // Cleared the moment the server's list carries it — during render, so no
  // pass sees both. Left standing, a folder later deleted in another tab would
  // be re-added by this merge and the missing-shelf fallback below could never
  // fire on it.
  // Cleared by the FIRST payload after the create, whether or not it carries the
  // id: a folder deleted in another tab before that response would otherwise be
  // re-added by the merge below on every render, and the missing-shelf fallback
  // could never fire on it.
  if (justMade && serverFolders !== justMade.against) setJustMade(null);

  // The server's list, plus a folder made a moment ago that it has not returned
  // yet.
  const folders = useMemo(
    () =>
      justMade && !serverFolders.some((f) => f.id === justMade.id)
        ? [...serverFolders, justMade].sort((a, b) => a.name.localeCompare(b.name))
        : serverFolders,
    [serverFolders, justMade],
  );
  // One map, feeding both the shelf line's segments and the result line's
  // denominator, so the two figures cannot drift apart. See `shelfCounts`.
  // Over the OPTIMISTIC list and the merged folders, so a deck filed into a
  // folder made a moment ago counts on that folder's segment before the
  // server's payload names either of them.
  const counts = useMemo(() => shelfCounts(decks, folders), [decks, folders]);

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
  // Not in the same pass as a reconciliation: both are render-phase updates and
  // React applies them in order, so this one — built from the state the
  // reconciliation is replacing — would overwrite the parsed URL wholesale. The
  // reconciliation's own `shelfFromParams` already refuses an id that is not
  // there, so the pass it queues needs no correction; a stale shelf that
  // survives it is caught on the render after.
  if (!reconciling && shelfMissing) setState({ ...state, shelf: ALL_DECKS });

  // The shelf a delete (or a refused rename) is waiting to see leave. Its segment
  // and the focused trigger inside it go when the payload lands, and focus would
  // fall to the body; the effect after the URL one puts it on the shelf control.
  const shelfLeaving = useRef<Shelf | null>(null);
  const markShelfLeaving = useCallback((shelf: Shelf) => {
    shelfLeaving.current = shelf;
  }, []);

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
    // The shelf sheet is the compact form's alone (STATES C3): crossing to wide
    // unmounts its trigger, so leaving it open would remount a modal on the way
    // back that the reader never asked for.
    if (wide && shelfSheet.open) {
      setShelfSheet({ open: false, handOff: true });
      // The trigger the hook would return focus to is unmounted by this same
      // render, so focus would land on the body. The wide line's selected
      // segment is the nearest equivalent — the same handoff the filter sheet
      // makes to the search field.
    }
    else if (!wide && shelfSheet.handOff) setShelfSheet({ ...shelfSheet, handOff: false });
    // Consumed on the way back. Left set, a later compact → wide resize would
    // autofocus the search field again without the reader ever opening the
    // sheet.
    else if (!wide && sheet.handOffFocus) setSheet({ ...sheet, handOffFocus: false });
  }

  useEffect(() => {
    if (!wide || !shelfSheet.handOff) return;
    focusShelfControl();
  }, [wide, shelfSheet.handOff, focusShelfControl]);

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
    mirrorUrl(query ? `?${query}` : window.location.pathname);
  }, [folders]);

  // Focus for a shelf that left under a delete or a refused rename, once it has
  // actually gone from `folders`.
  useEffect(() => {
    const leaving = shelfLeaving.current;
    if (leaving === null || folders.some((f) => f.id === leaving)) return;
    shelfLeaving.current = null;
    requestAnimationFrame(focusShelfControl);
  }, [folders, focusShelfControl]);

  const segments = useMemo(() => shelfSegments(folders, counts), [folders, counts]);
  const selectedShelf = useMemo(
    () =>
      segments.find((s) => s.shelf === state.shelf)
      ?? { shelf: ALL_DECKS as Shelf, label: folderCopy.shelves.all, count: counts.all },
    [segments, state.shelf, counts.all],
  );
  // An empty SHELF rather than an emptied one: no filter is on, so the state
  // that draws must not offer to clear one (STATES N2/N3 versus N4).
  const shelfEmpty = state.shelf !== ALL_DECKS && narrowed.length === 0;

  /**
   * The selected shelf's own actions, or nothing. A named folder gets them;
   * `All decks` and `Unfiled` are not folders and have neither act (errata E7),
   * and an unselected segment never carries them (STATES W2).
   */
  const shelfMenu = (
    shelf: Shelf,
    label: string,
    count: number,
    size: "wide" | "compact",
  ) => {
    if (shelf === ALL_DECKS || shelf === UNFILED) return null;
    return (
      <ShelfMenu
        key={shelf}
        folderId={shelf}
        name={label}
        deckCount={count}
        size={size}
        say={say}
        onRenamed={() => {}}
        // NEITHER CALLBACK MOVES THE SHELF OR WRITES THE URL. Both run the moment
        // the action's return value arrives, while the revalidated payload that
        // removes this folder is still streaming behind it. Writing the URL there
        // (`onShelf` → `replaceState`) made the router refetch `/decks` mid-stream
        // and settle on the OLD tree: the deleted shelf stayed on the line with
        // its deck, `Unfiled` read one short, and only a reload cleared it (Hugh's
        // staging walk, 2026-09-28; 3 of 3 at 390 against a staging copy).
        //
        // The fallback to All decks (STATES D3) still happens, one step later and
        // from the payload itself: `shelfMissing` resets the selection once the
        // folder has left `folders`, and the effect keyed on `folders` strips the
        // dead `?folder=` after that. Focus waits for the same moment, because
        // until then the trigger it would leave is still on screen.
        onGone={() => markShelfLeaving(shelf)}
        onDeleted={() => markShelfLeaving(shelf)}
      />
    );
  };

  const onShelf = useCallback(
    (shelf: Shelf) => {
      apply({ filters: state.filters, sort: state.sort, shelf });
      setShelfSheet({ open: false });
      // THE SHELF'S NAME IS THE ANNOUNCEMENT, at both widths, and the result
      // line stands down while it is made. Neither half of that is optional:
      // inside the sheet the result line is behind an `aria-modal` and cannot
      // be heard at all, and on the wide line two shelves that hold the same
      // number of decks produce an identical result sentence, which
      // `ResultLine` deliberately does not repeat — so the change that matters
      // would pass in silence. Announcing both would say it twice.
      setHandingOff(true);
      const chosen = segments.find((s) => s.shelf === shelf);
      if (chosen) say(folderCopy.shelves.aria(chosen.label, chosen.count));
    },
    [apply, state.filters, state.sort, segments, say],
  );

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
  // The deck-state rows, counted the same way: what survives the OTHER active
  // filters, so a zero means "none given what is already on" rather than "no
  // deck has ever been one".
  const stateOptions = STATE_ORDER.map((code) => {
    const count = filterDecks(narrowed, { ...state.filters, states: [code] }, now).length;
    return {
      code,
      label: STATE_LABEL[code],
      count,
      disabled: count === 0 && !state.filters.states.includes(code),
    };
  });

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
          {/* THE LEVEL, above the chassis and on its own ground. It draws only
              when there is at least one deck: a shelf for nothing is furniture
              (STATES W6/C5), and `zero` above has already taken that case. */}
          {wide ? (
            <ShelfLine
              folders={folders}
              counts={counts}
              shelf={state.shelf}
              menu={(segment) => shelfMenu(segment.shelf, segment.label, segment.count, "wide")}
              onSelect={onShelf}
              onCreate={() => {
                setCreating(true);
              }}
            />
          ) : (
            <ShelfTrigger
              label={selectedShelf.label}
              count={selectedShelf.count}
              menu={shelfMenu(
                selectedShelf.shelf,
                selectedShelf.label,
                selectedShelf.count,
                "compact",
              )}
              open={shelfSheet.open}
              onOpen={() => setShelfSheet({ open: true })}
            />
          )}

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
                  {/* Directly after Status: adjacency says the two are read
                      together, and the heading boundary says they are different
                      questions. */}
                  <FilterPanel
                    desktopRowMinPx={44}
                    compact={!wide}
                    copy={deckChassisCopy.state}
                    options={stateOptions}
                    selected={state.filters.states}
                    onToggle={(code) =>
                      onFilters({
                        ...state.filters,
                        states: toggleIn(STATE_ORDER, state.filters.states, code as DeckState),
                      })
                    }
                    onClear={() => onFilters({ ...state.filters, states: [] })}
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
            // Quiet behind EITHER modal: both put the result line out of the
            // reader's reach and both carry their own announcement, so leaving
            // it live says the same change twice.
            silentResult={handingOff || (!wide && (sheet.open || shelfSheet.open))}
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

          <p key={shelfSaid.n} aria-live="polite" aria-atomic="true" className="sr-only m-0">
            {shelfSaid.text}
          </p>

          {shelfSheet.open && (
            <ShelfSheet
              segments={segments}
              shelf={state.shelf}
              onSelect={onShelf}
              onCreate={() => {
                setShelfSheet({ open: false });
                setCreating(true);
              }}
              onDismiss={() => setShelfSheet({ open: false })}
            />
          )}

          {creating && (
            <FolderCreateDialog
              onDismiss={() => {
                setCreating(false);
                setCreatingFor(null);
                const filed = filedOnDismiss.current;
                filedOnDismiss.current = null;
                if (filed)
                  setCreateFiled((prev) => ({ deckId: filed, seq: (prev?.seq ?? 0) + 1 }));
                // The control that opened this is gone when it was the sheet's
                // row, so the hook has nothing to return focus to. The trigger
                // that opens the sheet is the nearest equivalent, and it is the
                // same handoff the filter sheet makes at its own breakpoint.
                // Both origins can vanish: the sheet's row unmounts with the
                // sheet, and a create from move mode selects a new empty shelf,
                // which takes the whole card away. The shelf control is the one
                // thing on screen in either case.
                // Whatever opened it may be gone: the sheet's row unmounts with
                // the sheet, a create from move takes the whole card away, and
                // even the wide line's own button goes if the width crossed
                // while the dialog was open. The hook focuses a surviving
                // trigger itself; this catches the case where there is none.
                requestAnimationFrame(() => {
                  // Unless the panel that asked for this folder is taking focus
                  // itself — it survives on All decks, and its ⋯ is a better
                  // answer than the shelf control. Both rescues test
                  // for the body, so without this the winner would be whichever
                  // frame callback was queued first.
                  // A frame later the claim is checked rather than trusted: the
                  // card can be gone by then (a concurrent delete the create's
                  // payload revealed), and focus is rescued all the same.
                  if (panelTakesFocus.current) {
                    panelTakesFocus.current = false;
                    requestAnimationFrame(() => {
                      if (document.activeElement === document.body) focusShelfControl();
                    });
                    return;
                  }
                  if (document.activeElement === document.body) focusShelfControl();
                });
              }}
              onCreate={async (name) => {
                const result = await createFolderAction(name);
                if (!result.ok) return result.reason === "duplicate" ? "duplicate" : "invalid";
                // Held locally first, THEN selected: the reconciliation below
                // would otherwise read an id the server has not returned yet as
                // a folder that was deleted.
                setJustMade({
                  id: result.folder.id,
                  name: result.folder.name,
                  createdAt: new Date(),
                  deckCount: 0,
                  // The payload it was made against. Any other payload is the
                  // refresh arriving, and this entry has done its job.
                  against: serverFolders,
                });
                // Made from the act: the deck whose panel asked for this folder
                // is filed into it, through the same optimistic move as every
                // other door, so it takes the new shelf as the dialog closes
                // rather than a second round trip later. A refusal drops the
                // prediction exactly as it does there; a throw says both halves,
                // because the folder was made and the reader can act on the
                // second.
                if (creatingFor)
                  moveDeck(
                    creatingFor,
                    { id: result.folder.id, name: result.folder.name },
                    `${folderCopy.create.created(result.folder.name)} ${folderCopy.move.failed}`,
                  );
                else say(folderCopy.create.created(result.folder.name));
                // THE READER DOES NOT MOVE. STATES CR4 selected the new shelf,
                // landing them on S2; Hugh overruled that on 2026-09-13 (errata
                // E20) — the shelf is empty, so there is nothing to go and look
                // at, and being moved somewhere blank to confirm a thing was
                // made is a worse answer than saying it was made. The new
                // segment appearing in the line is the visible half; the
                // sentence is the spoken one.
                // The panel that asked for this folder closes, exactly as a move
                // from the destination list closes it (errata E21). This path
                // never reaches that handler — the move happens here — so the
                // card is told directly, as the dialog goes (`filedOnDismiss`).
                // Only where the card survives the move: on a named shelf it
                // leaves the grid with the prediction, and the dialog's own
                // rescue puts focus on the shelf control.
                if (creatingFor) {
                  panelTakesFocus.current = state.shelf === ALL_DECKS;
                  filedOnDismiss.current = creatingFor;
                }
                return null;
              }}
            />
          )}

          {shown.length === 0 && shelfEmpty ? (
            // S2 and S3 — an empty SHELF, which no filter caused. The filtered
            // empty below is a different state with a different way out, and
            // offering the wrong one is what makes an empty grid read as broken.
            state.shelf === UNFILED ? (
              <UnfiledEmpty
                decks={counts.all}
                folders={folders.length}
                onAllDecks={() => onShelf(ALL_DECKS)}
              />
            ) : (
              <ShelfEmpty name={selectedShelf.label} onAllDecks={() => onShelf(ALL_DECKS)} />
            )
          ) : shown.length === 0 ? (
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
            <ul className="m-0 flex min-h-0 min-w-0 flex-auto list-none flex-col gap-[12px] px-[16px] pt-[14px] pb-[14px] sm:grid sm:grid-cols-3 sm:content-start sm:gap-[14px] sm:p-[18px_22px]">
              <DecksMarkKey decks={shown} />
              {shown.map((deck) => (
                // `sm:h-full` so the tile fills the GRID row rather than
                // sitting at its own content height: a tile with no detail line
                // is shorter than its neighbour with one, and three tiles in a
                // row ending at three different heights reads as three different
                // kinds of thing. The `<li>` already stretches to the row; the
                // tile inside it did not.
                //
                // From `sm` ONLY, and that is not tidiness. Below it this list is
                // a flex COLUMN whose own height comes from its content, so a
                // percentage height on the item resolves against a container the
                // item is sizing — which is a loop, and it ran: 34 tiles took the
                // phone's document to 357,576px. A grid row has a height of its
                // own to be a percentage of.
                <li key={deck.id} className="sm:h-full flex-none">
                  <DeckCard
                    deck={deck}
                    shopping={shopping.byDeck.get(deck.id)}
                    now={now}
                    folders={folders}
                    onCreateFolder={() => {
                      setCreatingFor(deck.id);
                      setCreating(true);
                    }}
                    onMove={(to) => {
                      moveDeck(deck.id, to);
                      // On a named shelf the move takes this card off the grid
                      // in the same commit, so focus goes to the shelf control
                      // now rather than being dropped on the body.
                      if (state.shelf !== ALL_DECKS) focusShelfControl();
                    }}
                    keepsFocus={state.shelf === ALL_DECKS}
                    closeAfterCreate={
                      createFiled?.deckId === deck.id
                        ? { seq: createFiled.seq }
                        : null
                    }
                  />
                </li>
              ))}
            </ul>
          )}

        </div>
      )}
    </div>
  );
}
