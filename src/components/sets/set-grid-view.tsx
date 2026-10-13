"use client";

// /collection/sets/[code] — the grid.
//
// The population here is INVERTED from /collection's: that page lists what you own, this
// one exists to show what you do not. Nothing crosses the boundary in either direction —
// /collection's search, type and availability filters are not applied here, and colour,
// rarity and ownership are not applied back. Different populations, different params.
//
// One density and no toggle, set by ONE declaration on the grid and by nothing on the cell:
// `CARD_GRID_TRACKS`, the column tracks `/collection`'s grid draws (Hugh, 2026-10-13, bug
// batch C, replacing addendum R2 §27's 146px floor): three on a phone, a 178px floor from
// `md`. The track — not a breakpointed literal — is what a cell is wide.
// The upper bound is structural rather than declared: a track can never reach `2F + gap`,
// because at that width another column fits and the count goes up instead.
//
// A smaller cell was drawn and rejected: at 88px the card name truncates at ~13 characters,
// and the name is the only thing in a dimmed cell a reader can match against memory. The
// scroll is paid for by the sticky head, the extras jump, and missing-only, which removes
// the cells the reader is done with rather than shrinking everything.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { useIsDesktop } from "../ui/use-is-desktop";
import { useCardDetail, type Sibling } from "../cards/card-detail-provider";
import { useSearchParams } from "next/navigation";
import { ColourControl } from "../commanders/rack/colour-control";
import { FilterPanel } from "../ui/filter-panel";
import { SheetChip } from "../ui/set-list-sheet";
import { chassisCopy } from "../../lib/copy/filter-chassis";
import { FilterChipPill, type FilterChip } from "../ui/filter-chassis";
import { WUBRG_COLOR } from "../../lib/collection/browse";
import { ACTION_SIZE, GhostButton } from "../ui/button";
import { EmptyState, EmptyStateBody, EmptyStateTitle } from "../ui/empty-state";
import { manapoolAddDeckUrl } from "../../lib/manapool/links";
import { parseAsOf, type PriceFact } from "../../lib/decks/price";
import {
  applyFilters, EMPTY_FILTERS, isQueryActive, nextSetSort, parseFilters, RARITIES,
  serialiseFilters, SET_SORTS, sortCells, WUBRG, type Ownership, type SetGridFilters,
  type SetSort,
} from "../../lib/sets/filters";
import { sectionsOf, type Cell } from "../../lib/sets/completion";
import { costToComplete, livePriceCents } from "../../lib/sets/cost";
import { setFilterCopy, setPageCopy, setsIndexCopy } from "../../lib/copy/set-collections";
import type { PrintingPriceRow } from "../../lib/sets/read";
import { SetCell } from "./set-cell";
import { SetIcon } from "./set-icon";
import { SearchField } from "../ui/text-field";
import { CostStrip } from "./cost-strip";
import { DeltaStrip } from "./delta-strip";
import { useHeadCollapse } from "./use-head-collapse";
import { mirrorUrl } from "../../lib/url/mirror";
import { SearchIcon } from "../ui/search-icon";
import { CARD_GRID_TRACKS } from "../ui/card-grid";

export type SetGridViewProps = {
  code: string;
  name: string;
  iconSvgUri: string | null;
  cells: Cell[];
  prices: PrintingPriceRow[];
  newestAsOf: string | null;
  /**
   * The authoritative denominator from `sets`. Null is no published base run: a set whose rows
   * imply none completes against every printing, and one whose rows imply a run not yet
   * published (a new set mid-ingest) reads as not indexed (`sectionsOf`).
   */
  baseSetSize: number | null;
  /** ISO release date, for the head's provenance line. */
  releasedAt: string | null;
  /**
   * What the reader owned in this set when the page rendered, from the collection rather
   * than from the placed cells: the focus check must not read a catalog refresh as an
   * upload.
   */
  ownedFingerprint: string;
  /**
   * The date to print on the provenance line, or null when the feed is current. Decided on
   * the server: it is a clock comparison, and reading the clock during render is impure
   * and would hydrate mismatched.
   */
  staleAsOf: string | null;
  /**
   * Bumped after a printing pick is written, by the provider that wrote it. Closing the
   * modal is the usual moment a fill moves, but a reader can close it before the action
   * returns, and nothing else in this tab would notice.
   */
  artGeneration: number;
};

/** The collapsed head's hide for Any / Exactly below 1000px, unless it holds keyboard focus. */
export const NARROW_HIDE = "max-[999px]:[&_[data-set-shy-hides-narrow]:not(:has(:focus-visible))]:hidden";

export function SetGridView(props: SetGridViewProps) {
  const {
    code, name, iconSvgUri, releasedAt, cells, prices, newestAsOf, baseSetSize, staleAsOf,
    ownedFingerprint, artGeneration,
  } = props;
  const params = useSearchParams();
  // Every cell opens the shipped modal. Prev/Next pages through the cells as drawn, so
  // the sibling list is the order on screen rather than the order rows came back in.
  const { open, openOracleId, setSiblings, close } = useCardDetail();
  const urlFilters = parseFilters(new URLSearchParams(params.toString()));

  // history.replaceState, not the router: every cell is already loaded, so a toggle is a
  // presentation change over data in hand and routing is the request being avoided. This
  // is the rule AGENTS.md states for a list a reader flips between.
  // The override yields to an EXTERNAL url change and to nothing else. `replaceState` does
  // not update `useSearchParams`, so keying the override on the current query string would
  // make it never match and the filters never apply; what marks a real navigation — Back,
  // Forward, a link — is `useSearchParams` itself reporting something new since last render.
  const urlKey = params.toString();
  // Adjusted DURING RENDER, deliberately, and this is the supported React pattern for
  // deriving state from a changed input rather than a mistake: both setters run only when
  // the values differ, and the tracking value is updated in the same pass, so it converges
  // immediately and cannot loop.
  //
  // The two obvious alternatives are both worse, and were both tried:
  //   - An effect keyed on `urlKey` paints the stale filters once before correcting them,
  //     which is exactly what AGENTS.md's caching rule forbids.
  //   - Storing the key beside the value and comparing it during render BREAKS filtering
  //     outright: `replaceState` does not update `useSearchParams`, so the stored key
  //     never matches the reported one and the override never applies at all.
  const [local, setLocal] = useState<SetGridFilters | null>(null);
  const [seenUrlKey, setSeenUrlKey] = useState(urlKey);
  if (seenUrlKey !== urlKey) {
    setSeenUrlKey(urlKey);
    if (local !== null) setLocal(null);
  }
  const [sheetOpen, setSheetOpen] = useState(false);
  // Sort moves rows without moving the completion count, so the visible result region's
  // own text never changes when the reader picks a new order — nothing announced it
  // (round 5 finding). d9's ruling (round 6): no timer on a live region and no swap of
  // the visible result line, which stays exactly as it is — `ResultLine`'s own shape,
  // a SEPARATE `sr-only` region holding only the latest message, written on each press
  // and never cleared. `seq` is what `ResultLine` keys its span on, so a repeated
  // sentence — the same order pressed twice — is a new node and genuinely re-announced.
  const [sortAnnounce, setSortAnnounce] = useState<{ text: string; seq: number }>({
    text: "",
    seq: 0,
  });
  const sortAnnounceSeq = useRef(0);
  // The sheet is phone-only, and `md:hidden` alone hid it while useDialogA11y stayed
  // mounted: crossing the breakpoint with it open left the desktop page scroll-locked and
  // trapped focus in a dialog nobody could see. Unmounted rather than hidden.
  const isDesktop = useIsDesktop();
  /**
   * The delta strip is the one member of the head that is news rather than reference. §31:
   * "if it is firing, the collapse waits" — it carries the only offer to refresh a page the
   * reader has just been told is stale.
   */
  const [deltaFiring, setDeltaFiring] = useState(false);
  const onDeltaFiring = useCallback((firing: boolean) => setDeltaFiring(firing), []);
  /**
   * The head's two heights, and everything that decides between them.
   *
   * Extracted because that is where R3 finding 6's twelve rounds of defects lived — the
   * hysteresis band, the reserve, the observer's delivery timing, the delta gate, the sheet
   * freeze, the breakpoint round trip. Not one of them was in the markup, which is why the
   * markup for the members it hides stays here, with the members.
   */
  const { shy, headRef, spacerRef, containerRef, openHead } =
    useHeadCollapse({ isDesktop, deltaFiring, sheetOpen });
  /**
   * The collapsed DESKTOP form, which is a different shape from the phone's: the same rack
   * row with an identity prefix, rather than a bar of its own. Named once here because four
   * class expressions below ask the same question.
   */
  const shyDesktop = shy && isDesktop;
  /**
   * The search input, so every control that clears the query can put focus back in it.
   * Clearing hides the field's own × (`visibility`, and out of the tab order with it) and
   * unmounts the empty state's buttons — so without this, using any of them strands the
   * keyboard on a control that is no longer there.
   */
  const searchRef = useRef<HTMLInputElement>(null);
  // Closed on the transition rather than merely unmounted by it: leaving `sheetOpen` true
  // returned focus to a trigger that is now hidden, and shrinking back to mobile remounted
  // a sheet the reader never reopened.
  const [sheetWasDesktop, setSheetWasDesktop] = useState(isDesktop);
  if (sheetWasDesktop !== isDesktop) {
    setSheetWasDesktop(isDesktop);
    if (sheetOpen) setSheetOpen(false);
  }

  // The dialog hook returns focus to the trigger it saved, and after a crossing to desktop
  // that trigger is `md:hidden` — focus lands on a control nobody can see. Rather than
  // tracking why focus moved, this asks the only question that matters: is what holds focus
  // reachable? Runs after the unmount this breakpoint change causes.
  //
  // `document.body` counts as unreachable, which is the crossing in the OTHER direction:
  // going to phone unmounts the rarity panel, and a focused subtree being removed drops
  // focus to the body. Treating the body as "fine" lost the keyboard there entirely — the
  // reader was inside a control, and the control's replacement is one tab away at most.
  /**
   * There is no focus rescue across the `md` crossing, deliberately.
   *
   * One lived here and was rewritten five times: it fired on a fresh load where the body
   * holds focus; it fired long after a chip's × removed the control; it missed
   * `hidden md:flex`, which stays connected while going invisible; and it never covered the
   * phone sheet, which sits outside this container so `useDialogA11y` returns focus to a
   * trigger the crossing has just hidden. Each fix was correct and uncovered the next hole,
   * which is the shape of a mechanism guarding a case too narrow to be worth it: a reader
   * resizing the window while focused inside the filter rack.
   *
   * No other route in this app rescues focus across a breakpoint. Left to the browser, as
   * they leave it. If this ever needs solving it belongs in one place for all of them, not
   * in thirty-five lines here.
   */

  const filters = local ?? urlFilters;

  /**
   * The typed value, held apart from the applied one — §29's 150ms debounce, the shipped
   * card-search window.
   *
   * Applying on every keystroke recomputed both sections, the rarity counts, the cost and
   * `Send N`, and re-announced the live result line, once per character. The INPUT stays
   * uncontrolled-feeling and immediate; only the applied query and the URL wait.
   */
  const [draft, setDraft] = useState(filters.query);
  /**
   * The last value this field pushed. Anything else that moves `filters.query` — Clear all,
   * the empty state, a fresh URL — has to reach the input, and comparing against the pushed
   * value is what tells the two apart. Adjusted during render rather than in an effect, per
   * AGENTS.md: an effect paints the stale text once before correcting it.
   */
  const [pushedQuery, setPushedQuery] = useState(filters.query);
  if (filters.query !== pushedQuery) {
    setPushedQuery(filters.query);
    setDraft(filters.query);
  }
  const queryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * `setFilters` reads `filters` off the closure, and 150ms is long enough for the reader
   * to press a pip in between — so the timer reads the live value rather than the one that
   * existed when the key went down.
   */
  const filtersRef = useRef(filters);
  // In an effect, not during render: `react-hooks/refs` forbids writing a ref while
  // rendering, and this only has to be current by the time a 150ms timer reads it.
  useEffect(() => {
    filtersRef.current = filters;
  });
  const cancelQueryTimer = () => {
    if (queryTimer.current !== null) clearTimeout(queryTimer.current);
    queryTimer.current = null;
  };
  // Keyed on `urlKey`, not `[]`, and inlined rather than calling the helper — the helper is
  // a new function every render, so naming it here is either an exhaustive-deps breach or a
  // cleanup that runs each render and cancels a live debounce.
  //
  // The key is what makes this more than an unmount guard. Back/Forward gives a new URL, the
  // render-time sync puts its query in the box, and a timer armed before the navigation
  // would then write the OLD value 150ms later, undoing the state the reader just navigated
  // to. This page's own applies go through `replaceState`, which does not move `urlKey`, so
  // the debounce is never cancelled by its own result.
  useEffect(
    () => () => {
      if (queryTimer.current !== null) clearTimeout(queryTimer.current);
      queryTimer.current = null;
    },
    [urlKey],
  );
  /**
   * A `q` the parse threw away is still in the address bar, and nothing else would remove
   * it: the grid is unfiltered, so `Clear all filters` does not render and the field's own
   * × is inert. `?q=%CC%81` or `?q=%20` would then survive a reload and a share as a dead
   * parameter nobody can clear.
   *
   * Written once, on the URL that carried it, rather than on every render — `setFilters`
   * serialises the canonical value, which omits an inactive query, so the second pass has
   * nothing left to find.
   */
  useEffect(() => {
    if ((params.get("q") ?? "") !== "" && urlFilters.query === "") setFilters(urlFilters);
    // `setFilters` and `urlFilters` are both derived from this key; re-running on their
    // identity would rewrite the URL every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlKey]);
  const typeQuery = (value: string) => {
    setDraft(value);
    cancelQueryTimer();
    queryTimer.current = setTimeout(() => {
      queryTimer.current = null;
      setPushedQuery(value);
      setFilters({ ...filtersRef.current, query: value });
    }, 150);
  };
  const clearQuery = () => {
    // Immediate, and the pending keystroke dies with it: a debounced apply landing after
    // the clear would put the query back.
    cancelQueryTimer();
    setDraft("");
    setPushedQuery("");
    setFilters({ ...filters, query: "" });
    searchRef.current?.focus();
  };

  function setFilters(next: SetGridFilters) {
    // Only the parameters this page owns are replaced. Rebuilding the string from them
    // alone dropped everything else a link might carry, which the collection browser is
    // careful not to do. `q` joins the list with the name search: an empty query
    // serialises to an absence, so without deleting it first, clearing the search would
    // leave the old one standing in the URL — a Clear that clears nothing.
    const live = new URLSearchParams(window.location.search);
    // `own`, `sort` and `dir` since H12 and H16. `m` stays on the list for both of its
    // meanings: the legacy `m=1` is read as missing and must go when ownership is next
    // written, or it would outlive the `own` that replaced it.
    for (const key of ["c", "r", "m", "own", "q", "sort", "dir"]) live.delete(key);
    for (const [key, value] of serialiseFilters(next)) live.set(key, value);
    const qs = live.toString();
    mirrorUrl(qs ? `/collection/sets/${code}?${qs}` : `/collection/sets/${code}`);
    setLocal(next);
  }


  const priceFor = useMemo(() => {
    const byId = new Map<string, PriceFact>();
    for (const p of prices) {
      byId.set(p.scryfallId, {
        cents: p.cents, foilCents: p.foilCents, etchedCents: p.etchedCents,
        asOf: parseAsOf(p.asOf),
      });
    }
    return byId;
  }, [prices]);
  const newest = newestAsOf ? parseAsOf(newestAsOf) : null;

  const sections = useMemo(() => sectionsOf(cells, baseSetSize), [cells, baseSetSize]);
  // Part of the strip's key: a set that goes unindexed and back must start from a clean
  // baseline rather than re-render a delta belonging to the previous one.
  const indexedKey = sections.indexed ? "i" : "u";
  const complete = sections.complete;

  // At 100% the Missing option is removed, because the base run has nothing left to hide.
  // The PARAMETER can still be in the URL — a reader completes a set with `own=missing` set —
  // and it would go on filtering the extras with no control left to turn it off. So the
  // complete state drops it from the filters it applies as well as from the rack.
  //
  // Owned is NOT dropped (H12). On a complete set it keeps every base cell, so it is
  // harmless there, and it still means something in the extras; its option stays drawn at
  // 100%, so it never becomes a filter with no control.
  const effective: SetGridFilters = complete && filters.own === "missing"
    ? { ...filters, own: "all" }
    : filters;

  // The price ORDER's figure for one cell (H16): the cost strip's own, through the same
  // `livePriceCents`, so the dearest cell this order names first is the one the strip would
  // charge most for. Owned cells are read the same way — a price row is per printing, not
  // per holding — and a cell with no row is unpriced, which `sortCells` puts last.
  const centsOf = (c: Cell) => livePriceCents(priceFor.get(c.scryfallId), newest);

  // ONE count function. Everything below reads these arrays and nothing recomputes the
  // filter — the result line, the Send label and the cost denominator must agree.
  //
  // Matched in collector order, then ORDERED per section for the grid. The two are kept
  // apart for the cost strip alone: `Send N` caps at 99 cards and takes them in the order it
  // is handed, so feeding it the price order would make what the buy button sends depend on
  // how the grid happens to be sorted.
  const matchedBase = applyFilters(sections.base, effective);
  const matchedExtras = applyFilters(sections.extras, effective);
  const shownBase = sortCells(matchedBase, effective.sort, effective.dir, centsOf);
  const shownExtras = sortCells(matchedExtras, effective.sort, effective.dir, centsOf);
  const shown = [...shownBase, ...shownExtras];
  // Prev/Next pages through what is on screen, in the order it is on screen. Deduped:
  // the modal pages by ORACLE id and a set can draw two cells for one oracle (EOE's Plains
  // at #262 and #268), which would otherwise repeat a card on the way through. Carries each
  // cell's own printing art and identity (H23 carousel PR 1b), so a neighbor resolves from
  // this set's own query rather than the oracle-level fallback.
  // Not memoised: `shown` is rebuilt each render, so a memo keyed on it can never hold,
  // and the compiler rejects the dead memoisation rather than keeping it.
  const seenSiblingIds = new Set<string>();
  const siblingCells = shown.filter((c) => {
    if (seenSiblingIds.has(c.oracleId)) return false;
    seenSiblingIds.add(c.oracleId);
    return true;
  });
  const siblingIds = siblingCells.map((c) => ({ oracleId: c.oracleId, name: c.name, imageUri: c.imageUri, colorIdentity: c.colorIdentity }));
  const bareSiblingIds = siblingCells.map((c) => c.oracleId);

  // The provider keeps whatever sibling list it was handed at open, so a filter change or
  // a Back while the modal is up would leave Prev/Next paging through cells the grid no
  // longer draws. Reconciled the way CollectionBrowser reconciles its own: the list
  // follows, and a card that has left the grid closes the modal rather than stranding it.
  // Bumped when the card modal closes. The printing picker lives in that modal, and a
  // pick moves which cell is filled — a change window focus never sees, because focus does
  // not fire for an action taken in this tab.
  const [modalGeneration, setModalGeneration] = useState("0");
  const [wasOpen, setWasOpen] = useState(false);
  if (wasOpen !== (openOracleId !== null)) {
    setWasOpen(openOracleId !== null);
    if (openOracleId === null) setModalGeneration((g) => String(Number(g) + 1));
  }

  const openInGrid = openOracleId !== null && bareSiblingIds.includes(openOracleId);
  const siblingKey = bareSiblingIds.join(",");
  // Closes only when the GRID moves and the open card is not in it, as `/collection` does
  // (collection/browser.tsx). A card opened from inside another surface is off the grid by
  // nature: a partner named in Find a deck's reason line, stacked over the picker. Closing on
  // "not in the grid" alone shut that card the instant it opened.
  const lastSiblingKey = useRef(siblingKey);
  useEffect(() => {
    const gridMoved = lastSiblingKey.current !== siblingKey;
    lastSiblingKey.current = siblingKey;
    if (openOracleId === null) return;
    if (openInGrid) setSiblings(siblingIds);
    else if (gridMoved) close();
    // `siblingKey` stands in for the array, which is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siblingKey, openOracleId, openInGrid, setSiblings, close]);


  // The strip is scoped, and its population must match its label: "Cost to complete" is
  // the BASE RUN, and at 100% the same strip re-scopes to the extras. Costing both at once
  // put extras in a figure and a button that said base run — and would have sent them to
  // ManaPool under that label.
  const costable = complete ? matchedExtras : matchedBase;
  const missingShown = costable.filter((c) => !c.owned);

  const cost = costToComplete(
    missingShown.map((c) => ({ price: priceFor.get(c.scryfallId) ?? null })),
    newest,
  );
  // The list rides in a query string, and the only size the builder is tested against is
  // 99 cards under 4 KB. A full set is 276, which browsers and proxies can reject outright
  // — a primary action that fails at the far end is worse than one that says what it is
  // sending. Capped, and the copy states the cap when it bites.
  const SEND_CAP = 99;
  const sending = missingShown.slice(0, SEND_CAP);
  const sendCapped = missingShown.length > SEND_CAP;
  // Explicitly null for an empty list rather than relying on the builder to return it:
  // the strip's contract is that a null href means "nothing to send", and keeping that
  // decision here means a change in the builder cannot quietly produce a "Send 0" link.
  const buyHref = sending.length === 0
    ? null
    : manapoolAddDeckUrl(sending.map((c) => ({ name: c.name, quantity: 1 })));


  // Canonical WUBRG order, not click order. `serialiseFilters` writes the URL in WUBRG and
  // the pips draw in WUBRG, so a list kept in click order left the collapsed chip speaking
  // and drawing "Blue, White" while everything else beside it said "White, Blue" — until a
  // navigation happened to re-parse the URL and quietly reorder it. `/decks`' own colour
  // toggle canonicalises for the same reason.
  const toggleIn = (list: string[], value: string) => {
    const next = list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
    return WUBRG.filter((c) => next.includes(c));
  };

  // Rarity is MULTI-select since H13, exactly as `/collection`'s Type is: a press toggles
  // one value and leaves the rest, and the list is rebuilt in canonical order so the chips,
  // the URL and the panel read the same whichever order they were pressed in. The retired
  // single-select carried its own radio machinery — roving tab stop, arrow stepping, a saved
  // off-state stop — none of which a set of independent toggles needs.
  const toggleRarity = (list: string[], value: string) => {
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    return RARITIES.filter((r) => next.includes(r));
  };
  // Ownership is a tri-state (H12): pressing the lit option returns to every cell, and
  // pressing the other one REPLACES it, because `missing` and `owned` together match nothing.
  const pickOwn = (current: Ownership, value: Exclude<Ownership, "all">): Ownership =>
    (current === value ? "all" : value);

  // What the colour and rarity filters match, ownership aside: the denominator behind both
  // the owns-all claim and its correction.
  const matchedIgnoringOwn = applyFilters(
    [...sections.base, ...sections.extras],
    { ...effective, own: "all" },
  );

  // DIMENSIONS, not values. `c=W,U` is one colour filter, and counting its values put a `2`
  // on `Filters` for a single control. Ownership counts since H13 moved it into the sheet:
  // the phone row no longer draws it beside the badge, so a badge leaving it out would hide a
  // live filter behind `Filters` completely.
  //
  // `effective` for colour and rarity, and for ownership too where it is APPLIED — this is
  // the figure the result line's "narrowing" reads, and at 100% a stale `own=missing` is
  // neither applied nor reachable.
  const filtersOn =
    (effective.colors.length > 0 ? 1 : 0) + (effective.rarities.length > 0 ? 1 : 0)
    + (effective.own !== "all" ? 1 : 0);
  // The BADGE's count, on the open row and on the collapsed bar alike. The RAW ownership,
  // not `effective`: at 100% `effective` forces missing off while `own=missing` (or a legacy
  // `m=1`) can still be in the URL — the stale-filter case Clear exists for — and reading
  // `effective` there left the badge with nothing for a parameter that is set.
  const badgeCount =
    (effective.colors.length > 0 ? 1 : 0) + (effective.rarities.length > 0 ? 1 : 0)
    + (filters.own !== "all" ? 1 : 0);
  // Clear reads the RAW filters, not `effective`. At 100% missing is dropped from what is
  // applied, but the parameter can still be in the URL — a reader completes a set with it
  // set — and gating Clear on `effective` left that parameter with no way out of the UI,
  // ready to reactivate the moment the set stopped being complete.
  const anyFilterOn =
    filters.colors.length > 0 || filters.rarities.length > 0 || filters.own !== "all"
    || isQueryActive(filters.query);

  // What the RESULT LINE reads, which is not what the badge reads. The badge counts the
  // dimensions behind the sheet; the line describes the page, and a query narrows it just
  // as a colour does — so a query-only search stated "399 cells · 62 yours, 337 missing"
  // about a page showing four.
  const narrowing = filtersOn > 0 || isQueryActive(effective.query);

  // The chip line, in DIMENSION order and never click order — a line that re-orders itself
  // as you use it is a line you have to re-read. Colour collapses past one pip rather than
  // printing one chip per hue.
  // The chassis's own type, not a copy of its shape — the same reason the chip itself is
  // `FilterChipPill` now. A re-declared shape is how this adapter drifts the next time a
  // chip field is added.
  const chips: FilterChip[] = [];
  if (effective.colors.length === 1) {
    const only = effective.colors[0];
    chips.push({
      key: `c-${only}`,
      label: setFilterCopy.chip.colourOne(
        chassisCopy.colour.names[only.toLowerCase() as "w" | "u" | "b" | "r" | "g"],
      ),
      // Dropping the pips drops the modifier with them, as the commander rack's chip does:
      // `Exactly` with nothing lit is the greyed state, and it would otherwise leave a chip
      // behind for a filter that filters nothing.
      onRemove: () => setFilters({ ...filters, colors: [], match: "contains" }),
    });
  } else if (effective.colors.length > 1) {
    // The count is for the eye, the SWATCHES are beside it, and the NAMES are for the
    // ear. §28's "never one chip per hue" forbids a chip per colour — not swatches inside
    // the one chip, which is what `FilterChipPill`'s `dots` draws and what `/collection`
    // and the commander rack both pass. Without them a sighted reader on a phone sees
    // `3 colours` with the pips unmounted behind the sheet; without `spoken`, a screen
    // reader hears the same count and has nowhere to go for the names.
    const names = effective.colors
      .map((c) => chassisCopy.colour.names[c.toLowerCase() as "w" | "u" | "b" | "r" | "g"]);
    chips.push({
      key: "c",
      label: setFilterCopy.chip.colour(effective.colors.length),
      spoken: names.join(", "),
      dots: effective.colors.map((c) => WUBRG_COLOR[c.toUpperCase()]),
      onRemove: () => setFilters({ ...filters, colors: [], match: "contains" }),
    });
  }
  // The modifier's own chip, the rack's rule (`rack/chip-line.tsx`): only while there are
  // pips for it to modify, and removing it returns to Any and keeps the pips.
  if (effective.colors.length > 0 && effective.match === "exactly") {
    chips.push({
      key: "m",
      label: setFilterCopy.chip.match,
      onRemove: () => setFilters({ ...filters, match: "contains" }),
    });
  }
  // One chip PER rarity, as `/collection` draws one per type: each is its own value with its
  // own ×, and four short words never need collapsing the way five hues do.
  for (const r of effective.rarities as ("common" | "uncommon" | "rare" | "mythic")[]) {
    chips.push({
      key: `r-${r}`,
      label: setFilterCopy.chip.rarity(r),
      onRemove: () => setFilters({ ...filters, rarities: filters.rarities.filter((v) => v !== r) }),
    });
  }
  if (effective.own !== "all") {
    chips.push({
      key: "own",
      label: setFilterCopy.chip.own(effective.own),
      onRemove: () => setFilters({ ...filters, own: "all" }),
    });
  }
  // `EMPTY_FILTERS` clears the query too, so every non-dialog route to it owes the same
  // focus return the field's own × does — without it, the chip-line Clear and the empty
  // state's second button both unmount themselves and drop focus to the body. The phone
  // sheet's Clear passes `false`: focusing a field behind an open dialog is worse than
  // leaving focus in the sheet the reader is still using.
  //
  // The ORDER survives: sort narrows nothing, and the chassis excludes it from Clear all
  // for exactly that reason.
  const clearAll = (refocus = true) => {
    cancelQueryTimer();
    setDraft("");
    setPushedQuery("");
    setFilters({ ...EMPTY_FILTERS, sort: filters.sort, dir: filters.dir });
    if (refocus) searchRef.current?.focus();
  };
  // A filter that is SET but not APPLIED has no chip and no control. That happens exactly
  // once: `own=missing` (or a legacy `m=1`) still in the URL on a set the reader has
  // completed, where `effective` drops it and its option is gone too. Clear stays live for
  // it, because it is the only route left to a parameter that would start filtering again
  // the moment the set stopped being complete — named precisely rather than inferred from an
  // empty chip line, since `?own=missing&c=W` draws a White chip and "no chips" would be false.
  const staleFilter = complete && filters.own === "missing";
  // Whether `Clear all filters` has anything to clear. It is ALWAYS drawn since H13 — the
  // chassis's rule, `ml-auto` and inert with `--fg-locked` when off — rather than appearing
  // past one active control; a way out that comes and goes is a control the reader has to
  // look for. The query counts though it draws no chip: Clear clears it.
  const clearLive = chips.length > 0 || isQueryActive(effective.query) || staleFilter;

  // Per-row counts from the ONE filtered computation, so the panel never disagrees with
  // the result line beside it. Rarity is excluded from its own counts — a panel whose rows
  // read 0 for every value but the lit one tells the reader nothing about what picking a
  // different one would do.
  const rarityCounts = (() => {
    const pool = applyFilters(
      [...sections.base, ...sections.extras],
      { ...effective, rarities: [] },
    );
    const counts = new Map<string, number>();
    for (const c of pool) {
      const r = (c.rarity ?? "").toLowerCase();
      counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    return counts;
  })();

  /**
   * ONE options list, read by both mounts. The desktop panel derives a count and a
   * disabled state from `rarityCounts`; the phone sheet used to offer every value
   * regardless — so the same colour filter exposed different rarity choices at the two
   * widths, and the sheet could send a reader to a zero-result state for a value the
   * desktop panel declares unavailable. Two mounts re-deriving one rule is the same shape
   * as the chip markup this PR stopped copying.
   */
  // Hues with no surviving cards under the OTHER filters — the shared pip component's own
  // contract, which `/collection` also passes. A LIT hue is never unavailable, or it could
  // not be turned off.
  //
  // Asked of the selection the PRESS would produce, not of the hue alone. Under H10's
  // `contains` lighting a second pip narrows the grid to cards holding both, so "does any
  // card carry U?" said yes about a press that would empty the page; what the pip has to
  // answer is "would lighting me leave anything?".
  // Turning the last pip off returns the mode to Any, as removing the colour chip does. Left on
  // Exactly with nothing lit, the mode is invisible (the control greys its selector with no
  // pips) yet still decides which pips are offered: in a set of multicolor cells only, every
  // single pip would then read unavailable, with no way to reset the mode.
  const setColours = (c: string[]) => {
    const colors = c.map((v) => v.toUpperCase());
    setFilters({ ...filters, colors, match: colors.length > 0 ? filters.match : "contains" });
  };

  const unavailableColours = WUBRG.filter((c) => {
    if (effective.colors.includes(c)) return false;
    return !applyFilters(
      [...sections.base, ...sections.extras],
      { ...effective, colors: toggleIn(effective.colors, c) },
    ).length;
  });

  const rarityOptions = RARITIES.map((r) => {
    const count = rarityCounts.get(r) ?? 0;
    return {
      code: r,
      count,
      // A lit value is never disabled, or it could not be turned off.
      disabled: count === 0 && !filters.rarities.includes(r),
    };
  });

  // The ownership options' counts, from the same pool the owns-all claim reads. Missing is
  // not offered on a complete set (see `effective`), and Owned always is.
  const ownOptions = ([
    { own: "missing", count: matchedIgnoringOwn.filter((c) => !c.owned).length },
    { own: "owned", count: matchedIgnoringOwn.filter((c) => c.owned).length },
  ] as const)
    .filter((o) => !(complete && o.own === "missing"))
    .map((o) => ({ ...o, disabled: o.count === 0 && filters.own !== o.own }));

  // The order control's rows, `buildSortOptions`' shape: only the chosen row carries its
  // direction, since an unchosen row has none until it is picked.
  const sortOptions = SET_SORTS.map((key) => ({
    code: key,
    label: setFilterCopy.sort.options[key],
    hint: key === filters.sort ? setFilterCopy.sort.direction[key][filters.dir] : undefined,
    count: 0,
    disabled: false,
  }));


  // Both widths since addendum 2, and only when there is a measured rest height to reserve.
  // `collapsed` is the scroll's answer; `shy` is whether it applies. Held apart so a
  // reader who scrolls, then triggers a delta strip, restores the full head and keeps the
  // scroll state underneath it — rather than the strip clearing the state and the head
  // collapsing again the moment it is dismissed.
  return (
    // The container the hook suspends scroll anchoring on, for the length of a collapse and
    // no longer. Anchoring ignores sticky boxes, so at the crossing it saw the reserve GROW
    // by the head's own shrink, never saw the shrink, and compensated for a change that had
    // not happened — an 80px wheel step measured 293px, and it does so on `main` too. Held
    // off permanently it would cost the reader their place on a filter change instead, which
    // is the case anchoring is for, so it is switched rather than set.
    <div ref={containerRef}>
      <div
        ref={headRef}
        data-set-head-shy={shy ? "" : undefined}
        data-set-head
        data-set-head-collapsed={shy ? "" : undefined}
        /* STICKY ONLY WHEN THERE IS SOMETHING TO PIN, at EVERY width. The open head is
           288px of an 844px phone and ~300px of a 900px desktop window, and pinned it sat
           over the grid for the whole band before the collapse — the reader scrolled a
           screen of cards under a header that never moved, and then it snapped. Scrolling
           out of the flow like any other block, it leaves gracefully, the bar takes over at
           the offset where the last of it goes, and on the way back up the open head slides
           in from the top edge instead of appearing over a cut-off first row.

           #623 made that the phone's rule and left `md:sticky` standing, correctly: desktop
           did not collapse then, so its head had no second state to arrive at and pinning
           was the whole point of it. Addendum 2 gave desktop the collapse and the exemption
           became the phone's original defect at a second width — a ~300px header held over
           the grid for the 120px band past the threshold, measured at `top 0px` while the
           cards moved under it. The rule is one rule now. */
        className={`${shy ? "sticky" : ""} top-0 z-[2] pb-[12px] pt-[10px]`}
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
      >
        {/* §31's collapsed bar: ONE row at 52px carrying where you are, how far along, and
            the two ways to change what you are looking at. Not the same nodes hidden — the
            identity block is a two-line stack and the control row is a third, so hiding
            members of them reaches 140px and no further. This is its own row.

            The search control is a BUTTON back to the head, never a second field: §29
            forbids two controls with one accessible name on this page, and the field is
            forty pixels of scroll away. */}
        {shy && !isDesktop ? (
          <div
            data-set-head-bar
            className="flex h-[52px] items-center gap-[8px]"
          >
            <SetIcon
              uri={iconSvgUri}
              size={22}
              desktopSize={22}
              tone={complete ? "success" : "muted"}
              ringed={complete}
            />
            {/* The completion state is in the NAME, not only in the icon: `SetIcon` is
                `aria-hidden`, so a bar carrying the bare name told a screen-reader user
                nothing the open heading tells them. */}
            {/* An `h1`, not a span. The open block is `display:none` while the bar is
                drawn, which takes its heading out of the accessibility tree — so heading
                navigation had no page heading at all for the whole collapsed state. Only
                ever one of the two is exposed, for the same reason. */}
            <h1
              className="min-w-0 flex-1 truncate font-display text-[14px]"
              style={{ color: complete ? "var(--success)" : "var(--fg)" }}
            >
              {complete ? setPageCopy.complete.heading(name) : name}
            </h1>
            {/* Every indexed set, the complete one included. A complete base run can still
                have extras and enough cells to scroll, and §31's bar carries the ratio —
                dropping it there loses the reader's progress figure exactly where the head
                has stopped showing it anywhere else. */}
            {sections.indexed ? (
              <span
                className="shrink-0 font-mono text-[11px]"
                style={{ color: "var(--fg-muted)" }}
                aria-label={setPageCopy.head.ratioAria(sections.baseOwned, sections.baseTotal)}
              >
                {sections.baseOwned} / {sections.baseTotal}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => {
                // Open the head FIRST. The field is inside the `hidden` open-head subtree
                // while the bar is drawn, and `scrollTo` does not commit the collapse
                // state — so focusing here focused a hidden input, which does nothing, and
                // the keyboard reader stayed on a button that was about to unmount.
                openHead();
                // Instant, not `reveal`: the next frame focuses the field, which must find the page at the top.
                window.scrollTo({ top: 0 });
                // And on the next frame, once the open head has painted. The control they
                // asked for is the field this button stands for; landing them anywhere
                // else is the same as not moving focus at all.
                requestAnimationFrame(() => searchRef.current?.focus());
              }}
              aria-label={setPageCopy.head.backToSearch}
              className="inline-flex size-[44px] shrink-0 items-center justify-center
                         rounded-[6px] text-[13px] text-[color:var(--fg-body)]"
            >
              <SearchIcon size={18} />
            </button>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              // 44px, like the open row's trigger and every other phone action on this
              // page. The 52px bar has the room, and this is the ONLY path to the filters
              // while the head is collapsed — the last control to shrink.
              className="inline-flex min-h-[44px] shrink-0 items-center gap-[6px] rounded-[6px]
                         border border-[color:var(--border)] px-[10px] text-[12px]
                         text-[color:var(--fg-body)]"
            >
              {setFilterCopy.label}
              {/* The badge is how the collapsed bar carries the filter state, which is why
                  it may drop the chip line. At zero filters there is no badge and nothing
                  to carry. */}
              {/* The same count the open row's badge carries, ownership included. The two
                  differed while missing-only sat on the open row beside the badge; H13 moved
                  ownership into the sheet, so both badges are the only place it shows. */}
              {badgeCount > 0 ? (
                <span
                  aria-label={setFilterCopy.countBadgeAria(badgeCount)}
                  className="inline-flex h-[18px] min-w-[18px] items-center justify-center
                             rounded-full bg-[color:var(--accent)] px-[5px] font-mono
                             text-[10px] text-[color:var(--bg)]"
                >
                  {badgeCount}
                </span>
              ) : null}
            </button>
          </div>
        ) : null}

        {/* `data-set-shy-hides` on every member the collapse hides — three at `md`, and the
            rack row as a fourth below it. That is what the hook's focus gate reads: hiding a
            member takes the keyboard with it, so focus inside one holds the head open. A
            marker rather than a class list, because the gate is about what DISAPPEARS and not
            about how it is drawn, and the rack row is the case that proves the difference —
            it hides at one width and is the collapsed head at the other. */}
        <div
          data-set-shy-hides
          className={`${shy ? "hidden" : "flex"} items-start gap-[12px]`}
        >
          {/* 30px on a phone, which is the geometry the sticky head is sized around. */}
          <SetIcon
            uri={iconSvgUri}
            size={30}
            desktopSize={44}
            tone={complete ? "success" : "muted"}
            ringed={complete}
          />
          <div className="min-w-0 flex-1">
            {/* A long name clamps to two lines and the head grows; clipping a title the
                reader navigated here by is worse than growing a header. */}
            <h1
              className="font-display text-[20px] md:text-[24px] line-clamp-2"
              style={{ color: complete ? "var(--success)" : "var(--fg)" }}
            >
              {complete ? setPageCopy.complete.heading(name) : name}
            </h1>
            <p className="font-mono text-[11px]" style={{ color: "var(--fg-muted)" }}>
              {!sections.indexed ? (
                // No denominator, so no ratio. Never "0 / 0 · 0%".
                <span style={{ color: "var(--fg-locked)" }}>{setsIndexCopy.notIndexed.tag}</span>
              ) : complete ? (
                setPageCopy.complete.line(sections.baseTotal)
              ) : (
                <span aria-label={setPageCopy.head.ratioAria(sections.baseOwned, sections.baseTotal)}>
                  {/* R3 finding 6, move 1. Two forms of one figure, not two figures: the
                      phone carries the scope word the note below used to carry. The
                      accessible name is the same string at both widths — it already said
                      "in the checklist". */}
                  <span className="md:hidden">
                    {setPageCopy.head.ratioScoped(
                      sections.baseOwned, sections.baseTotal, sections.percent,
                    )}
                  </span>
                  <span className="hidden md:inline">
                    {sections.baseOwned} / {sections.baseTotal} · {sections.percent}%
                  </span>
                </span>
              )}
              {/* OUTSIDE the ratio's span, deliberately. That span carries an explicit
                  `aria-label`, which REPLACES everything its descendants contribute — the
                  same contract the set index's extras figure is held to. Nested, these two
                  were on the screen and absent from the accessible name. */}
              {sections.indexed && sections.extrasTotal > 0 && !complete ? (
                <span className="md:hidden">
                  {" · "}
                  {setPageCopy.head.extrasTrail(sections.extrasOwned, sections.extrasTotal)}
                </span>
              ) : null}
              {/* R3 finding 6, move 2, on the RATIO line rather than the title line. The
                  handoff names the title's trailing edge and prices the move at −15px, but
                  the title is `line-clamp-2` and a real set name is what gives width: on
                  `Avatar: The Last Airbender` at 390 the code pushed the `h1` from one line
                  to two, 30px to 60px, and the move meant to save 15 cost 15. Measured, not
                  argued — see the readiness erratum.

                  Rendered for every INDEXED state, not only the incomplete one. Scoped to
                  the incomplete branch it left a complete set's phone with no code and no
                  year at all, because the long provenance paragraph is hidden there too. */}
              {sections.indexed ? (
                <span data-set-provenance-short className="md:hidden">
                  {" · "}
                  {setPageCopy.head.metaShort(code, releasedAt)}
                </span>
              ) : null}
            </p>
            {/* Provenance, and only when there is provenance to state: an unindexed set
                has no base or extras figure, and the ratio note below is the one line that
                always stands. */}
            {sections.indexed ? (
              // R3 finding 6, move 2: the full string is the DESKTOP form and is unchanged.
              // The phone gets what identifies the set, on the line above.
              <p
                data-set-provenance-long
                className="hidden font-mono text-[10px] md:block"
                style={{ color: "var(--fg-locked)" }}
              >
                {setPageCopy.head.meta(
                  code,
                  releasedAt ? releasedAt.slice(0, 10) : "an unrecorded date",
                  sections.baseTotal,
                  sections.extrasTotal,
                )}
              </p>
            ) : null}
            {/* Move 1 again, from the other side. The note keeps its own line at desktop,
                and keeps standing alone when the set is unindexed — there `base` has no
                figure to ride on, and the phone form above renders nothing at all. */}
            <p
              data-set-ratio-note
              className={`font-mono text-[10px] ${sections.indexed ? "hidden md:block" : ""}`}
              style={{ color: "var(--fg-locked)" }}
            >
              {setPageCopy.head.ratioNote}
            </p>
          </div>
        </div>

        {/* Keyed on the fingerprint so a refresh remounts it: without the key the strip
            kept rendering its old message against a grid that had already updated. */}
        {/* Rendered at BOTH heights, and deliberately not one of the members the collapse
            hides: §31 rules that the message must not be collapsed away. The head therefore
            grows by exactly this strip while it is firing, which is a height change under
            the reader — allowed here and nowhere else on this surface, because a delta is
            news and the §28 three-row rule is about the filter state.

            What "not collapsed away" can mean has a limit, and it is the same limit at both
            widths now. `deltaFiring` forbids a collapse, so a firing strip restores the full
            head — but the open head is not pinned, so a reader far down the grid gets it
            restored at the TOP of the document rather than under their eyes. That is the
            phone's shipped behaviour and desktop's too since the pin became conditional
            there; the alternative is a ~300px header arriving over the cards a reader is
            mid-way through, which is the defect the conditional pin exists to remove. The
            message is not lost — it is where the head is. */}
        {/* `flow-root`, so the strip's own `mt-[10px]` is INSIDE this box. Without a
            formatting context that margin collapses through the wrapper, and the height
            subtracted from the reserve is 10px short of what the strip actually occupies —
            leaving the reserve 10px too tall once a delta fires and clears. */}
        <div data-set-delta className="flow-root">
        <DeltaStrip
          // The set code is in the key: two sets with the same indexed state and the same
          // ownership fingerprint — two you hold nothing from — would otherwise reuse the
          // instance, and one set's message could paint on the other.
          key={`${code}:${indexedKey}:${ownedFingerprint}`}
          code={code}
          fingerprint={ownedFingerprint}
          indexed={sections.indexed}
          recheckKey={`${modalGeneration}:${artGeneration}`}
          onFiring={onDeltaFiring}
        />
        </div>

        {/* Hidden as a WHOLE when shy, not just its contents: the wrapper's own 10px
            margin is real height, and an empty box with a margin is exactly the kind of
            slack that made the collapsed head 85px rather than 75. */}
        <div data-set-shy-hides className={shy ? "hidden" : "mt-[10px]"}>
          {complete ? (
            // At 100% the extras are the only thing left, so the count is promoted into
            // the head and the same cost strip re-scopes to them.
            sections.extrasTotal > sections.extrasOwned ? (
              <p className="mb-[8px] font-mono text-[11px]" style={{ color: "var(--fg-muted)" }}>
                {setPageCopy.complete.extrasCount(sections.extrasOwned, sections.extrasTotal)}
                {" · "}
                {setPageCopy.complete.extrasGloss}
              </p>
            ) : (
              <p className="mb-[8px] font-mono text-[11px]" style={{ color: "var(--success)" }}>
                {setPageCopy.complete.noExtras}
              </p>
            )
          ) : null}

          {/* Rendered whenever the scoped SECTION has cells, not whenever the filters
              left a missing one. Filters matching nothing is a zero figure the handoff
              draws; a complete set with no extras at all has no section to cost, and that
              is the case where the strip goes. The link is what drops out in between. */}
          {/* Nothing left in the scoped section means the terminal state, not a zero
              figure: a complete set whose extras are all owned would otherwise read
              "over 0 of the 0 you are missing" beside "Nothing left in this set". */}
          {/* The money is not on the collapsed bar: it is not acted on mid-scroll, and it
              is the single largest member of the head. HIDDEN with the wrapper above rather
              than unmounted — unmounting threw away the reader's expanded disclosure and
              any focus in it, and the head that came back was a different height from the
              one the reserve was holding. */}
          {(complete
            ? sections.extrasTotal - sections.extrasOwned
            : sections.baseTotal) > 0 ? (
          <CostStrip
            cost={cost}
            href={buyHref}
            sendCount={sending.length}
            sendCapped={sendCapped}
            scope={complete ? "extras" : "base"}
            staleAsOf={staleAsOf}
          />
          ) : null}
        </div>

        {/* Phone: `Filters` plus `Missing` in the sticky row, with the rest behind the
            sheet. The desktop rack was previously mounted directly at every width, which
            put five 15px pips below the 44px target and wrapped the controls into the
            head. */}
        {/* Row 1 of three. The rack is three FIXED rows — controls, chips, result — and its
            height never depends on THE FILTER STATE, which matters more here than on any
            other route: this bar lives inside a sticky head, and every height change under
            a reader's thumb moves the grid they are reading. `flex-nowrap`, because a
            control landing on its own line is the same defect by another route.

            Row 3 is absent on an unindexed set, which is not an exception to that: an
            unindexed set has no cells in either section, so there is no count to state and
            no grid beneath the head for a height change to move. The invariant is about the
            rack not moving what the reader is reading, and there is nothing there to move. */}
        {/* Addendum 2 §1: at `md` the collapsed head IS this row, kept mounted, with an
            identity prefix ahead of it. The phone's bar had to be its own row because its
            controls change identity across the threshold — the field becomes a button back
            to the head, and `Filters` is a sheet trigger with no desktop counterpart. At
            `md` nothing changes identity, so hiding the row and drawing a replacement would
            mount a second field behind a `display:none` twin: two controls with one
            accessible name, which §29 forbids on this page and which every one-mount
            control in this rack exists to avoid. Keeping the nodes also keeps focus, the caret, the 150ms
            debounce and an open rarity panel across the threshold, with nothing to rescue. */}
        <div
          /* A hidden member on the PHONE and not at `md`, which is why the marker is
             conditional rather than constant. The gate is about what DISAPPEARS: at `md` this
             row is the collapsed head, so marking it there would hold the head open for as
             long as the reader's cursor is in the field it is drawing. Below `md` it goes,
             and it carries the search field — so without this, focus in the field and a
             scroll past the threshold destroyed the caret, which is the exact case the gate
             exists for. */
          data-set-shy-hides={isDesktop ? undefined : ""}
          className={`flex-nowrap items-center gap-[8px] ${shyDesktop ? "h-[34px]" : "mt-[10px]"}`
            + ` ${shy && !isDesktop ? "hidden" : "flex"}`}
        >
          {/* 34px is the canvas's own figure for this row, and it is 32px controls with a
              pixel either side — not a clip being avoided. (The lit pip's ring is a
              `box-shadow`, which takes no layout and would not be clipped by a row carrying
              no `overflow` of its own.) Not 44: that is the phone's target, and these
              controls are 32px at `md` in the open head, so growing them here would be a
              second skin for the same rack. */}
          {shyDesktop ? (
            <div
              data-set-head-prefix
              className="flex min-w-[120px] shrink items-center gap-[8px] self-stretch
                         border-r border-r-[color:var(--border)] border-[color:var(--border)] pr-[8px]"
            >
              <SetIcon
                uri={iconSvgUri}
                size={22}
                desktopSize={22}
                tone={complete ? "success" : "muted"}
                ringed={complete}
              />
              {/* An `h1`, not a span, and for the phone bar's reason: the open block is
                  `display:none` while the head is collapsed, which takes its heading out of
                  the accessibility tree, so heading navigation would have no page heading at
                  all for the whole collapsed state. Only ever one of the two is exposed. */}
              {/* 15px, which is the canvas's own figure for this prefix and a point above the
                  phone bar's 14 — the desktop bar carries five controls beside the name and
                  the name is what identifies which set they are filtering. */}
              <h1
                className="min-w-0 flex-1 truncate font-display text-[15px]"
                style={{ color: complete ? "var(--success)" : "var(--fg)" }}
              >
                {complete ? setPageCopy.complete.heading(name) : name}
              </h1>
              {/* Every indexed set, the complete one included — a complete base run can
                  still have extras and enough cells to scroll, and the ratio is the
                  reader's progress figure exactly where the head has stopped showing it
                  anywhere else. */}
              {sections.indexed ? (
                <span
                  className="shrink-0 font-mono text-[11px]"
                  style={{ color: "var(--fg-muted)" }}
                  aria-label={setPageCopy.head.ratioAria(sections.baseOwned, sections.baseTotal)}
                >
                  {sections.baseOwned} / {sections.baseTotal}
                </span>
              ) : null}
            </div>
          ) : null}
          {/* The field leads the row and is the ONLY child that shrinks — `min-w-0` on it
              and `shrink-0` on everything else is what keeps the row from wrapping. At
              390px the row is tight: `Filters` carries a badge, and the compact `Sort`
              trigger took the slot `Missing` left when H13 moved ownership into the sheet.
              That trigger's own width was never re-derived against the 132px floor —
              probe-sets measures the field's resolved width rather than asserting a sum.

              Never in the sheet. A second field behind `Filters` is two controls with one
              accessible name — the defect this page's one-mount controls exist to avoid —
              and the badge does not count it, because it is visible beside it. */}
          {/* `min-w-[132px]`, which is the chassis's floor and not decoration: `min-w-0`
              alone lets this shrink to nothing on a narrower phone or beside a longer
              rarity value, and the 173px-at-390 arithmetic the row is built on assumes a
              132 minimum under it. The INPUT stays shrinkable; this item does not go below
              the floor. */}
          <div data-set-search-slot className="min-w-[132px] flex-auto">
            <SearchField
              ref={searchRef}
              // 9px, not 6: the field's own box is the 24px trailing slot plus its padding
              // and borders, and at 6 that is 38px — under the phone's 44px target. The row
              // once measured 44 only because the Missing toggle beside it was 44, which was
              // that toggle's height and not this control's. Desktop keeps 4.
              containerClassName="px-[10px] py-[9px] md:py-[4px]"
              // 16px on the phone is not a type choice: iOS Safari zooms the page when a
              // text input under 16px takes focus, which would throw away the 390px
              // arithmetic this row is built on. The compact size starts at `md`.
              className="text-[16px] md:text-[12.5px]"
              value={draft}
              onChange={(e) => typeQuery(e.target.value)}
              // The phone slot is 173px and the icon, padding and clear leave far less to
              // the text, so the long placeholder truncates there. The ACCESSIBLE NAME is
              // the full one at both widths — it is what carries the set.
              placeholder={
                isDesktop ? setFilterCopy.search.placeholder : setFilterCopy.search.placeholderShort
              }
              aria-label={setFilterCopy.search.ariaLabel(name)}
              autoComplete="off"
              spellCheck={false}
              trailing={
                /* The field's own scoped clear, which the chip line deliberately does not
                   duplicate: a query draws no chip, and at one active control there is no
                   `Clear all filters` either — so without this the only way out of a search
                   was to select the text and delete it. Always rendered and hidden by
                   `visibility` rather than unmounted, so its 22px does not reflow the input
                   as the last character goes. */
                <button
                  type="button"
                  onClick={clearQuery}
                  aria-label={setFilterCopy.search.clear}
                  // TRIMMED, like every other reading of this value — serialisation,
                  // matching, the result line. Typing only spaces left the grid unfiltered
                  // under an enabled, focusable clear for a query that filtered nothing.
                  // The DRAFT, not the applied query: the × belongs to the text in the
                  // box, and reading the applied value left it hidden for the 150ms after
                  // the first character — the moment a reader is most likely to reach for
                  // it, and a control that appears late is worse than one that never does.
                  aria-hidden={!isQueryActive(draft) || undefined}
                  tabIndex={isQueryActive(draft) ? 0 : -1}
                  className="flex-none rounded-full flex items-center justify-center
                             bg-[color:var(--border)] text-[color:var(--fg-muted)]"
                  style={{
                    // 24px, the minimum target size. On a phone this is the only escape
                    // when the search is the sole active control — the chip line shows no
                    // Clear at one control — so it cannot be the smallest thing on screen.
                    width: 24, height: 24, fontSize: 12,
                    visibility: isQueryActive(draft) ? "visible" : "hidden",
                  }}
                >
                  ×
                </button>
              }
            />
          </div>

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            className="md:hidden inline-flex shrink-0 min-h-[44px] items-center gap-[6px] rounded-[6px]
                       px-[12px] text-[13px] border border-[color:var(--border)]
                       text-[color:var(--fg-body)]"
          >
            {setFilterCopy.label}
            {badgeCount > 0 ? (
              <span
                aria-label={setFilterCopy.countBadgeAria(badgeCount)}
                className="inline-flex h-[18px] min-w-[18px] items-center justify-center
                           rounded-full px-[5px] font-mono text-[10px]
                           bg-[color:var(--accent)] text-[color:var(--bg)]"
              >
                {badgeCount}
              </span>
            ) : null}
          </button>

          {/* The colour, rarity and ownership controls are desktop-only here; the phone's
              are in the sheet. Each is MOUNTED on the breakpoint rather than CSS-hidden, so
              one control with one accessible name is ever in the document.

              The colour control is the commander rack's, mounted and never forked (H10): the
              chassis's pips with the `Any` / `Exactly` modifier inside the same box behind a
              hairline. The pips it carries are the app's one colour control — Scryfall's own
              full-colour symbols, undimmed, with a 2px --accent ring as the entire lit
              treatment — so a fork here is how six themes of measurement get re-derived by
              hand. */}
          {/* Layout only: `hidden md:flex` is the width gate, as it was for the bare pips,
              and the wrapper exists so the control sits as one flex item beside the trigger.
              `display:none` takes the hidden copy out of the accessibility tree, and the
              sheet's copy is mounted only while the sheet is open on a phone. `shrink-0` is
              the search field's doing: it is the one child of this row that may compress. */}
          <div
            data-set-colour
            // Collapsed below 1000px, the Any / Exactly segments and their hairline go: the
            // row has no room for them beside the set name (d9, 2026-10-03). Still applied,
            // and the open head draws them. NEVER while they hold keyboard focus: a head that
            // collapsed wide and was then narrowed (a resize, a zoom) would otherwise hide the
            // radio under the reader's keyboard. In CSS so it holds through every path to the
            // band, which the scroll-time focus guard alone does not see.
            className={`hidden shrink-0 md:flex${shy ? ` ${NARROW_HIDE}` : ""}`}
          >
            <ColourControl
              wide
              // LOWERCASE in and out, the rack's own case: the control rebuilds the selection
              // by testing its lowercase hues against what it was handed, so uppercase here
              // would drop every lit hue on the next press. This page keeps colours uppercase
              // everywhere else (the URL, `colorIdentity`), hence the lift on the way back.
              colors={filters.colors.map((c) => c.toLowerCase())}
              match={filters.match}
              unavailable={unavailableColours}
              shyHidesMatch
              onColorsChange={setColours}
              onMatchChange={(m) => setFilters({ ...filters, match: m })}
            />
          </div>

          {/* Four values, MULTI-select since H13 — `/collection`'s Type control in every
              respect: a panel of toggles with counts, zero-count rows disabled, the trigger
              counting what is on, and the footer's `n of 4 on` beside `Clear rarity`, which
              the single-select mode had to drop. */}
          {/* Mounted at `md`, which is this page's own switch and not the chassis frame's
              1000. The chassis picks 1000 from `/collection`'s EIGHT controls summing to
              987px; this row has five — colour, rarity, ownership, sort and the field.

              MOUNTED on the breakpoint, never CSS-hidden. `FilterPanel` holds its own open
              state and picks popover or sheet off the same `useIsDesktop`: hidden with
              `display:none` it would keep that state across a resize, put its mobile dialog
              inside an invisible ancestor, and hand focus to a panel nobody can see. The
              phone's rarity control is the chip group in the sheet, and this is the other
              half of that one-control-per-width rule. */}
          {/* Wrapped, because `FilterPanel`'s own root is a plain `<div className="relative">`
              with the default `flex-shrink: 1` — so without this the rarity control joined
              the compression and the field stopped being the only child that shrinks. */}
          {isDesktop ? (
            <div data-set-rarity className="shrink-0">
            <FilterPanel
              copy={setFilterCopy.rarityPanel}
              searchable={false}
              selectionMode="multi"
              widthPx={280}
              // 44px rows, which is the chassis contract and not this mount's choice: the
              // panel defaults desktop rows to 40, and `/decks` passes 44 for the same
              // reason. ADDENDUM-STATES §4 states it too.
              desktopRowMinPx={44}
              // Kept, unlike `/collection`'s Type, whose `footerTotal` counts cards. Here the
              // total is the panel's own four rows, so `2 of 4 on` is a true statement.
              footerStatus
              options={rarityOptions.map((o) => ({
                code: o.code,
                // Title Case, the chip group's register. The trigger COUNTS since H13 and
                // never prints an option's name, so the lowercase these carried for the
                // trigger's `Rarity · uncommon` has nothing left to match.
                label: setFilterCopy.rarity.options[o.code],
                count: o.count,
                disabled: o.disabled,
              }))}
              selected={filters.rarities}
              onToggle={(code) =>
                setFilters({ ...filters, rarities: toggleRarity(filters.rarities, code) })}
              onClear={() => setFilters({ ...filters, rarities: [] })}
            />
            </div>
          ) : null}

          {/* CSS-gated like the colour control, as `MissingOnlyToggle` was: no open state to
              strand across a resize, so nothing to gain from a remount and a hydration jump to
              lose on desktop. Hidden, it is out of the accessibility tree, and the phone's
              copy is the sheet's chip group. */}
          {/* In the OPEN head only, at every width (d9, 2026-10-03): the collapsed row has no
              room for it beside the set name. Still applied, kept in the URL, and lit again
              on expand. A shy-hides member on desktop, so keyboard focus on it holds the head
              open; on the phone the whole row already is one. */}
          <div
            data-set-own
            data-set-shy-hides={isDesktop ? "" : undefined}
            className={`hidden shrink-0 ${shyDesktop ? "" : "md:flex"}`}
          >
            <OwnershipToggles
              options={ownOptions}
              own={filters.own}
              onPick={(o) => setFilters({ ...filters, own: pickOwn(filters.own, o) })}
            />
          </div>

          {/* The order (H16): `/collection`'s Sort control, the same `FilterPanel` in
              `single` mode with the same props, where picking the chosen order again reverses
              it. ONE mount at both widths, keyed on the form for `/collection`'s reason — a
              panel holds its own `open`, and a sheet opened on a phone would otherwise still
              be open as a popover after a resize.

              On the phone it takes `Missing`'s old slot on row 1 and shows the field alone
              ("Number", "Price"), the full "Field · direction" label having overflowed the
              358px row by 48-72px (round 5 finding, measured). Direction stays in the
              accessible name and in the panel's chosen row. */}
          {/* Open head only, as the ownership toggles above are (d9, 2026-10-03): the order
              stays applied while collapsed. */}
          <div
            data-set-sort
            data-set-shy-hides={isDesktop ? "" : undefined}
            className={`shrink-0${shyDesktop ? " hidden" : ""}`}
          >
            <FilterPanel
              key={`sort-${isDesktop ? "wide" : "compact"}`}
              desktopRowMinPx={44}
              compact={!isDesktop}
              // Round 5 finding: the full "Field · direction" label overflowed the 390px
              // row by 48-72px (measured), with nothing left to shrink. Neither /collection
              // nor /decks faces this — their compact Sort sits in the filter sheet, not
              // inline on a tight row — so there is no shared abbreviated form to reuse.
              // The compact trigger shows the field alone; `oneName` (the accessible name,
              // composed by `FilterPanel` itself from the option's label and hint, never
              // from `triggerOne`'s return) still carries the direction.
              copy={isDesktop
                ? setFilterCopy.sort.panel
                : { ...setFilterCopy.sort.panel, triggerOne: (name: string) => name.split(" · ")[0] }}
              options={sortOptions}
              selected={[filters.sort]}
              selectionMode="single"
              // Exactly one order is always chosen, so a lit border would say "on" about a
              // control that is never off — `/collection`'s Sort passes the same.
              selectionOrnament={false}
              showCounts={false}
              searchable={false}
              widthPx={260}
              footerStatus={false}
              onToggle={(code) => {
                const next = nextSetSort({ sort: filters.sort, dir: filters.dir }, code as SetSort);
                setFilters({ ...filters, sort: next.sort, dir: next.dir });
                // Authored, not lowercased — the labels carry "Number" and "Price", and the
                // directions their own words — the same rule `/collection`'s onToggle states.
                sortAnnounceSeq.current += 1;
                setSortAnnounce({
                  text: `Sorted by ${setFilterCopy.sort.options[next.sort]}, `
                    + `${setFilterCopy.sort.direction[next.sort][next.dir]}.`,
                  seq: sortAnnounceSeq.current,
                });
              }}
              onClear={() => {}}
              onAnnounce={(text) => {
                sortAnnounceSeq.current += 1;
                setSortAnnounce({ text, seq: sortAnnounceSeq.current });
              }}
            />
          </div>
        </div>

        {/* Row 2 — the chip line, present at rest rather than conditionally rendered. The
            line IS the invariant that keeps the head's height constant; collapsing it is
            the bug the three-row rule exists to forbid.

            ONE line at every width, scrolling sideways and never wrapping, and Clear is
            outside that scroll — so the clipped item is a chip and never the way out.
            Desktop used to wrap, on the claim that three dimensions capped the widest line
            at ~380px. H10 and H13 broke the claim: `Exactly`, one chip per rarity and
            missing-only make seven chips beside an always-drawn Clear, about 770px, and a
            wrap across the 768-900 band grew the sticky head past its measured rest height.
            So desktop scrolls the way the phone always has. */}
        {/* The chip line is not on the collapsed bar: §31 rules it out, and the `Filters`
            badge already carries the state from the badge count. It is hidden rather
            than unmounted so the horizontal scroll position and the focus inside it
            survive a collapse and a restore. */}
        <div
          data-set-chips
          data-set-shy-hides
          className={`mt-[8px] items-center gap-[6px] ${shy ? "hidden" : "flex"}`}
          style={{ minHeight: 22 }}
        >
          {/* Clear sits OUTSIDE the scrolling strip, which is how "the clipped item is a
              chip and never Clear all filters" is actually delivered. Inside it, Clear is
              the last flex item and a phone's overflow starts at the LEADING edge — so the
              only way out of three filters was off-screen until the reader discovered
              horizontal scrolling. Scroll the chips; keep the exit still. */}
          {/* 44px tall at phone, and that is not spacing: `overflow-x-auto` makes the other
              axis scroll too, so a 44px pseudo target centred in a 22px row is CLIPPED to
              22 and the chip keeps only its small × box. The band gives the overlay
              somewhere to be.

              Desktop scrolls too now, at its own content height rather than the band —
              44px there would grow the head by a line, which is the motion this row exists
              to prevent. `overflow-y-hidden` stops the pseudo targets that hang past that
              height from making the strip scroll vertically; a pointer needs the chip, not
              a 44px margin around it. Never `flex-wrap`, at any width. Its scrollbar is hidden,
              as `builder-tabs.tsx` hides its own: a classic (non-overlay) scrollbar takes
              its thickness out of the strip's height and would grow the head the moment
              the chips overflowed. */}
          <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-[6px] overflow-x-auto
                          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                          h-[44px] md:h-auto md:overflow-y-hidden">
          {chips.length === 0 ? (
            <span
              className="font-mono text-[11px] leading-[14px] py-[3px] whitespace-nowrap"
              style={{ color: "var(--fg-faint)" }}
            >
              {isQueryActive(effective.query)
                ? setFilterCopy.noOtherFilters
                : chassisCopy.chips.none}
            </span>
          ) : (
            chips.map((chip) => <FilterChipPill key={chip.key} chip={chip} />)
          )}

          </div>

          {/* ALWAYS drawn since H13, the chassis's own Clear (`filter-chassis.tsx`): `ml-auto`
              at the line's end, and inert — `disabled`, `--fg-locked`, no pointer — when
              nothing is on, rather than appearing only past one active control. It was the
              one control on this line that came and went, and a way out the reader has to
              wait for is one they learn not to look for. Not a GhostButton: the chassis's
              answer to "what should this button look like" is that it is not a button on
              that row at all. */}
          <button
            type="button"
            disabled={!clearLive}
            onClick={() => clearAll()}
            aria-label={setFilterCopy.clearAllAria}
            className={[
              "relative ml-auto shrink-0 border-0 bg-transparent p-0",
              "font-mono text-[11px] leading-[14px] underline whitespace-nowrap",
              "after:absolute after:left-1/2 after:top-1/2 after:h-[44px]",
              "after:min-w-[44px] after:w-full after:-translate-x-1/2",
              "after:-translate-y-1/2 after:content-['']",
              clearLive
                ? "cursor-pointer text-[color:var(--fg-muted)]"
                : "cursor-default text-[color:var(--fg-locked)]",
            ].join(" ")}
          >
            {chassisCopy.chips.clearAll}
          </button>
        </div>

        {/* The phone sheet. Same URL-backed state as the rack above it, and the same
            controls at a 44px target. */}
        {sheetOpen && !isDesktop ? (
          <FilterSheet onClose={() => setSheetOpen(false)}>
            {/* Colour leads every sheet in the app, and it is the commander rack's control
                here too (H10), in its sheet form: the pips, then the `Any` / `Exactly`
                modifier at a 44px target, each under its own caption. */}
            <div className="mb-[16px]">
              <ColourControl
                wide={false}
                colors={filters.colors.map((c) => c.toLowerCase())}
                match={filters.match}
                unavailable={unavailableColours}
                onColorsChange={setColours}
                onMatchChange={(m) => setFilters({ ...filters, match: m })}
              />
            </div>

            <p className="font-mono text-[10px] mb-[10px]" style={{ color: "var(--fg-faint)" }}>
              {setFilterCopy.rarity.label}
            </p>
            {/* `/collection`'s Type group, exactly (H13): `SheetChip` pills with their
                counts, multi-select, a zero-count value listed and disabled with the reason
                in its name. Wrapping to two rows is allowed HERE and nowhere else — a sheet
                may change height, the control row inside the sticky head may not. */}
            <div
              role="group"
              aria-label={setFilterCopy.rarity.label}
              className="mb-[16px] flex flex-wrap gap-[8px]"
            >
              {rarityOptions.map(({ code: r, count, disabled }) => (
                <SheetChip
                  key={r}
                  label={setFilterCopy.rarity.options[r]}
                  count={count}
                  on={filters.rarities.includes(r)}
                  disabled={disabled}
                  unavailableAria={setFilterCopy.rarityPanel.optionAriaUnavailable(
                    setFilterCopy.rarity.options[r],
                  )}
                  onClick={() =>
                    setFilters({ ...filters, rarities: toggleRarity(filters.rarities, r) })}
                />
              ))}
            </div>

            {/* Ownership moved here from row 1 (H13): the drawer holds every filter, and the
                row keeps the field, `Filters` and the order. The same chips as rarity, with
                the counts the options carry; the two are mutually exclusive, so pressing
                one clears the other. */}
            <p className="font-mono text-[10px] mb-[10px]" style={{ color: "var(--fg-faint)" }}>
              {setFilterCopy.ownership.heading}
            </p>
            <div
              role="group"
              aria-label={setFilterCopy.ownership.heading}
              className="mb-[16px] flex flex-wrap gap-[8px]"
            >
              {ownOptions.map((o) => (
                <SheetChip
                  key={o.own}
                  label={setFilterCopy.ownership[o.own].short}
                  count={o.count}
                  on={filters.own === o.own}
                  disabled={o.disabled}
                  unavailableAria={setFilterCopy.ownership.unavailable(
                    setFilterCopy.ownership[o.own].short,
                  )}
                  onClick={() => setFilters({ ...filters, own: pickOwn(filters.own, o.own) })}
                />
              ))}
            </div>

            <div className="flex items-center gap-[10px]">
              {/* The same search-aware name the chip line's Clear carries. This one clears
                  the query too, and the field is OUTSIDE the `aria-modal` sheet — so
                  without it a screen-reader user has no way to know their search is about
                  to go with their filters. */}
              <GhostButton
                className={ACTION_SIZE}
                onClick={() => clearAll(false)}
                disabled={!anyFilterOn}
                aria-label={setFilterCopy.clearAllAria}
              >
                {chassisCopy.chips.clearAll}
              </GhostButton>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="ml-auto min-h-[44px] rounded-[8px] px-[16px] text-[13px]
                           bg-[color:var(--fg)] text-[color:var(--bg)]"
              >
                {setFilterCopy.sheetPrimary(shown.length)}
              </button>
            </div>
          </FilterSheet>
        ) : null}

        {/* Row 3, and the BOX is unconditional even though the sentence is not — which is
            what makes "three rows, always all three" true rather than argued. No result
            line while the catalog is unindexed: every cell falls out of both sections, so
            the summary would read "0 cells · 0 yours, 0 missing" beside an empty state
            correctly saying the set has not been indexed. But a set that becomes indexed
            under a visible sticky head would otherwise grow the head by a line. */}
        {/* TWO lines' worth at phone, one at desktop. `minHeight: 16` was a minimum, and
            the missing-only line — "N missing · numbers skip, because the cards you own are
            hidden" — wraps in 358px of phone content, so toggling that filter grew row 3
            and moved the grid under the reader's thumb: the exact motion the fixed-height
            rule exists to prevent, arriving through the row meant to guarantee it. Desktop
            has 1112px and never wraps. */}

        {/* `sr-only` when shy, never `hidden`, and never a second region beside it.
            `Filters` IS reachable from the collapsed bar, so the result count still
            changes there — unmounting the only `role="status"` left a screen-reader user
            filtering into silence. One node held throughout, so the swap is a class change
            rather than a remount and nothing is re-announced by collapsing itself.
            `sr-only` takes no layout, so the 52px bar is unaffected. */}
        <div
          className={shy ? "sr-only" : "mt-[8px] min-h-[32px] md:min-h-[16px]"}
          data-set-result
        >
        {sections.indexed ? (
        <>
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          // `leading-[16px]` stated rather than inherited, for the same reason the chassis
          // states its own: Tailwind's 1.5 on 11px is 16.5, so two lines are 33 and no
          // whole-number reserve can cover them. At 16 the wrapped line is exactly 32.
          className="font-mono text-[11px] leading-[16px]"
          style={{ color: "var(--fg-muted)" }}
        >
          {effective.own === "missing"
            ? setPageCopy.result.missingOnly(shown.length)
            : effective.own === "owned"
              ? setPageCopy.result.ownedOnly(shown.length)
            : narrowing
              // The classified population, not every row: an unclassified printing is
              // rendered in neither section, so `cells.length` promised cells the page
              // does not draw.
              ? setPageCopy.result.filtered(
                  shown.length,
                  sections.base.length + sections.extras.length,
                )
              : (
                  <>
                    {/* Two forms of one line. The phone keeps the count and drops the
                        subtraction the head's ratio already made; desktop is unchanged.
                        Both live inside the same `role="status"`, so a filter change
                        announces once whichever is mounted. */}
                    <span className="md:hidden">
                      {setPageCopy.result.restShort(shown.length)}
                    </span>
                    <span className="hidden md:inline">
                      {setPageCopy.result.rest(
                        shown.length,
                        shown.filter((c) => c.owned).length,
                        // The whole displayed population, not the cost strip's scoped one:
                        // this line describes the page, and the strip says what it is
                        // costing.
                        shown.filter((c) => !c.owned).length,
                      )}
                    </span>
                  </>
                )}
          {/* Marked for the focus gate and always mounted, though its CONTENTS are not: the
              gate asks whether focus is inside something about to disappear, and at decision
              time this link is still here. Unmounting it took focus to the body, which was
              the settled behaviour for this whole class before the gate existed and is now
              the one case the gate would have missed. The wrapper draws nothing of its own —
              the separator goes with the link, as it always did. */}
          <span data-set-shy-hides>
          {shownExtras.length > 0 && !shy ? (
            <>
              {" · "}
              {/* The whole clause goes, separator included: left behind, the live region
                  announced a dangling "·" after the result count on every filter change.

                  NOT RENDERED while the region is `sr-only`. `tabIndex={-1}` was the first
                  answer and it only stops FUTURE tabbing: a reader already focused on the
                  link keeps it as the active element when the collapse clips the region to
                  a 1px box, which is the same invisible-focus defect one step later.
                  Unmounted, focus falls to the body like everything else the collapse
                  hides — the settled behaviour for this whole class. The region stays
                  sr-only to keep ANNOUNCING; it was never there to keep offering. */}
              <a
                href="#extras"
                className="text-[color:var(--accent)] hover:underline"
              >
                {setPageCopy.sections.jump}
              </a>
            </>
          ) : null}
          </span>
        </p>
        {/* A SEPARATE region from the one above (d9's ruling, round 6), never joined
            to it: that one announces completion and must keep doing so while `shy`
            hides it visually, which is a different lifecycle than a sort press. This
            one is ALWAYS `sr-only`, never cleared on a timer — `ResultLine`'s own
            shape, a visible line untouched and a dedicated live span beside it — and
            `seq` is what the key is for, so a repeated sentence (the same order
            pressed twice) is a new node and genuinely re-announced rather than
            silently reusing one whose content did not change. Gated behind the same
            "unindexed set has no status region at all" condition as the line above,
            since there is nothing to sort on a set with no checklist either. */}
        <span
          key={sortAnnounce.seq}
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {sortAnnounce.text}
        </span>
        </>
        ) : null}
        </div>
      </div>

      {/* The RESERVE, as a SIBLING rather than a wrapper.
          A sticky element sticks only within its containing block, so wrapping the head in
          a box the height of the open head made that box the limit: past 288px of scroll
          the head was pushed out of the viewport instead of staying over the grid, and the
          whole feature stopped existing exactly where it was supposed to start. The head
          now sits in the same container as the grid, and the space the collapse gives up
          is given back by a spacer beside it.
          `aria-hidden` and no text: it is layout, and a screen reader has nothing to read
          in it. */}
      {/* ALWAYS mounted, and 0px while the head is open. Conditioned on `shy` it was
          removed in the same commit that revealed the open head, so the layout effect had
          no node left to compensate with if the two heights disagreed — a filter changed
          through the collapsed bar's sheet can leave the open head a different size from
          the one the reserve is holding. A zero-height box costs nothing and removes the
          question. */}
      <div aria-hidden="true" data-set-head-reserve ref={spacerRef} />

      {!sections.indexed ? (
        // The catalog has nothing to count yet: no printings of this set, or a published base
        // run its rows do not match while a refresh lands. Without this the page read "no
        // cards match your filters", which blames the reader for a catalog that has not been
        // indexed. A set with no base run never reaches here (`sectionsOf`).
        <EmptyState>
          <EmptyStateTitle>{setPageCopy.notIndexed.heading(name)}</EmptyStateTitle>
          <EmptyStateBody>{setPageCopy.notIndexed.body}</EmptyStateBody>
          <div className="mt-[16px]">
            <GhostButton href="/collection/sets" className={ACTION_SIZE}>
              {setPageCopy.notIndexed.action}
            </GhostButton>
          </div>
        </EmptyState>
      ) : shown.length === 0 ? (
        <ZeroResults
          // Good news only when the OTHER filters matched at least one cell. An empty
          // intersection is not "you own all of these"; it is a filter combination with
          // nothing behind it.
          missingOnly={effective.own === "missing" && matchedIgnoringOwn.length > 0}
          // The cards that match the OTHER filters and are owned — which is what "you hold
          // all of them" means here. Counting the whole base run put a number in the
          // sentence that had nothing to do with what the reader filtered to.
          ownedCount={matchedIgnoringOwn.filter((c) => c.owned).length}
          setName={name}
          query={isQueryActive(effective.query) ? effective.query.trim() : ""}
          // Whether anything BUT the query is narrowing, which decides the second clause of
          // the search branch's body — a sentence claiming other filters are on when they
          // are not is worse than no sentence.
          // Owned-only counts here like any other filter: zero under it is not good news, it
          // is a combination with nothing you own behind it, and falls to the ordinary state.
          otherFiltersOn={filtersOn > 0}
          // Turns missing-only off and keeps the rest: the promised correction is "show
          // the ones you DO own that match", not "discard what you filtered to".
          onShowAll={() => setFilters({ ...filters, own: "all" })}
          onClearSearch={clearQuery}
          onClearAll={() => clearAll()}
        />
      ) : (
        <>
          <Section
            title={setPageCopy.sections.base}
            ratio={`${sections.baseOwned} / ${sections.baseTotal}`}
            cells={shownBase}
            priceFor={priceFor}
            newest={newest}
            siblings={siblingIds}
            setCode={code.toUpperCase()}
            onOpenCard={open}
          />
          {shownExtras.length > 0 ? (
            <Section
              id="extras"
              title={setPageCopy.sections.extras}
              // Its own ratio, one type step down, and never folded into the headline.
              ratio={`${sections.extrasOwned} / ${sections.extrasTotal}`}
              cells={shownExtras}
              priceFor={priceFor}
              newest={newest}
              siblings={siblingIds}
              setCode={code.toUpperCase()}
              onOpenCard={open}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * The phone filter sheet. `useDialogA11y` is the shipped answer for every role="dialog"
 * surface in this app — focus trap, Escape, focus return AND the page scroll lock — and a
 * hand-rolled version here got the first three and missed the fourth, which is exactly the
 * kind of gap a shared hook exists to close.
 */
function FilterSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const sheet = useRef<HTMLDivElement>(null);
  useDialogA11y(sheet, onClose);

  return (
    // A scrim, as the shipped deck sheet has: without one an aria-modal dialog left the
    // page behind it pointer-active, so a tap could work a control the sheet was covering.
    // z-50 for the same reason that sheet gives — the phone tab bar is z-40 and paints
    // later, so at z-40 it sits over this sheet's own footer.
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(16,13,10,0.74)]"
      />
      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-label={setFilterCopy.label}
        tabIndex={-1}
        className="relative z-10 rounded-t-[14px] px-[16px] pt-[14px] pb-[20px]"
        style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Ownership on the desktop rack (H12): `Missing only` and `Owned only` as one group of two
 * toggles, the shape `MissingOnlyToggle` drew for one. Mutually exclusive, so at most one is
 * pressed, and pressing the lit one returns to every cell. The phone's copy is the sheet's
 * chip group, and the two are never both in the accessibility tree.
 *
 * Named by their visible labels, with `aria-pressed` carrying the state. The retired toggle
 * announced the PAGE's state as its name ("Showing every card in the set"), which with two
 * buttons would have been two names nobody can see.
 */
function OwnershipToggles({
  options, own, onPick,
}: {
  options: readonly { own: "missing" | "owned"; count: number; disabled: boolean }[];
  own: Ownership;
  onPick: (value: "missing" | "owned") => void;
}) {
  return (
    <div role="group" aria-label={setFilterCopy.ownership.heading} className="flex gap-[6px]">
      {options.map((o) => {
        const on = own === o.own;
        return (
          <button
            key={o.own}
            type="button"
            aria-pressed={on}
            // `aria-disabled`, never `disabled`, the rarity panel's rule: a real `disabled`
            // drops focus the instant the other filters zero this option, and a lit option
            // is never disabled, or it could not be turned off.
            aria-disabled={o.disabled || undefined}
            onClick={() => {
              if (!o.disabled) onPick(o.own);
            }}
            className={[
              "shrink-0 min-h-[32px] rounded-[6px] px-[10px] text-[12px] border",
              o.disabled
                ? "cursor-default opacity-[0.42] text-[color:var(--fg-locked)] border-[color:var(--border)]"
                : on
                  ? "text-[color:var(--accent)] border-[color:var(--accent)] hover:bg-[color:var(--elevated)] transition-colors"
                  : "text-[color:var(--fg-muted)] border-[color:var(--border)] hover:bg-[color:var(--elevated)] transition-colors",
            ].join(" ")}
          >
            {setFilterCopy.ownership[o.own].label}
          </button>
        );
      })}
    </div>
  );
}

function Section({
  id, title, ratio, cells, priceFor, newest, siblings, setCode, onOpenCard,
}: {
  id?: string;
  title: string;
  ratio?: string;
  cells: Cell[];
  priceFor: Map<string, PriceFact>;
  newest: Date | null;
  siblings: readonly Sibling[];
  /** Uppercase, because BrowsePrinting.setCode is and the match is exact (browse.ts:398). */
  setCode: string;
  onOpenCard: (
    oracleId: string,
    siblings?: readonly Sibling[],
    atPrinting?: {
      setCode: string; collectorNumber: string;
      imageUri?: string | null; backImageUri?: string | null; scryfallId?: string;
    },
  ) => void;
}) {
  return (
    <section id={id} className="mt-[20px]">
      <h2 className="flex items-baseline gap-[8px] font-display text-[16px]" style={{ color: "var(--fg)" }}>
        {title}
        {ratio ? (
          <span className="font-mono text-[11px]" style={{ color: "var(--fg-muted)" }}>{ratio}</span>
        ) : null}
      </h2>
      {/* One declaration, and the same one `/collection`'s grid draws (`CARD_GRID_TRACKS`):
          three columns on a phone, a 178px floor from `md` (Hugh, 2026-10-13, bug batch C,
          replacing addendum R2 §27's 146px floor, which gave two on a phone). `auto-fill`,
          NEVER `auto-fit`: auto-fit collapses empty tracks, so a filter leaving three cells
          would stretch those three across the whole width — the reflow the brief forbids. */}
      <div
        data-set-grid
        className={`mt-[10px] grid ${CARD_GRID_TRACKS} gap-x-[8px] gap-y-[18px] md:gap-x-[20px]`}
      >
        {cells.map((c) => (
          <SetCell
            key={c.scryfallId}
            cell={c}
            price={priceFor.get(c.scryfallId) ?? null}
            newestAsOf={newest}
            // The cell IS a printing, so the modal is told which one. Uppercased because
            // BrowsePrinting.setCode is uppercase and the match is exact (browse.ts:398).
            onOpen={(oracleId) => onOpenCard(oracleId, siblings, {
              setCode,
              collectorNumber: c.collectorNumber,
              imageUri: c.imageUri ?? null,
              // The back with the front: a cell opened at an unowned printing is injected
              // into the modal as its own row, and a row with no back falls to the
              // oracle-level image — this printing's front, another printing's back.
              backImageUri: c.backImageUri ?? null,
              // The cell IS this catalog row, so the exact id travels with it. Two
              // printings can share a (set, collector number) pair — `printings` puts
              // no uniqueness on it — and without the id the modal's price would have
              // to refuse an ambiguous pair it was never actually ambiguous about.
              scryfallId: c.scryfallId,
            })}
          />
        ))}
      </div>
    </section>
  );
}

function ZeroResults({
  missingOnly, ownedCount, setName, query, otherFiltersOn,
  onShowAll, onClearSearch, onClearAll,
}: {
  missingOnly: boolean;
  ownedCount: number;
  setName: string;
  query: string;
  otherFiltersOn: boolean;
  onShowAll: () => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}) {
  // Zero under missing-only is good news, unlike the /commanders zero state: it means you
  // own everything that matched. The cheapest correction shows the cards you DO own — and
  // it carries the query too when there is one, which is why `what` was a parameter.
  const what = query === "" ? "cards that match" : `cards matching \u201C${query}\u201D`;
  if (missingOnly) {
    return (
      <EmptyState>
        <EmptyStateTitle>{setPageCopy.zeroResults.headingOwnsAll(what)}</EmptyStateTitle>
        <EmptyStateBody>
          {setPageCopy.zeroResults.bodyOwnsAll(ownedCount, setName)}
        </EmptyStateBody>
        <div className="mt-[16px]">
          <GhostButton onClick={onShowAll} className={ACTION_SIZE}>
            {setPageCopy.zeroResults.showAll(ownedCount)}
          </GhostButton>
        </div>
      </EmptyState>
    );
  }

  // Zero with a query the query ALONE caused: the heading names it, because "nothing
  // matches" on a page reached from a catalogue-wide search reads as a claim about the
  // catalogue, and here the query really is the thing to blame.
  //
  // Only when it is alone. With a colour or rarity on, `q=plains&c=U` returns nothing in a
  // set that plainly contains Plains — the name is present and a filter removed it — so
  // claiming it is absent, and calling it a spelling, would be false. That case falls
  // through to the ordinary filtered-empty heading, which names the query without
  // explaining it away.
  if (query !== "" && !otherFiltersOn) {
    return (
      <EmptyState>
        <EmptyStateTitle>{setPageCopy.searchZero.heading(setName, query)}</EmptyStateTitle>
        <EmptyStateBody>{setPageCopy.searchZero.body}</EmptyStateBody>
        <div className="mt-[16px]">
          <GhostButton onClick={onClearSearch} className={ACTION_SIZE}>{setFilterCopy.search.clear}</GhostButton>
        </div>
      </EmptyState>
    );
  }

  // Corrections NARROWEST FIRST — a reader who mistyped wants the search gone, not their
  // filters. The search's own button only appears when there is a search to clear.
  return (
    <EmptyState>
      <EmptyStateTitle>{setPageCopy.zeroResults.headingNone(what)}</EmptyStateTitle>
      <div className="mt-[16px] flex items-center justify-center gap-[10px]">
        {query !== "" ? (
          <GhostButton onClick={onClearSearch} className={ACTION_SIZE}>{setFilterCopy.search.clear}</GhostButton>
        ) : null}
        {/* Third of three, and the same rule: this clears the query too, so its name says
            so. The other two are the chip line's and the sheet's. */}
        <GhostButton onClick={onClearAll} aria-label={setFilterCopy.clearAllAria} className={ACTION_SIZE}>
          {chassisCopy.chips.clearAll}
        </GhostButton>
      </div>
    </EmptyState>
  );
}
