"use client";

// /collection/sets/[code] — the grid.
//
// The population here is INVERTED from /collection's: that page lists what you own, this
// one exists to show what you do not. Nothing crosses the boundary in either direction —
// /collection's search, type and availability filters are not applied here, and colour,
// rarity and missing-only are not applied back. Different populations, different params.
//
// One density and no toggle, set by ONE declaration on the grid and by nothing on the cell:
// `repeat(auto-fill, minmax(146px, 1fr))` (addendum R2 §27). It measures ~150x210 at 1180
// and 174x243 at 390, and the track — not a breakpointed literal — is what a cell is wide.
// The upper bound is structural rather than declared: a track can never reach `2F + gap`,
// because at that width another column fits and the count goes up instead.
//
// A smaller cell was drawn and rejected: at 88px the card name truncates at ~13 characters,
// and the name is the only thing in a dimmed cell a reader can match against memory. The
// scroll is paid for by the sticky head, the extras jump, and missing-only, which removes
// the cells the reader is done with rather than shrinking everything.

import { useEffect, useMemo, useRef, useState } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { useIsDesktop } from "../ui/use-is-desktop";
import { useCardDetail } from "../cards/card-detail-provider";
import { useSearchParams } from "next/navigation";
import { ColourPips } from "../ui/colour-pips";
import { FilterPanel } from "../ui/filter-panel";
import { chassisCopy } from "../../lib/copy/filter-chassis";
import { GhostButton } from "../ui/button";
import { EmptyState, EmptyStateBody, EmptyStateTitle } from "../ui/empty-state";
import { manapoolAddDeckUrl } from "../../lib/manapool/links";
import { parseAsOf, type PriceFact } from "../../lib/decks/price";
import {
  applyFilters, EMPTY_FILTERS, parseFilters, RARITIES, serialiseFilters,
  type SetGridFilters,
} from "../../lib/sets/filters";
import { sectionsOf, type Cell } from "../../lib/sets/completion";
import { costToComplete } from "../../lib/sets/cost";
import { setFilterCopy, setPageCopy, setsIndexCopy } from "../../lib/copy/set-collections";
import type { PrintingPriceRow } from "../../lib/sets/read";
import { SetCell } from "./set-cell";
import { SetIcon } from "./set-icon";
import { CostStrip } from "./cost-strip";
import { DeltaStrip } from "./delta-strip";

export type SetGridViewProps = {
  code: string;
  name: string;
  iconSvgUri: string | null;
  cells: Cell[];
  prices: PrintingPriceRow[];
  newestAsOf: string | null;
  /** The authoritative denominator from `sets`. Null means the catalog is not indexed. */
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
  // The sheet is phone-only, and `md:hidden` alone hid it while useDialogA11y stayed
  // mounted: crossing the breakpoint with it open left the desktop page scroll-locked and
  // trapped focus in a dialog nobody could see. Unmounted rather than hidden.
  const isDesktop = useIsDesktop();
  const desktopRackRef = useRef<HTMLDivElement>(null);
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
  const sheetTriggerRef = useRef<HTMLButtonElement>(null);
  // Only after an actual crossing. `document.activeElement` is the body on a fresh load, so
  // without this the effect read every first render as a stranding and moved focus into the
  // rack before the reader had touched anything — a worse defect than the one it fixes.
  const focusWidth = useRef<boolean | null>(null);
  useEffect(() => {
    const crossed = focusWidth.current !== null && focusWidth.current !== isDesktop;
    focusWidth.current = isDesktop;
    if (!crossed) return;


    const id = requestAnimationFrame(() => {
      const active = document.activeElement as HTMLElement | null;
      const stranded =
        active === null || active === document.body || active.getClientRects().length === 0;
      if (!stranded) return;
      // Whichever width we just arrived at, land on that width's own first control.
      (isDesktop ? desktopRackRef.current : sheetTriggerRef.current)?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [isDesktop]);
  const filters = local ?? urlFilters;

  function setFilters(next: SetGridFilters) {
    // Only the three parameters this page owns are replaced. Rebuilding the string from
    // them alone dropped everything else a link might carry, which the collection browser
    // is careful not to do.
    const live = new URLSearchParams(window.location.search);
    for (const key of ["c", "r", "m"]) live.delete(key);
    for (const [key, value] of serialiseFilters(next)) live.set(key, value);
    const qs = live.toString();
    window.history.replaceState(
      null, "",
      qs ? `/collection/sets/${code}?${qs}` : `/collection/sets/${code}`,
    );
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

  // At 100% the Missing-only control is removed, because the base run has nothing left to
  // hide. The PARAMETER can still be in the URL — a reader completes a set with m=1 set —
  // and it would go on filtering the extras with no control left to turn it off. So the
  // complete state drops it from the filters it applies as well as from the rack.
  const effective = complete ? { ...filters, missingOnly: false } : filters;

  // ONE count function. Everything below reads these two arrays and nothing recomputes
  // the filter — the result line, the Send label and the cost denominator must agree.
  const shownBase = applyFilters(sections.base, effective);
  const shownExtras = applyFilters(sections.extras, effective);
  const shown = [...shownBase, ...shownExtras];
  // Prev/Next pages through what is on screen, in the order it is on screen. Deduped:
  // the modal pages by ORACLE id and a set can draw two cells for one oracle (EOE's Plains
  // at #262 and #268), which would otherwise repeat a card on the way through.
  // Not memoised: `shown` is rebuilt each render, so a memo keyed on it can never hold,
  // and the compiler rejects the dead memoisation rather than keeping it.
  const siblingIds = [...new Set(shown.map((c) => c.oracleId))];

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

  const openInGrid = openOracleId !== null && siblingIds.includes(openOracleId);
  const siblingKey = siblingIds.join(",");
  useEffect(() => {
    if (openOracleId === null) return;
    if (openInGrid) setSiblings(siblingIds);
    else close();
    // `siblingKey` stands in for the array, which is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siblingKey, openOracleId, openInGrid, setSiblings, close]);


  // The strip is scoped, and its population must match its label: "Cost to complete" is
  // the BASE RUN, and at 100% the same strip re-scopes to the extras. Costing both at once
  // put extras in a figure and a button that said base run — and would have sent them to
  // ManaPool under that label.
  const costable = complete ? shownExtras : shownBase;
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


  const toggleIn = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  // Rarity is single-select. Two letters lit produced `r=common,mythic`, a union the
  // designed control cannot express and the reader cannot reach twice the same way.
  // Picking the lit one clears it, which is how "all" is reached.
  const pickRarity = (current: string[], value: string) =>
    (current.includes(value) ? [] : [value]);

  // What the colour and rarity filters match, missing-only aside: the denominator behind
  // both the owns-all claim and its correction.
  const matchedIgnoringMissing = applyFilters(
    [...sections.base, ...sections.extras],
    { ...effective, missingOnly: false },
  ).length;

  // `effective`, not `filters`: at 100% missing-only is dropped from what is applied, and
  // counting the raw value showed "1 filter on" with a Clear button for a filter that is
  // neither applied nor reachable.
  //
  // The BADGE counts only what the sheet holds (§28): missing-only sits on the phone row
  // beside the badge, so counting it is the same fact twice in one glance.
  // DIMENSIONS, not values. `c=W,U` is one colour filter, and counting its values put a `2`
  // on `Filters` for a single control — and could exceed the chassis's three-dimension cap
  // on a page that only has three dimensions to begin with.
  const filtersOn =
    (effective.colors.length > 0 ? 1 : 0) + (effective.rarities.length > 0 ? 1 : 0);
  // The sheet's Clear reads the RAW filters, not `effective`. At 100% missing-only is
  // dropped from what is applied, but `m=1` can still be in the URL — a reader completes a
  // set with it set — and gating Clear on `effective` left that parameter with no way out
  // of the UI, ready to reactivate the moment the set stopped being complete.
  const anyFilterOn =
    filters.colors.length > 0 || filters.rarities.length > 0 || filters.missingOnly;

  // The chip line, in DIMENSION order and never click order — a line that re-orders itself
  // as you use it is a line you have to re-read. Colour collapses past one pip rather than
  // printing one chip per hue.
  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (effective.colors.length === 1) {
    const only = effective.colors[0];
    chips.push({
      key: `c-${only}`,
      label: setFilterCopy.chip.colourOne(
        chassisCopy.colour.names[only.toLowerCase() as "w" | "u" | "b" | "r" | "g"],
      ),
      onRemove: () => setFilters({ ...filters, colors: [] }),
    });
  } else if (effective.colors.length > 1) {
    chips.push({
      key: "c",
      label: setFilterCopy.chip.colour(effective.colors.length),
      onRemove: () => setFilters({ ...filters, colors: [] }),
    });
  }
  if (effective.rarities.length > 0) {
    const r = effective.rarities[0] as "common" | "uncommon" | "rare" | "mythic";
    chips.push({
      key: `r-${r}`,
      label: setFilterCopy.chip.rarity(r),
      onRemove: () => setFilters({ ...filters, rarities: [] }),
    });
  }
  if (effective.missingOnly) {
    chips.push({
      key: "m",
      label: setFilterCopy.chip.missingOnly,
      onRemove: () => setFilters({ ...filters, missingOnly: false }),
    });
  }
  const clearAll = () => setFilters(EMPTY_FILTERS);
  // A filter that is SET but not APPLIED draws no chip, so the chip line alone would offer
  // no way out of it. That happens exactly once: `m=1` still in the URL on a set the reader
  // has completed, where `effective` drops missing-only and its control is gone too. Clear
  // stays, alone on the line, because it is the only route left to a parameter that would
  // start filtering again the moment the set stopped being complete.
  const staleFilter = anyFilterOn && chips.length === 0;

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

  return (
    <div>
      <div
        className="sticky top-0 z-[2] pb-[12px] pt-[10px]"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-start gap-[12px]">
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
                  {sections.baseOwned} / {sections.baseTotal} · {sections.percent}%
                </span>
              )}
            </p>
            {/* Provenance, and only when there is provenance to state: an unindexed set
                has no base or extras figure, and the ratio note below is the one line that
                always stands. */}
            {sections.indexed ? (
              <p className="font-mono text-[10px]" style={{ color: "var(--fg-locked)" }}>
                {setPageCopy.head.meta(
                  code,
                  releasedAt ? releasedAt.slice(0, 10) : "an unrecorded date",
                  sections.baseTotal,
                  sections.extrasTotal,
                )}
              </p>
            ) : null}
            <p className="font-mono text-[10px]" style={{ color: "var(--fg-locked)" }}>
              {setPageCopy.head.ratioNote}
            </p>
          </div>
        </div>

        {/* Keyed on the fingerprint so a refresh remounts it: without the key the strip
            kept rendering its old message against a grid that had already updated. */}
        <DeltaStrip
          // The set code is in the key: two sets with the same indexed state and the same
          // ownership fingerprint — two you hold nothing from — would otherwise reuse the
          // instance, and one set's message could paint on the other.
          key={`${code}:${indexedKey}:${ownedFingerprint}`}
          code={code}
          fingerprint={ownedFingerprint}
          indexed={sections.indexed}
          recheckKey={`${modalGeneration}:${artGeneration}`}
        />

        <div className="mt-[10px]">
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
        <div className="mt-[10px] flex flex-nowrap items-center gap-[8px]">
          <button
            ref={sheetTriggerRef}
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            className="md:hidden inline-flex min-h-[44px] items-center gap-[6px] rounded-[6px]
                       px-[12px] text-[13px] border border-[color:var(--border)]
                       text-[color:var(--fg-body)]"
          >
            {setFilterCopy.label}
            {filtersOn > 0 ? (
              <span
                aria-label={setFilterCopy.countBadgeAria(filtersOn)}
                className="inline-flex h-[18px] min-w-[18px] items-center justify-center
                           rounded-full px-[5px] font-mono text-[10px]
                           bg-[color:var(--accent)] text-[color:var(--bg)]"
              >
                {filtersOn}
              </span>
            ) : null}
          </button>

          {/* The colour and rarity controls are desktop-only; Missing-only is mounted ONCE
              and shown at both widths, which is what keeps one control with one
              accessible name in the document.

              The pips are the chassis's, mounted and never forked. The control they
              replace drew a token square at `opacity .34-.40` when unlit, measuring
              1.38:1; these are Scryfall's own full-colour symbols, undimmed, with a 2px
              --accent ring as the entire lit treatment. A fork here is how six themes of
              measurement get re-derived by hand. */}
          {/* `tabIndex={-1}` is not decoration: the breakpoint effect above moves focus here
              when the phone sheet unmounts under a resize, and a plain div is not a focus
              target — focus would fall to the document instead of the visible rack. The
              control this replaced carried it for the same reason. */}
          <div ref={desktopRackRef} tabIndex={-1} className="hidden md:flex">
            <ColourPips
              value={filters.colors}
              form="wide"
              onToggle={(c) => setFilters({ ...filters, colors: toggleIn(filters.colors, c) })}
            />
          </div>

          {/* Four values, single-select, with an off state — the chassis's own test makes
              that a panel rather than a segmented run or four buttons.

              `selectionMode="single"`, which is what the CONTROL is: `multi` would have
              told assistive technology `aria-multiselectable="true"` and drawn a square
              tick, promising a second value the caller then silently discards. The cost is
              the desktop footer, which `single` drops — Design drew an `n of 4 on` beside a
              `Clear rarity` there. The chip line carries the same removal one row down, and
              a correct promise to a screen reader outranks a duplicated one to a mouse.

              The off state is still reachable, because `onToggle` below returns an empty
              selection when the lit value is picked again — which is how `all` is reached
              and why this is not simply the panel's `single` contract as written. */}
          {/* MOUNTED on the breakpoint, never CSS-hidden. `FilterPanel` holds its own open
              state and picks popover or sheet off the same `useIsDesktop`: hidden with
              `display:none` it would keep that state across a resize, put its mobile dialog
              inside an invisible ancestor, and hand focus to a panel nobody can see. The
              phone's rarity control is the chip group in the sheet, and this is the other
              half of that one-control-per-width rule. */}
          {isDesktop ? (
            <FilterPanel
              copy={setFilterCopy.rarityPanel}
              searchable={false}
              selectionMode="single"
              widthPx={280}
              footerStatus
              options={RARITIES.map((r) => ({
                code: r,
                label: setFilterCopy.rarity.options[r],
                count: rarityCounts.get(r) ?? 0,
                disabled: (rarityCounts.get(r) ?? 0) === 0 && !filters.rarities.includes(r),
              }))}
              selected={filters.rarities}
              onToggle={(code) =>
                setFilters({ ...filters, rarities: pickRarity(filters.rarities, code) })}
              onClear={() => setFilters({ ...filters, rarities: [] })}
            />
          ) : null}

          {complete ? null : <MissingOnlyToggle filters={filters} onChange={setFilters} />}
        </div>

        {/* Row 2 — the chip line, present at rest rather than conditionally rendered. The
            line IS the invariant that keeps the head's height constant; collapsing it is
            the bug the three-row rule exists to forbid.

            At desktop it can never reach two lines: three dimensions cap the widest
            possible line at ~380px, so the chassis's one legitimate height change is
            unreachable here. At phone the chips scroll horizontally and never wrap, and
            Clear is outside that scroll — so the clipped item is a chip and never the way
            out. */}
        <div
          data-set-chips
          className="mt-[8px] flex items-center gap-[6px]"
          style={{ minHeight: 22 }}
        >
          {/* Clear sits OUTSIDE the scrolling strip, which is how "the clipped item is a
              chip and never Clear all filters" is actually delivered. Inside it, Clear is
              the last flex item and a phone's overflow starts at the LEADING edge — so the
              only way out of three filters was off-screen until the reader discovered
              horizontal scrolling. Scroll the chips; keep the exit still. */}
          <div className="flex min-w-0 flex-1 items-center gap-[6px] overflow-x-auto
                          md:flex-wrap md:overflow-visible">
          {chips.length === 0 ? (
            <span
              className="font-mono text-[11px] leading-[14px] py-[3px] whitespace-nowrap"
              style={{ color: "var(--fg-faint)" }}
            >
              {chassisCopy.chips.none}
            </span>
          ) : (
            chips.map((chip) => (
              // The chip is a span and the x inside it is the button, exactly as the
              // chassis draws it: chips sit 6px apart, so a 44px overlay centred on a whole
              // chip would overlap its neighbour and a tap near the boundary would remove
              // the wrong filter. Anchored to the x, the nearest competing target is a full
              // chip away. 34px rather than 44 is the refresh's granted exception on its own
              // test — a chip is a shortcut, never the only route, and every value it
              // removes is also removable at 44px on the row or in the sheet.
              <span
                key={chip.key}
                className="inline-flex shrink-0 items-center gap-[6px] whitespace-nowrap
                           rounded-[7px] px-[8px] py-[3px] font-mono text-[11px] leading-[14px]"
                style={{
                  color: "var(--fg-body)",
                  background: "var(--surface-sunken)",
                  border: "1px solid var(--border)",
                }}
              >
                {chip.label}
                <button
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={chassisCopy.chips.removeAria(chip.label)}
                  className="relative cursor-pointer border-0 bg-transparent p-0
                             text-[color:var(--fg-muted)]
                             after:absolute after:left-1/2 after:top-1/2 after:h-[34px]
                             after:w-[34px] after:-translate-x-1/2 after:-translate-y-1/2
                             after:content-['']"
                >
                  ×
                </button>
              </span>
            ))
          )}

          </div>

          {/* Past ONE active control only. At one filter the chip's own x and the lit
              control beside it are both shorter routes off, and a third control there is
              noise. Not a GhostButton: it was the only one in a row of 32px hairlines, and
              the chassis's answer to "what should this button look like" is that it is not
              a button on that row at all. */}
          {chips.length > 1 || staleFilter ? (
            <button
              type="button"
              onClick={clearAll}
              aria-label={setFilterCopy.clearAllAria}
              className="relative shrink-0 cursor-pointer border-0 bg-transparent p-0
                         font-mono text-[11px] leading-[14px] underline whitespace-nowrap
                         text-[color:var(--fg-muted)]
                         after:absolute after:left-1/2 after:top-1/2 after:h-[34px]
                         after:min-w-[44px] after:w-full after:-translate-x-1/2
                         after:-translate-y-1/2 after:content-['']"
            >
              {chassisCopy.chips.clearAll}
            </button>
          ) : null}
        </div>

        {/* The phone sheet. Same URL-backed state as the rack above it, and the same
            controls at a 44px target. */}
        {sheetOpen && !isDesktop ? (
          <FilterSheet onClose={() => setSheetOpen(false)}>
            {/* Pips lead every sheet in the app, and they are the chassis's pips here too —
                a sheet that drew its own would be the fork §28 names. 44px is a real touch
                target, which the `sheet` form is what provides. */}
            <p className="font-mono text-[10px] mb-[10px]" style={{ color: "var(--fg-faint)" }}>
              {setFilterCopy.colourLabel}
            </p>
            <div className="mb-[16px]">
              <ColourPips
                value={filters.colors}
                form="sheet"
                onToggle={(c) => setFilters({ ...filters, colors: toggleIn(filters.colors, c) })}
              />
            </div>

            <p className="font-mono text-[10px] mb-[10px]" style={{ color: "var(--fg-faint)" }}>
              {setFilterCopy.rarity.label}
            </p>
            {/* A 44px chip group, not the desktop trigger: four short values is what a chip
                group is for, and a panel behind a panel is two dialogs deep. Wrapping to
                two rows is allowed HERE and nowhere else — a sheet may change height, the
                control row inside the sticky head may not. */}
            <div className="mb-[16px] flex flex-wrap gap-[8px]">
              {RARITIES.map((r) => {
                const on = filters.rarities.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={on}
                    aria-label={setFilterCopy.rarity.options[r]}
                    onClick={() => setFilters({ ...filters, rarities: pickRarity(filters.rarities, r) })}
                    className={[
                      "min-h-[44px] rounded-[8px] px-[14px] text-[13px] border",
                      on
                        ? "text-[color:var(--accent)] border-[color:var(--accent)]"
                        : "text-[color:var(--fg-muted)] border-[color:var(--border)]",
                    ].join(" ")}
                  >
                    {setFilterCopy.rarity.options[r]}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-[10px]">
              <GhostButton onClick={clearAll} disabled={!anyFilterOn}>
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

        {/* No result line while the catalog is unindexed: every cell falls out of both
            sections, so the summary would read "0 cells · 0 yours, 0 missing" beside an
            empty state that correctly says the set has not been indexed. */}
        {sections.indexed ? (
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-[8px] font-mono text-[11px]"
          style={{ color: "var(--fg-muted)" }}
        >
          {effective.missingOnly
            ? setPageCopy.result.missingOnly(shown.filter((c) => !c.owned).length)
            : filtersOn > 0
              // The classified population, not every row: an unclassified printing is
              // rendered in neither section, so `cells.length` promised cells the page
              // does not draw.
              ? setPageCopy.result.filtered(
                  shown.length,
                  sections.base.length + sections.extras.length,
                )
              : setPageCopy.result.rest(
                  shown.length,
                  shown.filter((c) => c.owned).length,
                  // The whole displayed population, not the cost strip's scoped one: this
                  // line describes the page, and the strip says what it is costing.
                  shown.filter((c) => !c.owned).length,
                )}
          {shownExtras.length > 0 ? (
            <>
              {" · "}
              <a href="#extras" className="text-[color:var(--accent)] hover:underline">
                {setPageCopy.sections.jump}
              </a>
            </>
          ) : null}
        </p>
        ) : null}
      </div>

      {!sections.indexed ? (
        // The state the spec names and this page did not draw: with no printing classified
        // there is no base run, so every cell fell out of both sections and the page read
        // "no cards match your filters" — which blames the reader for a catalog that has
        // not been indexed. The index already says this; so does the grid now.
        <EmptyState>
          <EmptyStateTitle>{setPageCopy.notIndexed.heading(name)}</EmptyStateTitle>
          <EmptyStateBody>{setPageCopy.notIndexed.body}</EmptyStateBody>
          <div className="mt-[16px]">
            <GhostButton href="/collection/sets">
              {setPageCopy.notIndexed.action}
            </GhostButton>
          </div>
        </EmptyState>
      ) : shown.length === 0 ? (
        <ZeroResults
          // Good news only when the OTHER filters matched at least one cell. An empty
          // intersection is not "you own all of these"; it is a filter combination with
          // nothing behind it.
          missingOnly={effective.missingOnly && matchedIgnoringMissing > 0}
          // The cards that match the OTHER filters and are owned — which is what "you hold
          // all of them" means here. Counting the whole base run put a number in the
          // sentence that had nothing to do with what the reader filtered to.
          ownedCount={applyFilters(
            [...sections.base, ...sections.extras],
            { ...effective, missingOnly: false },
          ).filter((c) => c.owned).length}
          setName={name}
          // Turns missing-only off and keeps the rest: the promised correction is "show
          // the ones you DO own that match", not "discard what you filtered to".
          onShowAll={() => setFilters({ ...filters, missingOnly: false })}
          onClearAll={clearAll}
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
 * ONE control for both widths. The phone row and the desktop rack both need it, and
 * rendering it twice put two buttons with one accessible name in the tree — correct at
 * either width read alone, wrong in the document. The label is what varies.
 */
function MissingOnlyToggle({
  filters, onChange,
}: {
  filters: SetGridFilters;
  onChange: (next: SetGridFilters) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={filters.missingOnly}
      aria-label={filters.missingOnly
        ? setFilterCopy.missingOnly.ariaOn
        : setFilterCopy.missingOnly.ariaOff}
      onClick={() => onChange({ ...filters, missingOnly: !filters.missingOnly })}
      className={[
        "min-h-[44px] md:min-h-[32px] rounded-[6px] px-[12px] md:px-[10px]",
        "text-[13px] md:text-[12px] border hover:bg-[color:var(--elevated)]",
        filters.missingOnly
          ? "text-[color:var(--accent)] border-[color:var(--accent)]"
          : "text-[color:var(--fg-muted)] border-[color:var(--border)]",
      ].join(" ")}
    >
      <span className="md:hidden">{setFilterCopy.missingOnly.short}</span>
      <span className="hidden md:inline">{setFilterCopy.missingOnly.label}</span>
    </button>
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
  siblings: string[];
  /** Uppercase, because BrowsePrinting.setCode is and the match is exact (browse.ts:398). */
  setCode: string;
  onOpenCard: (
    oracleId: string,
    siblings?: string[],
    atPrinting?: { setCode: string; collectorNumber: string; imageUri?: string | null },
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
      {/* One declaration and one constant (addendum R2 §27). `auto-fill`, NEVER `auto-fit`:
          auto-fit collapses empty tracks, so a filter leaving three cells would stretch
          those three across the whole width — the exact reflow the brief forbids, one
          keyword away. The 146px minimum is `image_uri_small`'s own width, and it produces
          the phone answer for free: at 390px there is nothing between two tracks at 174 and
          three at 112.67, so any minimum in that band gives two. */}
      <div
        data-set-grid
        className="mt-[10px] grid gap-x-[10px] gap-y-[18px]"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(146px, 1fr))" }}
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
              setCode, collectorNumber: c.collectorNumber, imageUri: c.imageUri ?? null,
            })}
          />
        ))}
      </div>
    </section>
  );
}

function ZeroResults({
  missingOnly, ownedCount, setName, onShowAll, onClearAll,
}: {
  missingOnly: boolean;
  ownedCount: number;
  setName: string;
  onShowAll: () => void;
  onClearAll: () => void;
}) {
  // Zero under missing-only is good news, unlike the /commanders zero state: it means you
  // own everything that matched. The cheapest correction shows the cards you DO own.
  return (
    <EmptyState>
      <EmptyStateTitle>
        {missingOnly
          ? setPageCopy.zeroResults.headingOwnsAll("cards that match")
          : setPageCopy.zeroResults.headingNone("cards that match")}
      </EmptyStateTitle>
      {missingOnly ? (
        <EmptyStateBody>
          {setPageCopy.zeroResults.bodyOwnsAll(ownedCount, setName)}
        </EmptyStateBody>
      ) : null}
      <div className="mt-[16px]">
        <GhostButton onClick={missingOnly ? onShowAll : onClearAll}>
          {missingOnly
            ? setPageCopy.zeroResults.showAll(ownedCount)
            : chassisCopy.chips.clearAll}
        </GhostButton>
      </div>
    </EmptyState>
  );
}
