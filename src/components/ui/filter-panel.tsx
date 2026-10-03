"use client";
// FilterPanel — the searchable, multi-select filter control from
// design/design_handoff_the99_collection_filter (property table:
// docs/superpowers/design-tables/collection-filter-panel.md).
//
// Used by all four dropdowns in the collection filter row. `searchable={false}`
// drops the field and the group labels with it (Type, Color, Sort);
// `selectionMode="single"` makes it a one-of-many chooser (Sort).
//
// Three rules from the table shape the whole file:
//
// 1. The breakpoint is 768px, and EXACTLY ONE of popover/sheet is mounted.
//    Never "render both, hide one with CSS": the sheet is aria-modal and a
//    hidden duplicate listbox corrupts the accessibility tree.
// 2. DOM focus never leaves the search input while the panel is open. ↑/↓ move
//    `aria-activedescendant`; the active row is styled, not focused. The two
//    accent rings are deliberately distinct — DOM focus at +2px offset (outside,
//    from globals.css), keyboard-active at -2px (inside the row).
// 3. Esc is dismiss, never undo. Selections apply live; there is no Apply.
//
// Zero-count rows stay in the list at opacity .42 with aria-disabled and fail AA
// BY DESIGN, per the WCAG exemption for inactive controls. That is not a bug.
//
// The sub-renders below are plain functions called inline, not nested
// components: a nested component is a new type on every render, so React would
// remount the search input and it would lose focus on the first keystroke.

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBackDismiss, useScrollLock } from "../../lib/a11y/dialog";
import { useSheetHost } from "./sheet-host";
import { rankSetOptions } from "../../lib/collection/set-filter";
import type { FilterPanelCopy } from "../../lib/copy/collection";
import { PrimaryButton } from "./button";
import { SearchField } from "./text-field";
import { useIsDesktop } from "./use-is-desktop";

export type FilterPanelOption = {
  /**
   * Stable identity — the uppercased set code for Set ▾, the type name for
   * Type ▾, the WUBRG letter for Color ▾, the sort key for Sort ▾.
   */
  code: string;
  label: string;
  /**
   * Owned cards surviving the OTHER active filters. Whether 0 disables the row
   * is the caller's call, not this type's: Sort ▾ passes `showCounts={false}`
   * and 0 for every row, all of them enabled.
   */
  count: number;
  disabled: boolean;
  /**
   * A short secondary token shown after the label: the set abbreviation for
   * Set ▾, the WUBRG letter for Color ▾, the current direction for Sort ▾.
   * Optional because Type ▾'s code is just the type name again, and repeating
   * it would be noise.
   */
  hint?: string;
  /**
   * Rendered between the checkbox and the label. Only Availability ▾ uses it —
   * its rows are distinguished by a mark, not by a color swatch in the label.
   */
  leadingGlyph?: ReactNode;
};

/** Desktop option-row minimum height, when the caller does not ask for a taller one. */
const DESKTOP_ROW_MIN = 40;

/** Desktop popover width, when the caller does not ask for a narrower one. */
const POPOVER_WIDTH = 340;
/** Smallest gap the popover keeps between itself and the viewport edge. */
const POPOVER_GUTTER = 16;

/**
 * The popover's `left`, in px, relative to the trigger's left edge.
 *
 * The design anchors the popover to the trigger's left edge, which works for the
 * filter row's leftmost controls and runs off-screen for the rightmost — `Set ▾`
 * sits ~500px from the right edge of a wide window with a 340px panel under it.
 * Pull left by exactly the overflow, and no further than the gutter, so a
 * narrower window trims the right side rather than losing the left.
 */
function popoverShift(triggerLeft: number, viewportWidth: number, width = POPOVER_WIDTH): number {
  const overflow = Math.max(0, triggerLeft + width + POPOVER_GUTTER - viewportWidth);
  return Math.max(-overflow, POPOVER_GUTTER - triggerLeft);
}

/**
 * `clientWidth`, not `window.innerWidth`: innerWidth counts a classic scrollbar,
 * which would eat most of the gutter on platforms that reserve one.
 */
function layoutViewportWidth(): number {
  return document.documentElement.clientWidth;
}

export function FilterPanel({
  copy,
  options,
  selected,
  onToggle,
  onClear,
  searchable = false,
  disabled = false,
  disabledAriaLabel,
  widthPx = POPOVER_WIDTH,
  desktopRowMinPx = DESKTOP_ROW_MIN,
  compact,
  footerStatus = true,
  selectionMode = "multi",
  selectionOrnament = true,
  showCounts = true,
  onAnnounce,
  portalSheet = false,
  note,
  desktopTriggerHeightPx,
}: {
  /**
   * Pins the wide trigger's height. The commander rack holds every control at the chassis's 34px
   * rhythm, and the trigger's own padding draws about 38. The compact trigger keeps its 44px.
   */
  desktopTriggerHeightPx?: number;
  /**
   * One quiet line in the panel's head, under the search field. `Printed in ▾` carries one
   * because its rows match printings the reader does not own, which is the opposite of what
   * `/collection`'s `Set ▾` does one route away.
   */
  note?: string;
  copy: FilterPanelCopy;
  options: FilterPanelOption[];
  selected: string[];
  onToggle: (code: string) => void;
  onClear: () => void;
  searchable?: boolean;
  /**
   * `single` is Sort ▾: exactly one row is always chosen, so choosing another
   * replaces it and dismisses the panel the way a `<select>` would. There is no
   * empty selection to offer a `Clear` for, so the desktop footer goes with it.
   */
  selectionMode?: "multi" | "single";
  /**
   * Whether a chosen row lights the trigger's border and badges the sheet's
   * title. True everywhere by default — a selection made among many is worth
   * announcing, and that includes the rarity panel on a set page, which is
   * single-select WITH an off state (`set-grid-view.tsx:1058-1084`): an active
   * rarity there is a real filter.
   *
   * False on the two Sort mounts, where exactly one row is always chosen. There
   * `selected.length > 0` is unconditionally true, so the border said nothing
   * and read as a filter that is on, and the badge counted one out of one. It
   * also broke the deck toolbar's own rule on arrival — "No accent fill
   * anywhere on the builder's control bar" (`group-toggle.tsx:105-110`).
   *
   * An explicit prop rather than `selectionMode === "single"` for exactly the
   * rarity panel's sake: the two questions look identical and are not. What
   * governs the ornament is whether the panel can be OFF, not how many rows it
   * takes at once.
   */
  selectionOrnament?: boolean;
  /**
   * Whether rows carry a trailing count. Sort ▾ has none — a sort order does not
   * narrow anything, so any number next to it would be the same number.
   */
  showCounts?: boolean;
  /**
   * Desktop popover width in px: Set is 340, Type is 300 (property table §Type
   * ▾). A number, not a class, because the same value also feeds the
   * viewport-overflow math in popoverShift, which a class could never reach.
   */
  widthPx?: number;
  /**
   * Desktop option-row minimum height. 40 is what every collection mount has
   * always drawn and stays the default; the filter chassis passes 44, which
   * `STATES-filter-chassis.md:85-87` specifies for a panel opened from it.
   * A prop rather than a fork — the readiness verdict's §2 ruling is that this
   * component is parameterised and mounted, never duplicated.
   */
  desktopRowMinPx?: number;
  /**
   * Force the compact (sheet) form regardless of this component's own
   * breakpoint. `useIsDesktop()` is 768px and the filter chassis switches at
   * 1000, so a chassis mount that did not pass this would open a desktop
   * popover inside the compact frame across the whole 768-999 band.
   *
   * Undefined keeps the component's own query, which is what every collection
   * mount predating the chassis relies on.
   */
  compact?: boolean;
  /**
   * Whether the footer carries the "N of M selected" text. Type ▾ is drawn
   * without it — and must be, since footerTotal counts cards, which would be a
   * lie about a list of types.
   */
  footerStatus?: boolean;
  /** Empty collection — the whole bar is disabled there. */
  disabled?: boolean;
  /**
   * Accessible reason the trigger is disabled. Without it a disabled trigger
   * still announces "Filter by availability, collapsed", which says nothing
   * about why it will not open.
   */
  disabledAriaLabel?: string;
  /** Writes to the filter bar's single live region. */
  onAnnounce?: (message: string) => void;
  /**
   * Portal the phone sheet out of the head this trigger sits in (collection surfaces E1).
   * Opt-in: from a STICKY head the sheet is fixed inside the head's stacking context and the
   * tab bar paints over it. The desktop popover is anchored to its trigger and never moves.
   */
  portalSheet?: boolean;
}) {
  const ownBreakpoint = useIsDesktop();
  const isDesktop = compact === undefined ? ownBreakpoint : !compact;
  // Every breakpoint-dependent class in this component goes through `bp`, not
  // Tailwind's `md:`. The two disagree: `md:` is 768 and the chassis switches
  // form at 1000, so a panel told `compact` still drew its sheet body — option
  // rows, the search field, the footer — at desktop typography and padding
  // across 768-999, losing the compact touch geometry inside a compact frame.
  // A caller that passes no `compact` keeps this component's own media query,
  // so the surfaces outside the chassis are unaffected.
  const bp = (wide: string, narrow: string) => (isDesktop ? wide : narrow);
  const [open, setOpen] = useState(false);
  const sheetHost = useSheetHost(portalSheet && open && !isDesktop);
  // The host exists on the client from the first render; it is null only on the server,
  // which never opens a sheet.
  const maybePortal = (node: ReactNode) =>
    !portalSheet ? node : sheetHost ? createPortal(node, sheetHost) : null;
  const [query, setQuery] = useState("");
  const [activeCode, setActiveCode] = useState<string | null>(null);
  // Selection as it stood when the panel opened. Grouping is computed once, on
  // open, and NOT recomputed while it is open — re-sorting on every toggle would
  // move rows under the pointer mid-interaction.
  const [pinned, setPinned] = useState<string[]>([]);
  // Live offset of the sheet under a handle drag, in px. 0 when not dragging.
  const [dragY, setDragY] = useState(0);
  // Whether the option list overflows its cap. The bottom fade is a scroll cue,
  // so a list short enough to fit — Type ▾ always is — must not wear one.
  const [scrollable, setScrollable] = useState(false);
  // Desktop popover `left`, measured against the viewport. See popoverShift.
  const [popoverLeft, setPopoverLeft] = useState(0);
  const dragStartY = useRef<number | null>(null);

  // The sheet — never the popover. A phone sheet is `aria-modal` over a scrim,
  // so the page behind it must hold still; the desktop popover is `absolute`
  // beside its trigger and travels with the page, which is what a dropdown does.
  // Only the lock is taken: rule 2 above keeps DOM focus on the search field, so
  // `useDialogA11y`, which moves focus to the first focusable and wraps Tab
  // around it, cannot own this panel.
  useScrollLock(open && !isDesktop);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const uid = useId();
  const listId = `${uid}-list`;
  // The dialog the trigger opens, at either width. Only one of the two panels
  // is mounted at a time, so both can carry the same id.
  const panelId = `${uid}-panel`;
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
      // Measured here rather than in a layout effect: the trigger is already
      // mounted, so the placement is known before the popover paints. A layout
      // effect would either flash at the wrong offset or warn under SSR.
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setPopoverLeft(popoverShift(rect.left, layoutViewportWidth(), widthPx));
      setOpen(true);
    },
    [options, selected, searchable, widthPx],
  );

  /**
   * `preventScroll` is for every dismissal a POINTER made, and for none a keyboard made.
   *
   * Focus returns to the trigger on close, and a browser scrolls a focused element into
   * view — so a reader who opened the sheet 400px down was put back at the top of the list
   * for having closed it. That is the right behaviour for the keyboard, which has to be able
   * to see where focus went, and the wrong one for a thumb: the trigger is off-screen
   * precisely because the reader scrolled away from it, and they did not ask to go back.
   *
   * So Escape keeps the scroll and every pointer path suppresses it — the scroll-dismiss
   * path this flag was added for is one of them rather than the only one.
   *
   * A native button fires `onClick` for Enter and Space as well as for a click, so the
   * pointer paths below read `byPointer(event)` rather than passing a literal: a reader who
   * tabbed to `Done` and pressed Enter is a keyboard dismissal wearing a click's clothes,
   * and must still be shown where focus went.
   */
  const close = useCallback((opts?: { preventScroll?: boolean }) => {
    setOpen(false);
    setActiveCode(null);
    dragStartY.current = null;
    setDragY(0);
    triggerRef.current?.focus({ preventScroll: opts?.preventScroll ?? false });
  }, []);

  // Back closes the sheet rather than the route (#155), on the same terms as the
  // lock above: the phone's sheet is a modal, the desktop popover is a dropdown.
  const closeFromBack = useCallback(() => close(), [close]);
  useBackDismiss(open && !isDesktop, closeFromBack);

  // Focus the search field on open — DOM focus then stays there for the panel's
  // whole life, which is what keeps typing uninterrupted by the arrow keys. With
  // no search field the dialog itself takes focus, or the key handler (which is
  // bound to the dialog) would never fire and the panel would be keyboard-dead.
  useEffect(() => {
    if (!open) return;
    if (searchable) inputRef.current?.focus();
    else (listRef.current ?? panelRef.current)?.focus();
  }, [open, searchable]);

  // Measured after paint rather than derived from options.length: how many rows
  // fit depends on wrapping, which only the browser knows.
  useEffect(() => {
    const el = listRef.current;
    setScrollable(el ? el.scrollHeight > el.clientHeight : false);
  }, [open, options, matches]);

  // Outside click and page scroll dismiss the desktop popover. (The sheet has a
  // backdrop instead, and closes on tap.)
  useEffect(() => {
    if (!open || !isDesktop) return;
    const dismiss = () => {
      setOpen(false);
      setActiveCode(null);
    };
    const onPointerDown = (e: PointerEvent) => {
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
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, isDesktop, close]);

  // Re-place the popover if the window is resized while it is open.
  useEffect(() => {
    if (!open || !isDesktop) return;
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setPopoverLeft(popoverShift(rect.left, layoutViewportWidth(), widthPx));
    };
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, isDesktop, widthPx]);

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

  /**
   * Whether a click came from a pointer at all.
   *
   * `detail` is the click count — 1 or more for a real press, and 0 for the synthetic click a
   * native button fires when it is activated from the keyboard. It is the only signal on the
   * event that separates the two, and the distinction decides whether the dismissal that
   * follows scrolls the trigger back into view.
   */
  const byPointer = (event: { detail: number }) => event.detail > 0;

  /**
   * @param fromPointer  Which of the two ways this row was activated. It decides only whether
   *   the dismissal that follows a single-select puts the reader back at the trigger: a
   *   keyboard user has to be able to see where focus went, and a thumb has not asked to be
   *   returned to a control it deliberately scrolled away from.
   */
  function toggle(option: FilterPanelOption, fromPointer: boolean) {
    if (option.disabled) return; // 0-count rows never toggle, by pointer or by key
    onToggle(option.code);
    // Single-select commits and dismisses: with one row always chosen there is
    // nothing further to do in the panel, and leaving it up invites a second
    // choice that would silently discard the first.
    if (selectionMode === "single") close({ preventScroll: fromPointer });
  }

  // Mobile only: aria-modal means focus must not escape the sheet.
  function trapTab(e: React.KeyboardEvent) {
    const root = panelRef.current;
    if (!root) return;
    // The listbox counts too: with no search field it is the only thing
    // carrying aria-activedescendant, so the options live behind it.
    const focusable = [
      ...root.querySelectorAll<HTMLElement>("button, input, [role='listbox']"),
    ].filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
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
    // Without a field there is nothing to type into, so the first press adopts
    // the first row rather than scrolling the page behind the panel.
    if (e.key === "Enter" || e.key === " ") {
      if (!activeCode && !searchable) {
        const first = visibleOptions()[0];
        if (!first) return;
        e.preventDefault();
        setActiveCode(first.code);
        onAnnounce?.(optionAria(first, selected.includes(first.code)));
        return;
      }
      if (!activeCode) return;
      const option = visibleOptions().find((o) => o.code === activeCode);
      if (option) {
        e.preventDefault();
        toggle(option, false);
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
    if (travelled >= DRAG_DISMISS_PX) close({ preventScroll: true });
  }

  function optionAria(option: FilterPanelOption, isSelected: boolean): string {
    // The hint joins the accessible name because it is searchable: someone
    // typing "MH3" needs to hear which row matched their query.
    const name = option.hint ? `${option.label} (${option.hint})` : option.label;
    return option.disabled
      ? copy.optionAriaUnavailable(name)
      : copy.optionAria(name, option.count, isSelected);
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
        style={isDesktop ? { minHeight: desktopRowMinPx } : undefined}
        onClick={(e) => toggle(option, byPointer(e))}
        className={[
          // items-center per §Option row, at the cost of a wrapped two-line name
          // centring its checkbox instead of aligning it to the first line —
          // deliberate, against misaligning every single-line row by ~4px.
          bp("flex items-center gap-[11px] px-[14px] py-[9px]", "flex items-center gap-[12px] px-[16px] py-[12px]"),
          // Phone stays 48 — already past the 44px floor. Desktop's minimum is
          // the caller's, applied inline because Tailwind cannot compile an
          // interpolated class and this value is a prop.
          "min-h-[48px]",
          option.disabled ? "pointer-events-none opacity-[0.42]" : "cursor-pointer",
          // The keyboard-active row never also takes the hover fill (§Keyboard-
          // active: "Hover fill — none, never combined"). The class is withheld
          // rather than overridden, so nothing rests on generated-CSS order.
          !option.disabled && !isActive ? "md:hover:bg-[color:var(--surface-raised)]" : "",
          isActive
            ? "rounded-[6px] outline outline-2 -outline-offset-2 outline-[color:var(--accent)]"
            : "",
        ].join(" ")}
      >
        {/* Presentational — aria-selected on the option is the truth. */}
        <span
          aria-hidden
          className={[
            `flex ${bp("h-[16px] w-[16px]", "h-[18px] w-[18px]")} flex-none items-center justify-center`,
            // Round for single-select: the shape is the affordance, and a square
            // tick on a one-of-many list promises you can have two.
            selectionMode === "single" ? "rounded-full" : "rounded-[4px]",
            `border border-solid leading-none ${bp("text-[11px]", "text-[12px]")}`,
            isSelected
              ? "bg-[color:var(--accent)] border-[color:var(--accent)] text-[color:var(--bg)]"
              : option.disabled
                ? "bg-[color:var(--bg)] border-[color:var(--border-strong)]"
                : "bg-[color:var(--bg)] border-[color:var(--border-dashed)]",
          ].join(" ")}
        >
          {isSelected ? (selectionMode === "single" ? "●" : "✓") : ""}
        </span>
        {option.leadingGlyph}
        {/* Wraps to two lines in the sheet; ellipsis in the 340px popover. The
            accessible name above always carries the full name either way. */}
        <span
          className={[
            `min-w-0 flex-1 font-sans ${bp("text-[13.5px]", "text-[14.5px]")} leading-[1.35]`,
            bp("whitespace-nowrap overflow-hidden text-ellipsis", ""),
            option.disabled ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg)]",
          ].join(" ")}
        >
          {option.label}
        </span>
        {option.hint ? (
          <span
            aria-hidden
            className={[
              `shrink-0 font-mono ${bp("text-[11px]", "text-[11.5px]")} tracking-[0.04em]`,
              option.disabled ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg-faint)]",
            ].join(" ")}
          >
            {option.hint}
          </span>
        ) : null}
        {showCounts ? (
          <span
            className={[
              `shrink-0 text-right font-mono ${bp("text-[11.5px]", "text-[12px]")} tabular-nums`,
              isSelected && !option.disabled
                ? "text-[color:var(--fg-body)]"
                : "text-[color:var(--fg-faint)]",
            ].join(" ")}
          >
            {/* Pinned, like every other figure the panel prints. An ambient
                locale here put a different separator on the option count from
                the one its own aria label and the result line use. */}
            {option.count.toLocaleString("en-US")}
          </span>
        ) : null}
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
          aria-multiselectable={selectionMode === "multi" ? "true" : undefined}
          aria-label={copy.panelAriaLabel}
          // With a search field the combobox owns focus and the active row; with
          // none the listbox has to, or the keyboard walk moves a highlight that
          // no assistive tech is told about. Keydown still reaches the dialog's
          // handler by bubbling. A real tab stop, not -1: at -1 you could Tab
          // away from the options and never Tab back to them.
          tabIndex={searchable ? undefined : 0}
          aria-activedescendant={
            !searchable && activeCode ? optionDomId(activeCode) : undefined
          }
          className={`m-0 list-none overflow-y-auto p-0 ${bp("max-h-[384px]", "max-h-[60vh]")}`}
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
                    bp("px-[14px] pb-[6px]", "px-[16px] pb-[4px]"),
                    gi === 0
                      ? bp("pt-[2px]", "pt-[4px]")
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
        {isDesktop && scrollable && (
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
      <div className={`${bp("px-[20px] pt-[20px]", "px-[22px] pt-[26px]")} pb-[22px] text-center`}>
        <div
          aria-hidden
          className={`${bp("mb-[12px] gap-[6px]", "mb-[14px] gap-[7px]")} flex justify-center`}
        >
          <Diamond className={bp("h-[6px] w-[6px]", "h-[7px] w-[7px]")} />
          <Diamond className={bp("h-[8px] w-[8px]", "h-[9px] w-[9px]")} />
          <Diamond className={bp("h-[6px] w-[6px]", "h-[7px] w-[7px]")} />
        </div>
        <p className={`m-0 ${bp("mb-[6px] text-[15.5px]", "mb-[7px] text-[17px]")} font-display font-semibold text-[color:var(--fg)]`}>
          {copy.emptyTitle}
        </p>
        <p className={`m-0 font-sans ${bp("text-[12.5px]", "text-[13.5px]")} leading-[1.6] text-[color:var(--fg-muted)]`}>
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
          className={`${bp("mt-[14px] px-[16px] py-[8px] text-[12.5px]", "mt-[16px] px-[18px] py-[10px] text-[13.5px]")} inline-block rounded-lg font-sans font-medium text-[color:var(--fg)] bg-transparent border border-solid border-[color:var(--border-strong)]`}
        >
          {copy.clearSearch}
        </button>
      </div>
    );
  }

  function renderFooter() {
    // Single-select has no Clear and no "N of M" to report, which leaves the
    // desktop bar with nothing in it. The sheet still needs its `Done`.
    if (selectionMode === "single" && isDesktop) return null;
    // Raw. The copy module formats every figure it prints, so a count arriving
    // pre-formatted would be the one separator convention it did not choose.
    const total = options.length;
    const status =
      selected.length === 0 ? copy.footerTotal(total) : copy.footerSelected(selected.length, total);
    const clearButton = (
      <button
        type="button"
        onClick={onClear}
        disabled={selected.length === 0}
        className={[
          `font-sans ${bp("text-[12.5px]", "text-[13.5px]")} font-medium`,
          selected.length > 0
            ? "text-[color:var(--accent)] cursor-pointer"
            : "text-[color:var(--border-dashed)] cursor-default",
        ].join(" ")}
      >
        {copy.clear}
      </button>
    );
    // Desktop always carries the status text on the left with Clear on the
    // right; the sheet swaps Clear into the left slot because Done owns the
    // right one (property table §Panel footer).
    const left = isDesktop ? (
      footerStatus ? (
        <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{status}</span>
      ) : null
    ) : selectionMode === "single" ? null : selected.length > 0 ? (
      clearButton
    ) : footerStatus ? (
      <span className="font-mono text-[11px] text-[color:var(--fg-locked)]">{status}</span>
    ) : null;
    return (
      <div
        className={[
          `flex items-center gap-[12px] border-t border-solid border-[color:var(--border)] ${bp("px-[14px] py-[9px] pb-[9px]", "px-[16px] py-[12px] pb-[20px]")}`,
          // With nothing in the left slot there is one child, and
          // justify-between would park it on the left.
          left ? "justify-between" : "justify-end",
        ].join(" ")}
      >
        {left}
        {isDesktop ? (
          clearButton
        ) : (
          // Dismiss only — it commits nothing.
          <PrimaryButton
            onClick={(e) => close({ preventScroll: byPointer(e) })}
            className="px-[22px] py-[10px] text-[13.5px]"
          >
            {copy.done}
          </PrimaryButton>
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
            // canonical keyboard-walk ring: a 2px accent outline at offset 2px
            // (§Panel search field · Focused). Overridden here, not in the
            // primitive — every other field in the app keeps the halo.
            //
            // The border stands down to --border-strong while focused. The table
            // also turns it accent, but a 1px accent border inside a 2px accent
            // outline reads as two stacked focus rings; the outline is the row
            // the table itself calls canonical, so the border yields.
            //
            // It comes back accent once there is a query (§Filled), where it
            // signals "this field is filtering" rather than focus. That state
            // needs the focus-within variant to outrank the line above, because
            // DOM focus never leaves this input while the panel is open — the
            // unprefixed border alone would always lose.
            containerClassName={
              bp("m-[10px] px-[12px] py-[9px] gap-[9px] ", "mx-[16px] mb-[8px] px-[12px] py-[12px] gap-[9px] ") +
              "focus-within:border-[color:var(--border-strong)] " +
              "focus-within:shadow-none focus-within:outline focus-within:outline-2 " +
              "focus-within:outline-offset-2 focus-within:outline-[color:var(--accent)] " +
              (hasQuery
                ? "border-[color:var(--accent)] focus-within:border-[color:var(--accent)]"
                : "")
            }
            // §Leading icon: 14px mobile / 13px desktop, not the primitive's 15.
            iconClassName={bp("text-[13px]", "text-[14px]")}
            // 14px mobile / 13px desktop as specced. 14px sits under Safari's
            // 16px focus-zoom floor; a global maximum-scale=1 is an App Shell
            // decision, not one to make inside a single control (gap 3).
            // The placeholder is --fg-locked here, not --fg-faint: the table
            // draws it a step quieter, and twMerge drops the primitive's own
            // placeholder colour unless this restates it.
            className={`${bp("text-[13px]", "text-[14px]")} placeholder:text-[color:var(--fg-locked)]`}
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
                  className={`flex ${bp("h-[18px] w-[18px] text-[10px]", "h-[20px] w-[20px] text-[11px]")} shrink-0 items-center justify-center rounded-full bg-[color:var(--elevated)] text-[color:var(--fg-muted)]`}
                >
                  ✕
                </button>
              ) : null
            }
          />
        )}
        {note && (
          <p
            className={`m-0 font-sans text-[color:var(--fg-muted)] ${bp("mx-[12px] mb-[6px] text-[12px]", "mx-[16px] mb-[8px] text-[12.5px]")}`}
          >
            {note}
          </p>
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
  const oneOption = selected.length === 1 ? options.find((o) => o.code === selected[0]) : undefined;
  // Under single-select the hint is state, not identity — it is the direction
  // the list is currently in — so the trigger has to carry it or the bar cannot
  // say which way the collection is sorted. Under multi-select the hint is just
  // an abbreviation of the label, and repeating it in the trigger is noise.
  const oneName =
    selected.length !== 1
      ? null
      : selectionMode === "single" && oneOption?.hint
        ? `${oneOption.label} · ${oneOption.hint}`
        : oneOption?.label ?? selected[0];
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
  const triggerAria =
    disabled && disabledAriaLabel
      ? disabledAriaLabel
      : open
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
        // Only while open: the panel is unmounted when closed, and pointing at
        // an absent id is a broken relationship rather than an empty one — the
        // same guard the search input applies to `listId` above.
        aria-controls={open ? panelId : undefined}
        aria-label={triggerAria}
        style={isDesktop && desktopTriggerHeightPx ? { height: desktopTriggerHeightPx, paddingBlock: 0 } : undefined}
        onClick={() => (open ? close() : openPanel(false))}
        onKeyDown={(e) => {
          if (!open && e.key === "ArrowDown") {
            e.preventDefault();
            openPanel(true); // ↓ opens AND marks the first option active
          }
        }}
        // The trigger's geometry follows `isDesktop`, which honours `compact`,
        // rather than Tailwind's `md:`. The two disagree: `md:` is 768 and the
        // chassis switches at 1000, so a `md:`-drawn trigger took its desktop
        // size across 768-999 while sitting in the compact frame — losing the
        // 44px target the compact form promises, beside controls that kept it.
        className={[
          "inline-flex items-center gap-[8px] whitespace-nowrap",
          isDesktop ? "rounded-lg" : "rounded-full",
          "font-sans font-medium",
          isDesktop
            ? "text-[13px] px-[14px] py-[9px] min-h-0"
            // The drawn padding gives a ~37px chip, under the 44px touch
            // minimum. Grown on the compact form only: a mouse does not need
            // the margin, and the desktop chip is drawn against a denser
            // toolbar.
            : "text-[12.5px] px-[13px] py-[8px] min-h-[44px]",
          "border border-solid",
          disabled
            ? "cursor-not-allowed bg-[color:var(--surface-raised)] text-[color:var(--fg-locked)] border-[color:var(--border)]"
            : open
              ? "cursor-pointer text-[color:var(--fg)] bg-[color:var(--border-strong)] border-[color:var(--accent)]"
              // See `selectionOrnament`. The `open` branch above keeps its
              // accent either way: that one is transient and it means something.
              : selectionOrnament && selected.length > 0
                ? "cursor-pointer text-[color:var(--fg)] bg-[color:var(--elevated)] border-[color:var(--accent)] md:hover:bg-[color:var(--border-strong)]"
                : "cursor-pointer text-[color:var(--fg)] bg-[color:var(--elevated)] border-[color:var(--border-strong)] md:hover:bg-[color:var(--border-strong)] md:hover:border-[color:var(--border-dashed)]",
        ].join(" ")}
      >
        {copy.triggerCount ? (
          // The label and a hidden sizer share one grid cell, so the trigger is as wide as its
          // widest one-digit form (`Sets 9`) from nothing chosen up to nine: a pick moves nothing
          // beside it. Tabular figures make every digit the sizer's width.
          <span className="grid tabular-nums">
            <span aria-hidden="true" className="invisible col-start-1 row-start-1">{copy.triggerCount(9)}</span>
            <span data-trigger-label className="col-start-1 row-start-1">{copy.triggerCount(selected.length)}</span>
          </span>
        ) : oneName !== null && copy.triggerOne ? (
          <span className={`${bp("max-w-[230px]", "max-w-[170px]")} overflow-hidden text-ellipsis whitespace-nowrap`}>
            {copy.triggerOne(oneName)}
          </span>
        ) : (
          <span>{copy.triggerLabel}</span>
        )}
        {/* Names never go in the label past one — they live in the chip row. A counting trigger
            already carries the figure, so it draws no pill beside it. */}
        {selected.length >= 2 && !copy.triggerCount && (
          <span className="rounded-full px-[7px] py-px font-mono text-[11px] font-semibold bg-[color:var(--accent)] text-[color:var(--bg)]">
            {selected.length}
          </span>
        )}
        <span aria-hidden>{open ? "▴" : "▾"}</span>
      </button>

      {open &&
        (isDesktop ? (
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            // Focusable only programmatically: a non-searchable panel has no input
            // to take focus, so the dialog itself has to be able to receive it.
            tabIndex={-1}
            aria-label={copy.panelAriaLabel}
            onKeyDown={onPanelKeyDown}
            onBlur={onPanelBlur}
            // z-30: above the page's own positioned content and below the tab bar (z-40) and the
            // sheets (z-50). At z-10 it TIED with a deck tile's overflow wrapper, which comes later
            // in the document and so won: a ⋯ drew over the open Status list (probe:deck-menu-stack).
            className="absolute top-[calc(100%+6px)] z-30 overflow-hidden rounded-[12px] bg-[color:var(--surface-rail)] border border-solid border-[color:var(--border-strong)] shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
            // A measured per-pixel offset, so it cannot be a class. Not color
            // or border — the inline-style rule is about styles that outrank
            // hover: utilities.
            style={{ left: popoverLeft, width: widthPx }}
          >
            {renderBody()}
          </div>
        ) : (
          maybePortal(<>
            {/* Scrim — the same one the shipped card modal uses. Tap dismisses. */}
            <div
              role="presentation"
              onClick={(e) => close({ preventScroll: byPointer(e) })}
              className="fixed inset-0 z-40 bg-[color-mix(in_oklab,var(--bg)_72%,transparent)]"
            />
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
              aria-label={copy.panelAriaLabel}
              onKeyDown={onPanelKeyDown}
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[78vh] flex-col rounded-t-[16px] bg-[color:var(--surface-rail)] border-t border-solid border-[color:var(--border-strong)] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] anim-sheet-in"
              // The drag offset is per-pixel and only exists mid-gesture, so it
              // cannot be a class. Not color or border — the inline-style rule
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
                  {/* See `selectionOrnament`: a badge counts a selection made
                      among many, and a panel that always holds exactly one has
                      nothing to count. */}
                  {selectionOrnament && selected.length > 0 && (
                    <span className="ml-[8px] rounded-full px-[8px] py-px align-middle font-mono text-[12px] font-semibold bg-[color:var(--accent)] text-[color:var(--bg)]">
                      {selected.length}
                    </span>
                  )}
                </h2>
                <button
                  type="button"
                  onClick={(e) => close({ preventScroll: byPointer(e) })}
                  aria-label={copy.closeLabel}
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[13px] bg-[color:var(--surface-raised)] text-[color:var(--fg-muted)] border border-solid border-[color:var(--border-strong)]"
                >
                  ✕
                </button>
              </div>
              {renderBody()}
            </div>
          </>)
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
