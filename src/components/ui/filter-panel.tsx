"use client";
// FilterPanel — the searchable, multi-select filter control from
// design/design_handoff_the99_collection_filter (property table:
// docs/superpowers/design-tables/collection-filter-panel.md).
//
// Built once and used by `Set ▾` today; the Type ▾ conversion is follow-up work
// and passes `searchable={false}` (the field, and the group labels with it, are
// omitted entirely).
//
// Three rules from the table shape the whole file:
//
// 1. The breakpoint is 768px, and EXACTLY ONE of popover/sheet is mounted.
//    Never "render both, hide one with CSS": the sheet is aria-modal and a
//    hidden duplicate listbox corrupts the accessibility tree.
// 2. DOM focus never leaves the search input while the panel is open. ↑/↓ move
//    `aria-activedescendant`; the active row is styled, not focused. The two
//    brass rings are deliberately distinct — DOM focus at +2px offset (outside,
//    from globals.css), keyboard-active at -2px (inside the row).
// 3. Esc is dismiss, never undo. Selections apply live; there is no Apply.
//
// Zero-count rows stay in the list at opacity .42 with aria-disabled and fail AA
// BY DESIGN, per the WCAG exemption for inactive controls. That is not a bug.
//
// The sub-renders below are plain functions called inline, not nested
// components: a nested component is a new type on every render, so React would
// remount the search input and it would lose focus on the first keystroke.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { rankSetOptions } from "../../lib/collection/set-filter";
import type { FilterPanelCopy } from "../../lib/copy/collection";
import { SearchField } from "./text-field";
import { useIsDesktop } from "./use-is-desktop";

export type FilterPanelOption = {
  /** Stable identity — the uppercased set code for Set ▾. */
  code: string;
  label: string;
  /** Owned cards surviving the OTHER active filters. 0 ⇒ the row is disabled. */
  count: number;
  disabled: boolean;
};

export function FilterPanel({
  copy,
  options,
  selected,
  onToggle,
  onClear,
  searchable = false,
  disabled = false,
  onAnnounce,
}: {
  copy: FilterPanelCopy;
  options: FilterPanelOption[];
  selected: string[];
  onToggle: (code: string) => void;
  onClear: () => void;
  searchable?: boolean;
  /** Empty collection — the whole bar is disabled there. */
  disabled?: boolean;
  /** Writes to the filter bar's single live region. */
  onAnnounce?: (message: string) => void;
}) {
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCode, setActiveCode] = useState<string | null>(null);
  // Selection as it stood when the panel opened. Grouping is computed once, on
  // open, and NOT recomputed while it is open — re-sorting on every toggle would
  // move rows under the pointer mid-interaction.
  const [pinned, setPinned] = useState<string[]>([]);
  // Live offset of the sheet under a handle drag, in px. 0 when not dragging.
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const uid = useId();
  const listId = `${uid}-list`;
  const optionDomId = (code: string) => `${listId}-${code}`;

  const matches = useMemo(() => rankSetOptions(options, query), [options, query]);
  const hasQuery = query.trim() !== "";
  const noResults = hasQuery && matches.length === 0;

  const openPanel = useCallback(
    (activateFirst: boolean) => {
      setPinned(selected);
      setQuery("");
      // The panel opens with the query cleared and `selected` pinned to the top,
      // so the first VISIBLE row is the first selected option, not options[0].
      // Mirrors buildGroups() under those about-to-be-set values.
      let first: string | null = null;
      if (activateFirst) {
        const pins = new Set(selected);
        const pinnedFirst = searchable ? options.find((o) => pins.has(o.code)) : undefined;
        first = pinnedFirst?.code ?? options[0]?.code ?? null;
      }
      setActiveCode(first);
      setOpen(true);
    },
    [options, selected, searchable],
  );

  // `preventScroll` is for the scroll-dismiss path only: the panel closes because
  // the user scrolled, so yanking the page back to the trigger would fight them.
  const close = useCallback((opts?: { preventScroll?: boolean }) => {
    setOpen(false);
    setActiveCode(null);
    dragStartY.current = null;
    setDragY(0);
    triggerRef.current?.focus({ preventScroll: opts?.preventScroll ?? false });
  }, []);

  // Focus the search field on open — DOM focus then stays there for the panel's
  // whole life, which is what keeps typing uninterrupted by the arrow keys. With
  // no search field the dialog itself takes focus, or the key handler (which is
  // bound to the dialog) would never fire and the panel would be keyboard-dead.
  useEffect(() => {
    if (!open) return;
    if (searchable) inputRef.current?.focus();
    else panelRef.current?.focus();
  }, [open, searchable]);

  // Outside click and page scroll dismiss the desktop popover. (The sheet has a
  // backdrop instead, and closes on tap.)
  useEffect(() => {
    if (!open || !isDesktop) return;
    const dismiss = () => {
      setOpen(false);
      setActiveCode(null);
    };
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      dismiss();
    };
    // Scroll unmounts whatever holds focus, so focus has to be put back rather
    // than dropped on the body — but only when it was inside the panel, and
    // without scrolling the trigger back into view against the user's gesture.
    const onScroll = (e: Event) => {
      // Only the PAGE scrolling dismisses. The listener is on window in the
      // capture phase (scroll does not bubble), so it also sees the option list
      // scrolling inside the panel — and dismissing on that would make the list
      // unscrollable.
      const target = e.target as Node | null;
      if (target && panelRef.current?.contains(target)) return;
      if (panelRef.current?.contains(document.activeElement)) close({ preventScroll: true });
      else dismiss();
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, isDesktop, close]);

  // Keep the active row in view. No wrap at the ends, so this only ever nudges.
  useEffect(() => {
    if (!activeCode || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-code="${activeCode}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeCode]);

  // The match count is announced debounced 300ms — FILTERING is synchronous;
  // only the announcement waits, so a fast typist gets one message, not eight.
  useEffect(() => {
    if (!open || !hasQuery || !onAnnounce) return;
    const t = setTimeout(() => onAnnounce(copy.announceMatches(matches.length, query.trim())), 300);
    return () => clearTimeout(t);
  }, [open, hasQuery, matches.length, query, onAnnounce, copy]);

  function toggle(option: FilterPanelOption) {
    if (option.disabled) return; // 0-count rows never toggle, by pointer or by key
    onToggle(option.code);
  }

  // Mobile only: aria-modal means focus must not escape the sheet.
  function trapTab(e: React.KeyboardEvent) {
    const root = panelRef.current;
    if (!root) return;
    const focusable = [...root.querySelectorAll<HTMLElement>("button, input")].filter(
      (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onPanelKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close(); // dismiss, never undo — the selections are already applied
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const visible = visibleOptions();
      if (visible.length === 0) return;
      const i = visible.findIndex((o) => o.code === activeCode);
      // No wrap at either end; from "nothing active", ↓ takes the first row.
      const next =
        e.key === "ArrowDown"
          ? Math.min(i < 0 ? 0 : i + 1, visible.length - 1)
          : Math.max(i < 0 ? 0 : i - 1, 0);
      const option = visible[next];
      setActiveCode(option.code);
      onAnnounce?.(optionAria(option, selected.includes(option.code)));
      return;
    }
    // Space toggles only while a row is active; with no active row the caret is
    // in the field and a space has to type a space (set names contain them).
    if ((e.key === "Enter" || e.key === " ") && activeCode) {
      const option = visibleOptions().find((o) => o.code === activeCode);
      if (option) {
        e.preventDefault();
        toggle(option);
      }
      return;
    }
    if (e.key === "Tab" && !isDesktop) trapTab(e);
  }

  // Desktop only: `Tab` out of the popover dismisses it (§Popover Dismiss, and
  // the keyboard model — Tab moves to `Clear`, then out, closing the panel).
  // React's onBlur is the bubbling `focusout`, so this fires for any descendant.
  // Mobile is excluded because focus is trapped there and never leaves.
  function onPanelBlur(e: React.FocusEvent) {
    if (!isDesktop) return;
    // relatedTarget is null for transient re-focus (and for clicks on inert
    // chrome); treating that as "focus left" would close the panel mid-render.
    const next = e.relatedTarget as Node | null;
    if (!next) return;
    if (panelRef.current?.contains(next) || triggerRef.current?.contains(next)) return;
    setOpen(false);
    setActiveCode(null);
  }

  // Sheet drag-to-dismiss. Tracked live: the sheet follows the pointer down and
  // either snaps back or dismisses past the threshold.
  const DRAG_DISMISS_PX = 80;
  function onHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragStartY.current = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onHandlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return;
    setDragY(Math.max(0, e.clientY - dragStartY.current));
  }
  function onHandlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return;
    const travelled = Math.max(0, e.clientY - dragStartY.current);
    dragStartY.current = null;
    setDragY(0);
    if (travelled >= DRAG_DISMISS_PX) close();
  }

  function optionAria(option: FilterPanelOption, isSelected: boolean): string {
    return option.disabled
      ? copy.optionAriaUnavailable(option.label)
      : copy.optionAria(option.label, option.count.toLocaleString(), isSelected);
  }

  function buildGroups(
    pins: string[],
  ): { label: string; options: FilterPanelOption[] }[] {
    if (hasQuery) {
      // Grouping is dropped under a query: one "N matches" label, ranked list.
      return [{ label: copy.groupMatches(matches.length), options: matches }];
    }
    // Group labels belong to the searchable (Set) panel; Type ▾ has none.
    if (!searchable) return [{ label: "", options }];
    const pinnedSet = new Set(pins);
    const top = options.filter((o) => pinnedSet.has(o.code));
    const rest = options.filter((o) => !pinnedSet.has(o.code));
    if (top.length === 0) return [{ label: copy.groupDefault, options: rest }];
    return [
      { label: copy.groupSelected(top.length), options: top },
      { label: copy.groupDefault, options: rest },
    ];
  }

  function groups() {
    return buildGroups(pinned);
  }

  /**
   * The rendered order, flattened. Arrow keys have to walk THIS and not `options`
   * or `matches`: with a selection, the visible list pins the selected rows to the
   * top, so the raw option order disagrees with what the user sees and with the
   * `aria-posinset` the same row announces.
   */
  function visibleOptions(): FilterPanelOption[] {
    return groups().flatMap((g) => g.options);
  }

  function renderRow(option: FilterPanelOption, posInSet: number, setSize: number) {
    const isSelected = selected.includes(option.code);
    const isActive = activeCode === option.code;
    return (
      // No key handler here on purpose: it lives on the panel. Rows are named
      // by aria-activedescendant and are deliberately not focusable, because DOM
      // focus stays in the search field for the panel's whole life.
      <li
        key={option.code}
        id={optionDomId(option.code)}
        data-code={option.code}
        role="option"
        aria-selected={isSelected}
        aria-disabled={option.disabled || undefined}
        aria-label={optionAria(option, isSelected)}
        // Position over the FLAT list of currently visible options: the options
        // sit two levels down (group → inner ul), so AT cannot infer "2 of 254".
        aria-posinset={posInSet}
        aria-setsize={setSize}
        title={option.label}
        onClick={() => toggle(option)}
        className={[
          // items-center per §Option row, at the cost of a wrapped two-line name
          // centring its checkbox instead of aligning it to the first line —
          // deliberate, against misaligning every single-line row by ~4px.
          "flex items-center gap-[12px] md:gap-[11px] px-[16px] md:px-[14px] py-[12px] md:py-[9px]",
          "min-h-[48px] md:min-h-[40px]",
          option.disabled ? "pointer-events-none opacity-[0.42]" : "cursor-pointer",
          // The keyboard-active row never also takes the hover fill (§Keyboard-
          // active: "Hover fill — none, never combined"). The class is withheld
          // rather than overridden, so nothing rests on generated-CSS order.
          !option.disabled && !isActive ? "md:hover:bg-[color:var(--surface-raised)]" : "",
          isActive
            ? "rounded-[6px] outline outline-2 -outline-offset-2 outline-[color:var(--brass)]"
            : "",
        ].join(" ")}
      >
        {/* Presentational — aria-selected on the option is the truth. */}
        <span
          aria-hidden
          className={[
            "flex h-[18px] w-[18px] md:h-[16px] md:w-[16px] flex-none items-center justify-center",
            "rounded-[4px] border border-solid leading-none text-[12px] md:text-[11px]",
            isSelected
              ? "bg-[color:var(--brass)] border-[color:var(--brass)] text-[color:var(--bg)]"
              : option.disabled
                ? "bg-[color:var(--bg)] border-[color:var(--border-strong)]"
                : "bg-[color:var(--bg)] border-[color:var(--border-dashed)]",
          ].join(" ")}
        >
          {isSelected ? "✓" : ""}
        </span>
        {/* Wraps to two lines in the sheet; ellipsis in the 340px popover. The
            accessible name above always carries the full name either way. */}
        <span
          className={[
            "min-w-0 flex-1 font-sans text-[14.5px] md:text-[13.5px] leading-[1.35]",
            "md:whitespace-nowrap md:overflow-hidden md:text-ellipsis",
            option.disabled ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg)]",
          ].join(" ")}
        >
          {option.label}
        </span>
        <span
          className={[
            "shrink-0 text-right font-mono text-[12px] md:text-[11.5px] tabular-nums",
            isSelected && !option.disabled
              ? "text-[color:var(--fg-body)]"
              : "text-[color:var(--fg-faint)]",
          ].join(" ")}
        >
          {option.count.toLocaleString()}
        </span>
      </li>
    );
  }

  function renderList() {
    const groupList = groups();
    // Flat visible order — the setsize/posinset basis. Codes are unique, so a
    // map by code survives the grouping without threading indices through.
    const flat = groupList.flatMap((g) => g.options);
    const setSize = flat.length;
    const posOf = new Map(flat.map((o, i) => [o.code, i + 1]));
    return (
      <div className="relative">
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          aria-label={copy.panelAriaLabel}
          className="m-0 list-none overflow-y-auto p-0 max-h-[60vh] md:max-h-[384px]"
        >
          {groupList.map((group, gi) => (
            // role=group (not presentation) so the label `<p>` is not a bare
            // non-option child of the listbox; the inner ul stays presentational
            // so the options still count as children of the group.
            <li
              key={group.label || "all"}
              role={group.label !== "" ? "group" : "presentation"}
              aria-label={group.label !== "" ? group.label : undefined}
            >
              {group.label !== "" && (
                <p
                  className={[
                    "m-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--fg-faint)]",
                    "px-[16px] md:px-[14px] pb-[4px] md:pb-[6px]",
                    gi === 0
                      ? "pt-[4px] md:pt-[2px]"
                      : "pt-[8px] border-t border-solid border-[color:var(--border)]",
                  ].join(" ")}
                >
                  {group.label}
                </p>
              )}
              <ul role="presentation" className="m-0 list-none p-0">
                {group.options.map((o) => renderRow(o, posOf.get(o.code) ?? 1, setSize))}
              </ul>
            </li>
          ))}
        </ul>
        {/* Scroll cue — a static gradient, not an animation. Popover only:
            §Transitions gives the sheet no bottom fade. */}
        {isDesktop && (
          <div
            aria-hidden
            className="pointer-events-none -mt-[22px] h-[22px] bg-gradient-to-b from-transparent to-[color:var(--surface-rail)]"
          />
        )}
      </div>
    );
  }

  function renderEmptyState() {
    const emptyBody = copy.emptyBody(query.trim());
    return (
      <div className="px-[22px] pt-[26px] pb-[22px] text-center md:px-[20px] md:pt-[20px]">
        <div
          aria-hidden
          className="mb-[14px] flex justify-center gap-[7px] md:mb-[12px] md:gap-[6px]"
        >
          <Diamond className="h-[7px] w-[7px] md:h-[6px] md:w-[6px]" />
          <Diamond className="h-[9px] w-[9px] md:h-[8px] md:w-[8px]" />
          <Diamond className="h-[7px] w-[7px] md:h-[6px] md:w-[6px]" />
        </div>
        <p className="m-0 mb-[7px] font-display text-[17px] font-semibold text-[color:var(--fg)] md:mb-[6px] md:text-[15.5px]">
          {copy.emptyTitle}
        </p>
        <p className="m-0 font-sans text-[13.5px] leading-[1.6] text-[color:var(--fg-muted)] md:text-[12.5px]">
          {emptyBody.before}
          <span className="font-semibold text-[color:var(--fg-body)]">{emptyBody.query}</span>
          {emptyBody.after}
        </p>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            inputRef.current?.focus();
          }}
          className="mt-[16px] inline-block rounded-lg px-[18px] py-[10px] font-sans text-[13.5px] font-medium text-[color:var(--fg)] bg-transparent border border-solid border-[color:var(--border-strong)] md:mt-[14px] md:px-[16px] md:py-[8px] md:text-[12.5px]"
        >
          {copy.clearSearch}
        </button>
      </div>
    );
  }

  function renderFooter() {
    const total = options.length.toLocaleString();
    const status =
      selected.length === 0 ? copy.footerTotal(total) : copy.footerSelected(selected.length, total);
    const clearButton = (
      <button
        type="button"
        onClick={onClear}
        disabled={selected.length === 0}
        className={[
          "font-sans text-[13.5px] md:text-[12.5px] font-medium",
          selected.length > 0
            ? "text-[color:var(--brass)] cursor-pointer"
            : "text-[color:var(--border-dashed)] cursor-default",
        ].join(" ")}
      >
        {copy.clear}
      </button>
    );
    // Desktop always carries the status text on the left with Clear on the
    // right; the sheet swaps Clear into the left slot because Done owns the
    // right one (property table §Panel footer).
    return (
      <div className="flex items-center justify-between gap-[12px] border-t border-solid border-[color:var(--border)] px-[16px] py-[12px] pb-[20px] md:px-[14px] md:py-[9px] md:pb-[9px]">
        {isDesktop ? (
          <>
            <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{status}</span>
            {clearButton}
          </>
        ) : (
          <>
            {selected.length > 0 ? (
              clearButton
            ) : (
              <span className="font-mono text-[11px] text-[#6E6353]">{status}</span>
            )}
            {/* Dismiss only — it commits nothing. */}
            <button
              type="button"
              onClick={() => close()}
              className="rounded-lg px-[22px] py-[10px] font-sans text-[13.5px] font-semibold bg-[color:var(--brass)] text-[color:var(--bg)]"
            >
              {copy.done}
            </button>
          </>
        )}
      </div>
    );
  }

  function renderBody() {
    return (
      <>
        {searchable && (
          <SearchField
            ref={inputRef}
            role="combobox"
            // The listbox is unmounted in the no-results state, so the reference
            // has to go with it — a combobox pointing at a missing element is a
            // broken relationship, not an empty one.
            aria-controls={noResults ? undefined : listId}
            aria-expanded={!noResults}
            aria-activedescendant={activeCode ? optionDomId(activeCode) : undefined}
            aria-label={copy.searchAriaLabel}
            placeholder={copy.searchPlaceholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveCode(null);
            }}
            // The trailing classes replace the primitive's focus halo with the
            // canonical keyboard-walk ring: 2px #C9A24B at outline-offset 2px
            // (§Panel search field · Focused). Overridden here, not in the
            // primitive — every other field in the app keeps the halo.
            containerClassName={
              "mx-[16px] mb-[8px] md:m-[10px] px-[12px] py-[12px] md:py-[9px] gap-[9px] " +
              "focus-within:shadow-none focus-within:outline focus-within:outline-2 " +
              "focus-within:outline-offset-2 focus-within:outline-[color:var(--brass)]"
            }
            // §Leading icon: 14px mobile / 13px desktop, not the primitive's 15.
            iconClassName="text-[14px] md:text-[13px]"
            // 14px mobile / 13px desktop as specced. 14px sits under Safari's
            // 16px focus-zoom floor; a global maximum-scale=1 is an App Shell
            // decision, not one to make inside a single control (gap 3).
            // The placeholder is #6E6353 here, not --fg-faint; there is no token
            // for it (see the table's token map) and twMerge drops the default.
            className="text-[14px] md:text-[13px] placeholder:text-[#6E6353]"
            trailing={
              query !== "" ? (
                <button
                  type="button"
                  aria-label={copy.clearSearch}
                  onClick={() => {
                    setQuery("");
                    setActiveCode(null);
                    inputRef.current?.focus();
                  }}
                  className="flex h-[20px] w-[20px] md:h-[18px] md:w-[18px] shrink-0 items-center justify-center rounded-full text-[11px] md:text-[10px] bg-[color:var(--elevated)] text-[color:var(--fg-muted)]"
                >
                  ✕
                </button>
              ) : null
            }
          />
        )}
        {noResults ? renderEmptyState() : renderList()}
        {/* Desktop drops the footer entirely in the no-results state — a
            "254 sets owned" bar under "no matches" contradicts itself. The sheet
            keeps its bar in every state, because `Done` is its way out
            (§Empty state, §`Done`: "Rendered always (all sheet states)"). */}
        {(!noResults || !isDesktop) && renderFooter()}
      </>
    );
  }

  // ——— Trigger ———————————————————————————————————————————————
  const oneName =
    selected.length === 1
      ? options.find((o) => o.code === selected[0])?.label ?? selected[0]
      : null;
  // The copy module has no key for the exactly-one accessible name, nor for any
  // of the expanded variants (every key it ships ends "collapsed"), so both are
  // composed here from panelAriaLabel. The canvas's keyboard-walk frame reads
  // "Filter by set, Bloomburrow, collapsed"; expanded swaps the last word, which
  // has to track aria-expanded or the label contradicts it while the panel is up.
  const triggerAriaDetail =
    selected.length === 0
      ? ""
      : selected.length === 1
        ? `, ${oneName}`
        : `, ${selected.length} selected`;
  const triggerAria = open
    ? `${copy.panelAriaLabel}${triggerAriaDetail}, expanded`
    : selected.length === 0
      ? copy.triggerAriaCollapsed
      : selected.length === 1
        ? `${copy.panelAriaLabel}, ${oneName}, collapsed`
        : copy.triggerAriaWithSelection(selected.length);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={triggerAria}
        onClick={() => (open ? close() : openPanel(false))}
        onKeyDown={(e) => {
          if (!open && e.key === "ArrowDown") {
            e.preventDefault();
            openPanel(true); // ↓ opens AND marks the first option active
          }
        }}
        className={[
          "inline-flex items-center gap-[8px] whitespace-nowrap rounded-full md:rounded-lg",
          "font-sans text-[12.5px] md:text-[13px] font-medium px-[13px] md:px-[14px] py-[8px] md:py-[9px]",
          "border border-solid",
          disabled
            ? "cursor-not-allowed bg-[#221D16] text-[#6E6353] border-[color:var(--border)]"
            : open
              ? "cursor-pointer text-[color:var(--fg)] bg-[color:var(--border-strong)] border-[color:var(--brass)]"
              : selected.length > 0
                ? "cursor-pointer text-[color:var(--fg)] bg-[color:var(--elevated)] border-[color:var(--brass)] md:hover:bg-[#332C23]"
                : "cursor-pointer text-[color:var(--fg)] bg-[color:var(--elevated)] border-[color:var(--border-strong)] md:hover:bg-[#332C23] md:hover:border-[color:var(--border-dashed)]",
        ].join(" ")}
      >
        {oneName !== null ? (
          <span className="max-w-[170px] md:max-w-[230px] overflow-hidden text-ellipsis whitespace-nowrap">
            {copy.triggerOne(oneName)}
          </span>
        ) : (
          <span>{copy.triggerLabel}</span>
        )}
        {/* Names never go in the label past one — they live in the chip row. */}
        {selected.length >= 2 && (
          <span className="rounded-full px-[7px] py-px font-mono text-[11px] font-semibold bg-[color:var(--brass)] text-[color:var(--bg)]">
            {selected.length}
          </span>
        )}
        <span aria-hidden>{open ? "▴" : "▾"}</span>
      </button>

      {open &&
        (isDesktop ? (
          <div
            ref={panelRef}
            role="dialog"
            // Focusable only programmatically: a non-searchable panel has no input
            // to take focus, so the dialog itself has to be able to receive it.
            tabIndex={-1}
            aria-label={copy.panelAriaLabel}
            onKeyDown={onPanelKeyDown}
            onBlur={onPanelBlur}
            className="absolute left-0 top-[calc(100%+6px)] z-10 w-[340px] overflow-hidden rounded-[12px] bg-[color:var(--surface-rail)] border border-solid border-[color:var(--border-strong)] shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
          >
            {renderBody()}
          </div>
        ) : (
          <>
            {/* Scrim — the same one the shipped card modal uses. Tap dismisses. */}
            <div
              role="presentation"
              onClick={() => close()}
              className="fixed inset-0 z-40 bg-[rgba(8,6,4,0.72)]"
            />
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
              aria-label={copy.panelAriaLabel}
              onKeyDown={onPanelKeyDown}
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[78vh] flex-col rounded-t-[16px] bg-[color:var(--surface-rail)] border-t border-solid border-[color:var(--border-strong)] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] anim-sheet-in"
              // The drag offset is per-pixel and only exists mid-gesture, so it
              // cannot be a class. Not colour or border — the inline-style rule
              // is about styles that outrank hover: utilities.
              style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
            >
              {/* Drag handle — drag-to-dismiss (§Sheet Dismiss), tracked live and
                  snapping back under the threshold. aria-hidden and unfocusable
                  on purpose: the `✕` below is the one accessible close control,
                  and two identically-labelled buttons in a row is a defect. */}
              <div
                aria-hidden
                onPointerDown={onHandlePointerDown}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
                onPointerCancel={onHandlePointerUp}
                className="flex touch-none justify-center pt-[9px] pb-[4px]"
              >
                <span className="h-[4px] w-[36px] rounded-full bg-[color:var(--border-strong)]" />
              </div>
              <div className="flex items-center justify-between px-[16px] pt-[4px] pb-[10px]">
                <h2 className="m-0 font-display text-[18px] font-semibold text-[color:var(--fg)]">
                  {copy.sheetTitle}
                  {selected.length > 0 && (
                    <span className="ml-[8px] rounded-full px-[8px] py-px align-middle font-mono text-[12px] font-semibold bg-[color:var(--brass)] text-[color:var(--bg)]">
                      {selected.length}
                    </span>
                  )}
                </h2>
                <button
                  type="button"
                  onClick={() => close()}
                  aria-label={copy.closeLabel}
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[13px] bg-[color:var(--surface-raised)] text-[color:var(--fg-muted)] border border-solid border-[color:var(--border-strong)]"
                >
                  ✕
                </button>
              </div>
              {renderBody()}
            </div>
          </>
        ))}
    </div>
  );
}

/** Card-fan stand-in — three rotated diamonds, rebuilt as SVG per the table. */
function Diamond({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 10 10" className={className} aria-hidden>
      <rect
        x="1.5"
        y="1.5"
        width="7"
        height="7"
        transform="rotate(45 5 5)"
        fill="var(--border-strong)"
      />
    </svg>
  );
}
