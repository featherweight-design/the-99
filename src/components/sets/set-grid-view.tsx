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
import { ColorFilterRow, WUBRG } from "../collection/color-filter-row";
import { GhostButton } from "../ui/button";
import { EmptyState, EmptyStateBody, EmptyStateTitle } from "../ui/empty-state";
import { manapoolAddDeckUrl } from "../../lib/manapool/links";
import { parseAsOf, type PriceFact } from "../../lib/decks/price";
import {
  applyFilters, parseFilters, RARITIES, serialiseFilters, type SetGridFilters,
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
  // tracking why focus moved, this asks the only question that matters: is it on something
  // with no box? Runs after the unmount this breakpoint change causes.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body && active.getClientRects().length === 0) {
        desktopRackRef.current?.focus();
      }
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
  const filtersOn =
    effective.colors.length + effective.rarities.length + (effective.missingOnly ? 1 : 0);

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
        <div className="mt-[10px] flex flex-wrap items-center gap-[8px]">
          <button
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

          {/* The colour and rarity racks are desktop-only; Missing-only is mounted ONCE
              and shown at both widths, which is what keeps one control with one
              accessible name in the document. */}
          <ColorFilterRow
            containerRef={desktopRackRef}
            className="hidden md:flex"
            selected={filters.colors}
            onToggle={(c) => setFilters({ ...filters, colors: toggleIn(filters.colors, c) })}
          />

          <div className="hidden items-center gap-[4px] md:flex">
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
                    "min-h-[44px] md:min-h-[32px] rounded-[6px] px-[9px] font-mono text-[11px] border",
                    "hover:bg-[color:var(--elevated)]",
                    on
                      ? "text-[color:var(--accent)] border-[color:var(--accent)]"
                      : "text-[color:var(--fg-muted)] border-[color:var(--border)]",
                  ].join(" ")}
                >
                  {setFilterCopy.rarity.letters[r]}
                </button>
              );
            })}
          </div>

          {complete ? null : <MissingOnlyToggle filters={filters} onChange={setFilters} />}

          {filtersOn > 0 ? (
            <GhostButton
              className="hidden md:inline-flex"
              onClick={() => setFilters({ colors: [], rarities: [], missingOnly: false })}
            >
              {setFilterCopy.clear}
            </GhostButton>
          ) : null}
        </div>

        {/* The phone sheet. Same URL-backed state as the rack above it, and the same
            controls at a 44px target. */}
        {sheetOpen && !isDesktop ? (
          <FilterSheet onClose={() => setSheetOpen(false)}>
            <p className="font-mono text-[10px] mb-[10px]" style={{ color: "var(--fg-faint)" }}>
              {setFilterCopy.colourLabel}
            </p>
            <div className="mb-[16px] flex flex-wrap gap-[8px]">
              {WUBRG.map((c) => {
                const on = filters.colors.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    aria-label={setFilterCopy.colourAria(c)}
                    onClick={() => setFilters({ ...filters, colors: toggleIn(filters.colors, c) })}
                    className={[
                      "min-h-[44px] min-w-[44px] rounded-[8px] px-[12px] font-mono text-[13px] border",
                      on
                        ? "text-[color:var(--accent)] border-[color:var(--accent)]"
                        : "text-[color:var(--fg-muted)] border-[color:var(--border)]",
                    ].join(" ")}
                  >
                    {c}
                  </button>
                );
              })}
            </div>

            <p className="font-mono text-[10px] mb-[10px]" style={{ color: "var(--fg-faint)" }}>
              {setFilterCopy.rarity.label}
            </p>
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
              <GhostButton
                onClick={() => setFilters({ colors: [], rarities: [], missingOnly: false })}
              >
                {setFilterCopy.clear}
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
          onClearAll={() => setFilters({ colors: [], rarities: [], missingOnly: false })}
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
  id, title, ratio, cells, priceFor, newest, siblings, onOpenCard,
}: {
  id?: string;
  title: string;
  ratio?: string;
  cells: Cell[];
  priceFor: Map<string, PriceFact>;
  newest: Date | null;
  siblings: string[];
  onOpenCard: (oracleId: string, siblings?: string[]) => void;
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
            onOpen={(oracleId) => onOpenCard(oracleId, siblings)}
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
            : setPageCopy.zeroResults.clear}
        </GhostButton>
      </div>
    </EmptyState>
  );
}
