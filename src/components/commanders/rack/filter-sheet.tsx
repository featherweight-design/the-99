"use client";
// The filter sheet — every control except search and order, below 1024px.
//
// `src/components/ui/filter-panel.tsx` is the reference implementation and its
// rules are carried whole rather than redesigned: the same sheet markup, the
// same scrim, the same 80px drag-to-dismiss, the same focus trap, and the same
// 300ms-debounced announcement.
//
// Three of those rules matter more than the markup:
//
// 1. EXACTLY ONE of the sheet and the inline rack is mounted. Closed returns
//    null — never a hidden duplicate, which would put a second copy of every
//    radiogroup in the accessibility tree.
// 2. Taps apply immediately. There is no Apply and nothing is staged: the
//    footer's primary only dismisses, and its label tracks the live count.
// 3. Esc is dismiss, never undo — as are the handle drag, the scrim tap and
//    that primary. They are one action with four gestures.
//
// Search and order are deliberately absent: both stay on the persistent row
// behind the scrim, which is why `activeControlCount` counts neither and why
// the badge here cannot either. A second copy of the order control in the sheet
// is what the reader reported as redundant — two doors to one control, one of
// them behind a scrim hiding the other.

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  activeControlCount,
  defaultParams,
  type Lane,
  type LaneParams,
} from "../../../lib/commanders/lane-params";
import { useBackDismiss, useScrollLock } from "../../../lib/a11y/dialog";
import { commandersCopy, filterCopy } from "../../../lib/copy/lanes";
import { PrimaryButton } from "../../ui/button";
import { AvailabilityControl } from "./availability-control";
import { PrintedInControl } from "./printed-in-control";
import type { PrintedInOption } from "../../../lib/commanders/printed-in-lane";
import { ColourControl } from "./colour-control";

/** Travel past which the handle drag dismisses rather than snapping back. */
const DRAG_DISMISS_PX = 80;


export function FilterSheet({
  open,
  onOpenChange,
  params,
  lane,
  onChange,
  shown,
  total,
  resultLine,
  printedInOptions,
}: {
  /** The lane's whole list, for the set layer's announcement. Defaults to `shown`. */
  total?: number;
  /** `Printed in ▾`'s rows; absent where the lane shipped no index. */
  printedInOptions?: PrintedInOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  params: LaneParams;
  lane: Lane;
  onChange: (next: LaneParams) => void;
  /** Rows the current parameters would show. The footer's dismiss label says it,
      live — nothing here is staged. The header says it too, but through
      `resultLine`, which is the rack's whole composed sentence. */
  shown: number;
  /** The rack's composed sentence, asides and all. Passed in rather than rebuilt
      here: the header's own promise is that it is the SAME sentence the result
      line behind the scrim is showing, and a second call to compose it is a
      second place the two could drift. They did — the sheet recomposed the
      sentence alone, so both asides went missing the moment the reader opened
      Filters, which below `CHASSIS_WIDE_MIN_PX` is the only place four of the
      lane's controls exist. */
  resultLine: string;
}) {
  // Live offset of the sheet under a handle drag, in px. 0 when not dragging.
  const [dragY, setDragY] = useState(0);
  // Plain, and it survives nothing, because THIS COMPONENT survives nothing: the
  // rack mounts it only while it is open. Three review rounds went into keeping
  // an announcement honest across a closed sheet — a stale count on reopen, then
  // an aside naming commanders free mode hid, then the same sentence read out
  // again on a reopening that had changed nothing — and each fix was a better
  // answer to "what is this announcement's identity". The scope answer is that
  // it has no identity to manage. A sheet that unmounts when it closes starts
  // every opening silent by construction, and the two stamps that were tracking
  // that by hand are gone with it.
  const [announcement, setAnnouncement] = useState("");
  // The Printed in layer is up: this sheet goes inert under it, and the layer owns the keys.
  const [layered, setLayered] = useState(false);
  const dragStartY = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // The count as last announced. Null means "not announced yet this opening",
  // which is what keeps the sheet from reading its own count out on open.
  const lastShown = useRef<number | null>(null);

  // The page holds still behind the sheet. This one traps focus itself — it owns
  // its Escape and its drag dismissal — so it takes the lock alone rather than
  // `useDialogA11y` whole, through the same counter every other dialog uses.
  useScrollLock(open);
  // And Back closes it rather than leaving the route (#155).
  useBackDismiss(open, () => onOpenChange(false));

  // aria-modal means focus has to start inside the sheet, and the key handler
  // is bound to the dialog — without this, Esc would never reach it.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  // The count is announced debounced 300ms, exactly as the reference panel
  // announces its match count: FILTERING is immediate and only the message
  // waits, so a reader tapping four pips hears one number, not four.
  //
  // THIS REGION SPEAKS FOR THE FILTERS, and for nothing else. It briefly
  // announced the rack's whole composed sentence instead, so that the hidden-row
  // aside would reach a compact reader — and that put two announcements on one
  // `Build from` flip, because `silentResult` quiets the chassis result row and
  // not the lane's own mode announcer, which was already speaking for that
  // change. The aside now rides on that mode announcement, where the change it
  // explains is announced, and this region is back to the one job it can hold
  // without duplicating another.
  useEffect(() => {
    if (!open) {
      lastShown.current = null;
      return;
    }
    if (lastShown.current === null || lastShown.current === shown) {
      lastShown.current = shown;
      return;
    }
    lastShown.current = shown;
    const t = setTimeout(() => setAnnouncement(filterCopy.sheet.dismiss(shown)), 300);
    return () => clearTimeout(t);
  }, [open, shown]);

  if (!open) return null;

  const active = activeControlCount(params, lane);

  function close() {
    dragStartY.current = null;
    setDragY(0);
    onOpenChange(false);
  }

  // aria-modal: focus must not escape the sheet while it is up.
  function trapTab(e: React.KeyboardEvent) {
    const root = panelRef.current;
    if (!root) return;
    const focusable = [...root.querySelectorAll<HTMLElement>("button")].filter(
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

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      // Dismiss, never undo — every tap is already applied.
      close();
      return;
    }
    if (e.key === "Tab") trapTab(e);
  }

  // Drag-to-dismiss, tracked live: the sheet follows the pointer down and either
  // snaps back or dismisses past the threshold.
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

  // The pips and their match modifier are one control and one group; the rest
  // are wrapped here, so the sections are named in rack order.
  const colour = (
    <ColourControl
      colors={params.colors}
      match={params.match}
      onColorsChange={(colors) => onChange({ ...params, colors })}
      onMatchChange={(match) => onChange({ ...params, match })}
      wide={false}
    />
  );

  return (
    <>
      {/* Scrim — the app's shipped one. Tap dismisses, and commits nothing. */}
      <div
        role="presentation"
        onClick={close}
        className="fixed inset-0 z-40 bg-[color-mix(in_oklab,var(--bg)_72%,transparent)]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-label={filterCopy.sheet.title}
        onKeyDown={onKeyDown}
        inert={layered}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[78vh] flex-col rounded-t-[16px] bg-[color:var(--surface-rail)] border-t border-solid border-[color:var(--border-strong)] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] anim-sheet-in"
        // The drag offset is per-pixel and only exists mid-gesture, so it cannot
        // be a class. Not colour or border — the inline-style rule is about
        // styles that outrank hover: utilities.
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
      >
        {/* Drag handle. aria-hidden and unfocusable on purpose: the footer's
            primary is the accessible way out, and a second control with the
            same job would be announced as a duplicate. */}
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

        <div className="flex items-baseline gap-[10px] px-[16px] pt-[4px] pb-[10px]">
          <h2 className="m-0 font-display text-[18px] font-semibold text-[color:var(--fg)]">
            {filterCopy.sheet.title}
          </h2>
          {/* The rack's own sentence, drawn silently. Every tap applies at once,
              so the header answers "what would I be left with" while the reader
              is still in the sheet — and it is the SAME sentence the result line
              behind the scrim is showing, never a second count that could
              disagree. Silent because that line is the lane's one live region;
              the sheet's debounced announcer is what speaks here. */}
          <span className="ml-auto font-mono text-[11px] tabular-nums text-[color:var(--fg-body)]">
            {resultLine}
          </span>
        </div>

        {/* min-h-0 so the section stack scrolls inside the 78vh cap rather than
            pushing the footer off the bottom of the sheet. */}
        <div className="flex min-h-0 flex-1 flex-col gap-[22px] overflow-y-auto px-[16px] py-[6px]">
          {colour}
          {/* Before Build from, whose explainer is a hint line: sheet order rule 4 puts a
              control carrying a hint last, and Printed in's hint lives in its own layer. */}
          {printedInOptions && (
            <PrintedInControl
              form="sheet"
              options={printedInOptions}
              selected={params.printedIn}
              onChange={(printedIn) => onChange({ ...params, printedIn })}
              shown={shown}
              total={total ?? shown}
              onLayerChange={setLayered}
            />
          )}
          {/* Last, carrying its hint line (rule 4). The control draws its own legend and
              its own explainer, so the section only has to name itself for AT. */}
          {lane === "owned" && (
            <Section legend={commandersCopy.availability.legend} showLegend={false}>
              <AvailabilityControl
                value={params.avail}
                onChange={(avail) => onChange({ ...params, avail })}
                wide={false}
              />
            </Section>
          )}
        </div>

        <div className="flex items-center justify-between gap-[12px] border-t border-solid border-[color:var(--border)] px-[16px] pt-[12px] pb-[20px]">
          <button
            type="button"
            // Search is not in this sheet, so Clear does not reach it: clearing
            // a query the reader cannot see from here would be a control acting
            // outside its own frame.
            onClick={() => onChange({ ...defaultParams(lane), q: params.q, order: params.order })}
            disabled={active === 0}
            className={[
              "font-sans text-[13.5px] font-medium",
              active > 0
                ? "cursor-pointer text-[color:var(--accent)]"
                : "cursor-default text-[color:var(--fg-locked)]",
            ].join(" ")}
          >
            {filterCopy.chips.clear}
          </button>
          {/* Dismiss only. It commits nothing, because everything is committed. */}
          <PrimaryButton onClick={close} className="px-[22px] py-[12px] text-[13.5px]">
            {filterCopy.sheet.dismiss(shown)}
          </PrimaryButton>
        </div>

        <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {announcement}
        </span>
      </div>
    </>
  );
}

// Module scope, deliberately: a component declared inside `FilterSheet` would be
// a new type on every render and would remount its whole subtree.
//
// The group is what names a section for AT. `AvailabilityControl` is a
// radiogroup, which is the right role for what it is but not one that stands in
// for a section heading — and the sheet's sections have to be walkable in rack
// order.
function Section({
  legend,
  showLegend,
  children,
}: {
  legend: string;
  /** False where the control already draws its own caption. */
  showLegend: boolean;
  children: ReactNode;
}) {
  return (
    <div role="group" aria-label={legend} className="flex flex-col gap-[10px]">
      {showLegend && (
        <p className="font-mono m-0 text-[10px] tracking-[0.12em] uppercase text-[color:var(--fg-faint)]">
          {legend}
        </p>
      )}
      {children}
    </div>
  );
}
