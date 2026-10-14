"use client";
// Per-printing art selection (#105) per the R3 handoff §Component notes.
//
// Renders INSIDE the card modal's scrolling content column: no dialog, no focus
// trap, no live region of its own. The modal owns the single live region and
// receives strings through `onAnnounce`.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { reveal } from "../../lib/ui/reveal";
import type { PrintingChoice } from "../../lib/collection/catalog-read";
import { heldOf } from "../../lib/collection/add-lines";
import type { BrowsePrinting, PreferredPrinting } from "../../lib/collection/browse";
import { comparePrintings, matchesPreference } from "../../lib/collection/browse";
import { identityGradient } from "../../lib/collection/gradients";
import { printingPickerCopy } from "../../lib/copy/collection";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { deckPrintingsCopy } from "../../lib/copy/deck-printings";
import { SearchField } from "../ui/text-field";
import { escapeDismisses } from "../../lib/ui/search-dismiss";
import { ArtLayer } from "../ui/art-layer";

const copy = printingPickerCopy.printing;
const deckCopy = deckPrintingsCopy.picker;
const chooseCopy = collectionEditCopy.add.choose;

/**
 * Entry count past which search, finish chips and set group headers appear.
 *
 * A judgement, not a measurement (handoff gap 3): it sits above Sol Ring's 13 —
 * the last non-basic tier — and well below Forest's 54, which is the case the
 * affordances exist for.
 */
export const OVERFLOW_THRESHOLD = 12;

/** Stable identity of a printing within one card: uppercased set code + collector number. */
export function printingKey(p: { setCode: string; collectorNumber: string }): string {
  return `${p.setCode}|${p.collectorNumber}`;
}

type FinishFilter = "all" | "foil" | "nonfoil";

/** A printing entry, plus the pick the user no longer owns (quantity 0, not selectable). */
type Entry = BrowsePrinting & { dormant: boolean };

/**
 * Etched is a foil treatment, so the chips count it as foil. Splitting it out would give a
 * third chip that reads 0 on all but 285 printings in Scryfall's catalog.
 */
function foilCount(p: BrowsePrinting): number {
  return (p.finishes.foil ?? 0) + (p.finishes.etched ?? 0);
}

/** Decision 9: a plain nonfoil printing produces no finish string at all. */
function quantityLabel(p: Entry): string {
  if (p.dormant) return copy.dormantQty;
  const foil = foilCount(p);
  const nonfoil = p.finishes.nonfoil ?? 0;
  if (foil === 0) return copy.entryQty(p.quantity);
  if (nonfoil === 0) return copy.entryQtyAllFoil(p.quantity);
  return copy.entryQtyMixed(p.quantity, foil);
}

/** Release date descending, ties A→Z, undated last — the filter panel's rule (#101). */
function compareSetGroups(
  a: { releasedAt: string | null; label: string },
  b: { releasedAt: string | null; label: string },
): number {
  if (a.releasedAt !== b.releasedAt) {
    if (a.releasedAt === null) return 1;
    if (b.releasedAt === null) return -1;
    return a.releasedAt < b.releasedAt ? 1 : -1;
  }
  return a.label.localeCompare(b.label);
}

type ArtRegionProps = {
  /**
   * A specimen (the About page's figure): nothing on the page asked for it, so it reveals no tile.
   * Every live picker leaves this off and brings its tile into view.
   */
  still?: boolean;
  role?: "art";
  source?: "owned";
  layout?: undefined;
  /**
   * `deck` (deck printings): opened from a deck, the pick is that deck's. The intro speaks of this
   * deck rather than the Collection, there is no reset (picking another tile is the way back) and
   * no dormant tile (a deck's pick is always a printing the player holds). `collection` is today's.
   */
  scope?: "collection" | "deck";
  /** A save the server refused, said under the intro (deck scope). Null when there is none. */
  notice?: string | null;
  /** Matches the trigger's aria-controls. Two instances would collide, so the modal owns it. */
  id: string;
  printings: BrowsePrinting[];
  preferred: PreferredPrinting | null;
  /**
   * `printingKey` of the printing whose art is on screen right now. Null only when the card
   * carries no printings at all, in which case no tile takes the "shown now" badge.
   */
  resolvedKey: string | null;
  cardName: string;
  colorIdentity: string[];
  onPick: (p: BrowsePrinting) => void;
  onReset: () => void;
  onForget: () => void;
  onAnnounce: (message: string) => void;
};

/**
 * The required printing step of the Add cards sheet (collection edit R1, B4a/B4m): every catalog
 * printing of one card, nothing selected and nothing defaulted. It owns no preference: no pick or
 * shown-now badge, no reset, no dormant tile, and an arrow key MOVES focus without choosing, since
 * a choice here completes a line and closes the step. The caller announces what was chosen.
 */
type ChooseRegionProps = {
  role: "choose";
  source: "catalog";
  /** `row` is the phone's one sideways-scrolling row; the grid is the default. */
  layout?: "grid" | "row";
  id: string;
  printings: PrintingChoice[];
  /** The line above the tiles; omitted where the caller heads the step itself (I got it). */
  intro?: string;
  cardName: string;
  colorIdentity: string[];
  onPick: (p: PrintingChoice) => void;
  /** Move focus into the picker's own search (else its first tile) when it opens. */
  autoFocus?: boolean;
  /**
   * I got it's confirm (plan PR 2, B1/B2): the printing selected now, by catalog id, or null for
   * none yet. Passing it makes the role a CONTROLLED radio group inside a form: the tile wears
   * `aria-checked` and the accent outline (no badge, no label, no price), a pick and an arrow key
   * both select and the step stays open, and while a search narrows the tiles the selected one
   * stays first, so the way back to it is never lost. The tiles are the confirm's larger size. The
   * Add cards sheet does not pass it, and is exactly as before.
   */
  selected?: string | null;
  /**
   * `confirm`: I got it's confirm draws the tiles at its own size (R2 §B: 100px phone, 104px
   * desktop, art radius 9px) in a row padded 4px 4px 2px. The row still scrolls sideways: a card
   * has up to 57 printings and the modal fits about four 104px tiles, so hiding the overflow would
   * leave most of them out of a pointer's reach. Absent, the tiles are the Add cards sheet's.
   */
  tiles?: "confirm";
};

export function PrintingRegion(props: ArtRegionProps | ChooseRegionProps) {
  const choose = props.role === "choose";
  const row = choose && props.layout === "row";
  const selectMode = props.role === "choose" && props.selected !== undefined;
  const confirmTiles = props.role === "choose" && props.tiles === "confirm";
  const { id, cardName, colorIdentity } = props;
  const preferred = props.role === "choose" ? null : props.preferred;
  const deckScope = props.role !== "choose" && props.scope === "deck";
  const resolvedKey = props.role === "choose" ? null : props.resolvedKey;
  const sourcePrintings = props.printings;
  // A catalog printing becomes a tile through the same entry shape an owned one has, so the grid,
  // the search and the keyboard are written once. `quantity` is what the player holds of it.
  // A catalog tile is keyed by its catalog id: (set, collector number) is not unique in the
  // catalog, since two variants can share it (price-query.ts), and a pair key would check both
  // tiles and hand back either variant. An owned printing (art role) has no id to key on and keeps
  // the pair, which is also what its stored preference names.
  const tileKey = useCallback(
    (p: { setCode: string; collectorNumber: string; scryfallId?: string | null }) =>
      choose && p.scryfallId ? p.scryfallId : printingKey(p),
    [choose],
  );
  const catalogByKey = useMemo(
    () => (choose ? new Map((sourcePrintings as PrintingChoice[]).map((c) => [c.scryfallId, c])) : null),
    [choose, sourcePrintings],
  );
  const printings: BrowsePrinting[] = useMemo(
    () =>
      choose
        ? (sourcePrintings as PrintingChoice[]).map((c) => ({
            setCode: c.setCode,
            scryfallId: c.scryfallId,
            setName: c.setName,
            collectorNumber: c.collectorNumber,
            releasedAt: c.releasedAt,
            quantity: heldOf(c),
            finishes: {},
            imageUri: c.imageUri,
            flavorName: c.flavorName,
          }))
        : (sourcePrintings as BrowsePrinting[]),
    [choose, sourcePrintings],
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const autoFocus = props.role === "choose" && props.autoFocus === true;
  useEffect(() => {
    if (!autoFocus) return;
    const root = rootRef.current;
    // A selected tile takes focus first (I got it: focus starts on the selected printing), without
    // the native scroll a focus makes: the reveal below brings that tile in, eased, and the two
    // would otherwise fight. With no selected tile there is no reveal, so any other first focus
    // keeps the browser's own scroll (Add cards opens its picker with nothing selected).
    const selected = root?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]');
    if (selected) selected.focus({ preventScroll: true });
    else (root?.querySelector<HTMLElement>("input") ?? root?.querySelector<HTMLElement>('[role="radio"]'))?.focus();
  }, [autoFocus]);
  const [query, setQuery] = useState("");
  const [finish, setFinish] = useState<FinishFilter>("all");
  const tileRefs = useRef(new Map<string, HTMLButtonElement>());

  // A pick the user no longer owns keeps a tile, greyed and unselectable — a ratified
  // exception to decision 5's "fall back silently" (handoff conflict table row 2).
  const dormantPick: Entry | null = useMemo(() => {
    if (preferred === null || deckScope) return null;
    if (printings.some((p) => matchesPreference(p, preferred))) return null;
    return {
      setCode: preferred.setCode,
      // The catalog is only joined for sets the user owns, and by definition this one is
      // no longer owned. The code is the honest label.
      setName: null,
      collectorNumber: preferred.collectorNumber,
      releasedAt: null,
      quantity: 0,
      finishes: {},
      imageUri: null,
      // A printing no longer owned is named by the preference alone, which stores
      // set and collector number and nothing else — there is no printings row in
      // hand to have printed a name of its own.
      flavorName: null,
      dormant: true,
    };
  }, [preferred, printings, deckScope]);

  const entries: Entry[] = useMemo(() => {
    const owned: Entry[] = printings.map((p) => ({ ...p, dormant: false }));
    if (dormantPick === null) return owned;
    // The same comparator the list is already sorted by, so re-acquiring the printing puts
    // a real tile exactly where the dormant one stood — comparing set codes alone would drop
    // it after every other printing from the same set.
    const at = owned.findIndex((p) => comparePrintings(p, dormantPick) > 0);
    const out = [...owned];
    out.splice(at === -1 ? owned.length : at, 0, dormantPick);
    return out;
  }, [printings, dormantPick]);

  const overflow = entries.length > OVERFLOW_THRESHOLD;
  // The phone's row is one run of tiles; set headers only make sense in the grid.
  const grouped = overflow && !row;

  const counts = useMemo(() => {
    let foil = 0;
    let nonfoil = 0;
    for (const p of printings) {
      if (foilCount(p) > 0) foil += 1;
      if ((p.finishes.nonfoil ?? 0) > 0) nonfoil += 1;
    }
    // The dormant tile survives every filter (see `matching`), so it is in each chip's total —
    // a chip label counts the tiles that chip reveals.
    const dormant = entries.length - printings.length;
    return { all: entries.length, foil: foil + dormant, nonfoil: nonfoil + dormant };
  }, [printings, entries.length]);

  // The one predicate the grid and the live announcement both run. Kept together on purpose:
  // announcing a count the chips did not narrow tells a screen-reader user a different story
  // than the tiles do.
  const matching = useCallback(
    (q: string, f: FinishFilter) =>
      entries.filter((p) => {
        // The design table binds the dormant tile and its note to one condition — a stored
        // pick the collection no longer contains — so a filter must not strand the note above
        // a grid the tile has vanished from. It owns no finishes and matches no query, and
        // would fall out of every narrowing otherwise.
        if (p.dormant) return true;
        if (f === "foil" && foilCount(p) === 0) return false;
        if (f === "nonfoil" && (p.finishes.nonfoil ?? 0) === 0) return false;
        if (q === "") return true;
        // Card-name search is useless here — every entry shares the name.
        return (
          (p.setName ?? "").toLowerCase().includes(q) ||
          p.setCode.toLowerCase().includes(q) ||
          p.collectorNumber.toLowerCase().includes(q)
        );
      }),
    [entries],
  );

  const selectedId = props.role === "choose" ? props.selected ?? null : null;
  const selectedKey = useMemo(() => {
    if (!choose || selectedId === null) return null;
    const hit = (sourcePrintings as PrintingChoice[]).find((c) => c.scryfallId === selectedId);
    return hit ? hit.scryfallId : null;
  }, [choose, selectedId, sourcePrintings]);

  const matched = useMemo(
    () => (overflow ? matching(query.trim().toLowerCase(), finish) : entries),
    [entries, overflow, query, finish, matching],
  );
  // A selected tile a search has narrowed out stays first (B2): the way back is never lost.
  const visible = useMemo(() => {
    if (selectedKey === null || matched.some((p) => p.scryfallId === selectedKey)) return matched;
    const sel = entries.find((p) => p.scryfallId === selectedKey);
    return sel ? [sel, ...matched] : matched;
  }, [matched, entries, selectedKey]);

  // Past the threshold the tiles are grouped under set headers; below it they are one flat
  // grid in the order aggregateCollection produced.
  const groups = useMemo(() => {
    if (!grouped) return [{ key: "", label: "", code: "", releasedAt: null as string | null, items: visible }];
    const byCode = new Map<string, { key: string; label: string; code: string; releasedAt: string | null; items: Entry[] }>();
    for (const p of visible) {
      const g = byCode.get(p.setCode);
      if (g) {
        g.items.push(p);
        // The dormant entry carries no set name or release date, so a group it opens would
        // header as a bare code and sort as undated. Any owned sibling knows both.
        if (p.setName !== null) g.label = p.setName;
        if (p.releasedAt !== null) g.releasedAt ??= p.releasedAt;
      } else byCode.set(p.setCode, {
        key: p.setCode,
        label: p.setName ?? p.setCode,
        code: p.setCode,
        releasedAt: p.releasedAt,
        items: [p],
      });
    }
    return [...byCode.values()].sort(compareSetGroups);
  }, [visible, grouped]);

  /** Selectable entries in render order — the roving-tabindex sequence. Dormant is excluded. */
  const navigable = useMemo(
    () => groups.flatMap((g) => g.items).filter((p) => !p.dormant),
    [groups],
  );

  /** Built once per render so the grid does not scan `navigable` for every tile it draws. */
  const navigableIndex = useMemo(
    () => new Map(navigable.map((p, i) => [tileKey(p), i])),
    [navigable, tileKey],
  );

  const preferredKey = preferred === null ? null : printingKey(preferred);
  // Decision 10: with no preference stored nothing is checked, and the roving tabindex parks
  // on the shown-now entry instead.
  const tabStopKey =
    selectedKey !== null && navigableIndex.has(selectedKey)
      ? selectedKey
      : navigable.find((p) => printingKey(p) === preferredKey) !== undefined
      ? preferredKey
      : navigable.find((p) => printingKey(p) === resolvedKey) !== undefined
        ? resolvedKey
        : navigable.length > 0
          ? tileKey(navigable[0])
          : null;

  // The tile the reader is looking for: I got it's selection, else the pick, else the printing
  // shown now. Centered inside the modal's own scroller (and in a sideways row)
  // when the picker opens and again after a pick or a Reset moves it (motion plan U1/U2).
  const revealKey = selectMode ? selectedKey : props.role === "choose" ? null : preferredKey ?? resolvedKey;
  // An arrow key already moved focus, and the browser's own focus scroll with it: keyboard
  // focus-following stays instant, so the selection it makes is not revealed again.
  const keyboardMove = useRef(false);
  const still = props.role !== "choose" && props.still === true;
  // Only the picker's first reveal centers: a later one follows a press, on a tile already in sight.
  const revealed = useRef(false);
  useEffect(() => {
    if (revealKey === null || still) return;
    if (keyboardMove.current) {
      keyboardMove.current = false;
      return;
    }
    // On open, centered in its scroll box, so the printings before it stay in sight above (Hugh,
    // 2026-10-12: "nearest" parked it at the box's foot, rows below where the eye starts). After a
    // pick or a Reset, "nearest": a tile in view stays put under the pointer. A sideways row keeps
    // "nearest" on the page's axis: centering it there would scroll the sheet away from the card.
    const first = !revealed.current;
    revealed.current = true;
    return reveal(tileRefs.current.get(revealKey), row || !first ? "nearest" : "center", "center");
  }, [revealKey, still, row]);

  function focusAndSelect(index: number) {
    const next = navigable[index];
    if (next === undefined) return;
    if ((!choose || selectMode) && tileKey(next) !== revealKey) keyboardMove.current = true;
    tileRefs.current.get(tileKey(next))?.focus();
    // Choosing ends the required step, so an arrow key only moves; a controlled group selects.
    if (!choose || selectMode) pick(next);
  }

  function pick(p: Entry) {
    if (props.role === "choose") {
      const chosen = p.scryfallId ? catalogByKey?.get(p.scryfallId) : undefined;
      if (chosen) props.onPick(chosen);
      return;
    }
    props.onPick(p);
    props.onAnnounce(
      deckScope
        ? deckCopy.announcePicked(p.setName ?? p.setCode, p.collectorNumber)
        : copy.announcePicked(p.setName ?? p.setCode, p.collectorNumber),
    );
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    // Arrows move and select; Tab leaves; Home/End jump the ends; no wrap.
    const last = navigable.length - 1;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? Math.min(index + 1, last)
        : e.key === "ArrowLeft" || e.key === "ArrowUp" ? Math.max(index - 1, 0)
          : e.key === "Home" ? 0
            : e.key === "End" ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    // No wrap means the ends absorb the key. Selecting again from there would re-run the
    // server action and re-announce a pick that never moved.
    if (next === index) return;
    focusAndSelect(next);
  }

  function onQueryChange(value: string) {
    setQuery(value);
    const q = value.trim();
    if (q === "" || props.role === "choose") return;
    props.onAnnounce(copy.announceMatches(matching(q.toLowerCase(), finish).length, q));
  }

  return (
    // Mobile: a bordered continuation of the promoted Set row. Desktop: a block below the
    // meta row on the Prev/Next divider's rhythm.
    <div
      ref={rootRef}
      className={
        selectMode
          ? ""
          : choose
          ? "border-t border-dashed border-[color:var(--border-dashed)] pt-[12px]"
          : "-mt-px rounded-b-[10px] border border-t-0 border-dashed border-[color:var(--border-dashed)] p-[14px] " +
            "md:mt-[24px] md:rounded-none md:border-0 md:border-t md:border-solid md:border-[color:var(--border)] md:p-0 md:pt-[22px]"
      }
    >
      {(props.role !== "choose" || props.intro !== undefined) && <div className="flex items-start justify-between gap-[12px]">
        <p className="text-[13.5px] m-0" style={{ color: "var(--fg-muted)" }}>
          {props.role === "choose"
            ? props.intro
            : deckScope
              ? preferred === null ? deckCopy.regionIntro(printings.length) : deckCopy.regionIntroPicked
              : preferred === null ? copy.regionIntro(printings.length) : copy.regionIntroPicked}
        </p>
        {props.role !== "choose" && !deckScope && preferred !== null && (
          <button
            type="button"
            // The modal announces this one — the string names the printing that becomes
            // current, which only the resolver knows.
            onClick={props.onReset}
            aria-label={copy.resetAria}
            className="shrink-0 cursor-pointer text-[13px] text-[color:var(--accent)]"
          >
            {copy.resetToDefault}
          </button>
        )}
      </div>}

      {dormantPick !== null && (
        <div
          className="mt-[12px] flex items-start gap-[10px] rounded-[9px] p-[12px_14px]"
          style={{ background: "var(--elevated-hover)", border: "1px solid var(--border-strong)" }}
        >
          <span
            aria-hidden
            className="mt-[4px] shrink-0 rotate-45"
            style={{ width: 7, height: 7, background: "var(--fg-faint)" }}
          />
          <p className="m-0 flex-1 text-[12.5px]" style={{ color: "var(--fg-body)" }}>
            {copy.dormantNote(dormantPick.setName ?? dormantPick.setCode)}
          </p>
          <button
            type="button"
            onClick={() => {
              if (props.role === "choose") return;
              props.onForget();
              props.onAnnounce(copy.announceForget);
            }}
            aria-label={copy.dormantClearAria}
            className="shrink-0 cursor-pointer text-[12.5px] text-[color:var(--accent)]"
          >
            {copy.dormantClear}
          </button>
        </div>
      )}

      {overflow && (
        <div className="mt-[14px] flex flex-col gap-[10px]">
          {/* SearchField reused unmodified — 16px on mobile is the iOS zoom floor (#101). */}
          <SearchField
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onClear={() => onQueryChange("")}
            // With a search typed, the first Escape clears it; the next closes the card's dialog. A pick
            // leaves it: the arrow keys pick here, and clearing would reflow the tiles under them.
            onKeyDown={(e) => escapeDismisses(e, query !== "", () => onQueryChange(""))}
            placeholder={choose ? chooseCopy.searchPlaceholder : copy.searchPlaceholder}
            aria-label={choose ? chooseCopy.searchAria : copy.searchAriaLabel}
            className="text-[16px] md:text-[13.5px] py-[9px]"
          />
          {/* The chip geometry, not a chip component: single-select, no dismiss ✕. A catalog
              printing's finishes are not held counts, so the choose role has no finish chips. */}
          {!choose && <div className="flex flex-wrap items-center gap-[6px] md:gap-[8px]">
            <FinishChip label={copy.filterAll(counts.all)} active={finish === "all"} onClick={() => setFinish("all")} />
            <FinishChip label={copy.filterFoil(counts.foil)} active={finish === "foil"} onClick={() => setFinish("foil")} />
            <FinishChip label={copy.filterNonFoil(counts.nonfoil)} active={finish === "nonfoil"} onClick={() => setFinish("nonfoil")} />
          </div>}
        </div>
      )}

      {matched.length === 0 && (
        <div className="mt-[18px]">
          <p className="m-0 text-[14px]" style={{ color: "var(--fg)" }}>{copy.emptyTitle}</p>
          <p className="mt-[4px] mb-0 text-[13px]" style={{ color: "var(--fg-muted)" }}>
            {choose ? chooseCopy.emptyBody(query.trim(), cardName) : copy.emptyBody(query.trim(), cardName)}
          </p>
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="mt-[10px] cursor-pointer text-[13px] text-[color:var(--accent)]"
          >
            {copy.clearSearch}
          </button>
        </div>
      )}

      {/* The element the trigger's aria-controls names is the radiogroup itself, per the design
          a11y tree. It stays mounted through the empty-search branch — an empty radiogroup is
          valid, a dangling aria-controls is not. Search and chips sit outside it deliberately:
          they are not radios. */}
      <div id={id} role="radiogroup" aria-label={choose ? chooseCopy.regionLabel : copy.regionLabel} className={visible.length === 0 || (selectMode && !overflow) ? "" : selectMode ? "mt-[12px]" : "mt-[16px]"}>
        {groups.map((g) => (
            <div key={g.key} className={g.key === "" ? "" : "mt-[16px] first:mt-0"}>
              {grouped && (
                <div
                  className="mb-[8px] font-mono uppercase text-[9.5px] md:text-[10px] tracking-[0.16em]"
                  style={{ color: "var(--fg-faint)" }}
                >
                  {copy.groupSet(g.label, g.code, g.items.length)}
                </div>
              )}
              {/* Three across wherever the tiles clear the 100px legibility floor. Inside the
                  modal's padding a 375px viewport leaves 281px, so those phones drop to two. */}
              <div
                className={
                  row
                    ? confirmTiles
                      ? "-mx-[4px] flex gap-[12px] overflow-x-auto px-[4px] pb-[2px] pt-[4px] md:gap-[14px]"
                      : "-mx-[4px] flex gap-[10px] overflow-x-auto p-[4px]"
                    : "grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-[12px] md:grid-cols-3 md:gap-[16px]"
                }
              >
                {g.items.map((p) => {
                  const key = tileKey(p);
                  const picked = key === preferredKey && !p.dormant;
                  const shownNow = !picked && !p.dormant && key === resolvedKey;
                  const index = navigableIndex.get(key) ?? -1;
                  return (
                    <PrintingTile
                      key={key}
                      entry={p}
                      choose={choose}
                      row={row}
                      picked={picked}
                      shownNow={shownNow}
                      checked={selectMode ? key === selectedKey : undefined}
                      confirmTiles={confirmTiles}
                      colorIdentity={colorIdentity}
                      tabStop={key === tabStopKey}
                      onSelect={() => pick(p)}
                      onKeyDown={(e) => onKeyDown(e, index)}
                      registerRef={(el) => {
                        if (el) tileRefs.current.set(key, el);
                        else tileRefs.current.delete(key);
                      }}
                    />
                  );
                })}
              </div>
            </div>
        ))}
      </div>
      {/* A refused deck save, below the tiles it reverted: a warning glyph and body text, never
          red and with no retry button (deck printings STATES, "Save failed"). */}
      {props.role !== "choose" && props.notice ? (
        <p role="status" className="m-0 mt-[12px] flex items-center gap-[8px] text-[12.5px]" style={{ color: "var(--fg-body)" }}>
          <span aria-hidden className="font-mono font-semibold" style={{ color: "var(--warning)" }}>!</span>
          {props.notice}
        </p>
      ) : null}
    </div>
  );
}

function FinishChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        // 44px on the phone: a finish chip is the only route to that finish,
        // and the desktop figure alone would put it under the floor. R3 §2.
        "cursor-pointer inline-flex items-center rounded-full font-sans text-[12px] md:text-[12.5px] px-[11px] h-[44px] md:h-auto md:py-[5px]",
        "border border-solid border-[color:var(--border-strong)]",
        active
          ? "text-[color:var(--bg)] bg-[color:var(--accent)]"
          : "text-[color:var(--fg)] bg-[color:var(--elevated)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function PrintingTile({
  entry,
  choose,
  row,
  picked,
  shownNow,
  checked,
  confirmTiles = false,
  colorIdentity,
  tabStop,
  onSelect,
  onKeyDown,
  registerRef,
}: {
  entry: Entry;
  choose: boolean;
  row: boolean;
  picked: boolean;
  shownNow: boolean;
  /** A controlled choose group's selection (I got it): checked, outlined, and no badge. */
  checked?: boolean;
  /** I got it's confirm size: 100/104px wide, art radius 9px. */
  confirmTiles?: boolean;
  colorIdentity: string[];
  tabStop: boolean;
  onSelect: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  registerRef: (el: HTMLButtonElement | null) => void;
}) {
  const setLabel = entry.setName ?? entry.setCode;
  // The abbreviation is what this picker's search matches, so it has to be
  // visible and announced — searching "MH3" against a tile that only ever says
  // "Modern Horizons 3" is the #118 complaint. Suppressed when the name IS the
  // code (no catalog row), so the tile doesn't read "MH3 MH3".
  const setHint = entry.setName ? entry.setCode.toUpperCase() : undefined;
  const setAria = setHint ? `${setLabel} (${setHint})` : setLabel;
  // The choose role says what the player holds of the printing, or nothing at all.
  const qty = choose ? (entry.quantity > 0 ? chooseCopy.tileOwned(entry.quantity) : "") : quantityLabel(entry);
  const state = picked ? "picked" : shownNow ? "shown-now" : "plain";
  // The identity is the ground; the printing's art, when it has one, fades in over it (`ArtLayer`).
  const artStyle: React.CSSProperties = { background: identityGradient(colorIdentity) };

  return (
    <button
      ref={registerRef}
      type="button"
      role="radio"
      // The dormant tile is the stored pick — it wears the ✓ badge and "Your pick" label, so
      // reporting it unchecked would tell assistive tech nothing is selected while the screen
      // says otherwise. `picked` stays false because it drives the selectable styling.
      aria-checked={checked ?? (picked || entry.dormant)}
      // Both, and neither is redundant: the focus trap collects `button:not([disabled])`, so
      // only the native attribute keeps the tile out of the Tab cycle — but `role="radio"`
      // overrides the button role that native `disabled` maps from, so AT needs the ARIA one
      // to announce the state. The design tree specifies aria-disabled.
      disabled={entry.dormant}
      aria-disabled={entry.dormant || undefined}
      aria-label={
        entry.dormant
          ? copy.dormantAria(setAria)
          : copy.entryAria(setAria, entry.collectorNumber, qty, state)
      }
      // Dormant keeps its tile but is not selectable: the printing is not in the collection,
      // so picking it would write a preference the resolver could not honour.
      tabIndex={entry.dormant ? -1 : tabStop ? 0 : -1}
      onClick={entry.dormant ? undefined : onSelect}
      onKeyDown={entry.dormant ? undefined : onKeyDown}
      // `self-start`: a tile is stretched to its row's (or grid line's) tallest, and a button centers its
      // content vertically, so a title wrapping to three lines pushed every shorter tile's art down.
      className={`self-start text-left ${row ? (confirmTiles ? "w-[100px] md:w-[104px] shrink-0" : "w-[96px] shrink-0") : ""} ${entry.dormant ? "" : "cursor-pointer"}`}
      style={{ opacity: entry.dormant ? 0.55 : undefined }}
    >
      <div
        className={`relative w-full overflow-hidden ${confirmTiles ? "rounded-[9px]" : "rounded-[10px]"}`}
        style={{
          aspectRatio: "63/88",
          ...artStyle,
          filter: entry.dormant ? "grayscale(0.55)" : undefined,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
          // Three signals, none of them color (decision 3) — the tile sits on card art, so
          // contrast under it is unpredictable. Outline, not border: it must not eat the frame.
          outline: picked || checked
            ? "2px solid var(--accent)"
            : entry.dormant
              ? "2px dashed var(--accent)"
              : shownNow
                ? "1px dashed var(--fg-faint)"
                : undefined,
          outlineOffset: 3,
        }}
      >
        {/* The inset ring rides on the layer too: a host's inset shadow paints under its children. */}
        {entry.imageUri ? <ArtLayer src={entry.imageUri} style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)" }} /> : null}
        {/* Foil sheen — decorative. */}
        {!entry.dormant && foilCount(entry) > 0 && (
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-0 ${confirmTiles ? "rounded-[9px]" : "rounded-[10px]"}`}
            style={{
              background:
                "linear-gradient(115deg, rgba(255,255,255,0.20) 4%, transparent 24%, " +
                "color-mix(in oklab, var(--accent) 20%, transparent) 44%, rgba(255,255,255,0.16) 56%, transparent 80%)",
            }}
          />
        )}
        {(picked || shownNow || entry.dormant) && (
          <span
            aria-hidden
            className="absolute flex items-center justify-center rounded-[5px]"
            style={{
              top: 8,
              right: 8,
              width: picked ? 21 : 19,
              height: picked ? 21 : 19,
              fontSize: 11,
              background: picked
                ? "var(--accent)"
                : entry.dormant
                  ? "color-mix(in oklab, var(--bg) 78%, transparent)"
                  : "color-mix(in oklab, var(--bg) 72%, transparent)",
              border: picked
                ? undefined
                : entry.dormant
                  ? "1px solid var(--accent)"
                  : "1px dashed var(--fg-faint)",
              color: picked ? "var(--bg)" : entry.dormant ? "var(--accent)" : "var(--fg-body)",
            }}
          >
            {shownNow ? "◇" : "✓"}
          </span>
        )}
      </div>
      <div
        className="mt-[7px] text-[12px] md:text-[13px]"
        style={{ color: "var(--fg)", fontWeight: picked || checked ? 600 : 400 }}
      >
        {setLabel}
        {setHint ? (
          // aria-hidden: the button's aria-label already carries the code, so
          // announcing it here would repeat it.
          <span aria-hidden className="ml-[5px] font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>
            {setHint}
          </span>
        ) : null}
      </div>
      <div
        className="mt-[2px] font-mono text-[10.5px] md:text-[11px]"
        style={{ color: picked ? "var(--fg-body)" : "var(--fg-faint)" }}
      >
        {choose ? [entry.collectorNumber ? `#${entry.collectorNumber}` : "", qty].filter(Boolean).join(" · ") : copy.entryMeta(entry.collectorNumber, qty)}
      </div>
      {(picked || shownNow || entry.dormant) && (
        <div
          className="mt-[3px] flex items-center gap-[5px] font-mono uppercase text-[9.5px] tracking-[0.14em]"
          style={{ color: picked || entry.dormant ? "var(--accent)" : "var(--fg-muted)" }}
        >
          {(picked || entry.dormant) && (
            <span aria-hidden className="rotate-45" style={{ width: 7, height: 7, background: "var(--accent)" }} />
          )}
          {picked ? copy.badgePicked : entry.dormant ? copy.dormantBadge : copy.badgeShownNow}
        </div>
      )}
    </button>
  );
}
