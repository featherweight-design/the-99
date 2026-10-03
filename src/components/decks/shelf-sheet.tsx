"use client";

// The compact shelf picker (STATES C3/C4). Below 1000px the level is a trigger
// and this sheet — the one shape change in the round, and the declared exception
// to chassis decision 23, because three player-named shelves at a 44px target
// are past 358px and a second horizontal scroller above the chassis is the
// defect `scrollCompactControls` exists to contain rather than duplicate.
//
// A ROUND MARK, never a square tick: `filter-panel.tsx:519` — "a square tick on
// a one-of-many list promises you can have two". This is single-select.
//
// ITS OWN LIVE REGION (errata E10). The sheet is `aria-modal`, so the chassis's
// result line sits outside it and goes quiet while it is open; a shelf changed
// in here would otherwise be announced nowhere. The announcement NAMES THE
// SHELF rather than restating the result sentence, because `ResultLine` returns
// early on identical text and two shelves of four decks would announce once and
// then fall silent on the switch that matters.

import { useEffect, useRef, useState } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { folderCopy } from "../../lib/copy/folders";
import type { Shelf } from "../../lib/decks/folder-view";
import type { ShelfSegment } from "./shelf-line";

const ROW =
  "flex min-h-[48px] w-full cursor-pointer items-center gap-[12px] border-x-0 border-b-0 "
  + "border-t border-solid border-[color:var(--border)] bg-transparent px-[16px] py-[12px] text-left";

/**
 * Current shelf first, then the rest in the line's own order — and the pinned
 * shelf is REMOVED from the remainder rather than printed twice (errata E8).
 * Computed once, on open: re-sorting under a reader's thumb moves the row they
 * are reaching for.
 */
export function pinnedOrder(segments: readonly ShelfSegment[], shelf: Shelf): ShelfSegment[] {
  const current = segments.find((s) => s.shelf === shelf);
  if (!current) return [...segments];
  return [current, ...segments.filter((s) => s.shelf !== shelf)];
}

export function ShelfSheet({
  segments,
  shelf,
  onSelect,
  onCreate,
  onDismiss,
}: {
  segments: readonly ShelfSegment[];
  shelf: Shelf;
  onSelect: (next: Shelf) => void;
  onCreate: () => void;
  onDismiss: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  useDialogA11y(dialog, onDismiss, { initialFocusRef: dialog });

  // Pinned once, on open — `useState`'s initialiser rather than a memo, because
  // a memo would recompute the moment the selection it is keyed on changes,
  // which is exactly the re-sort C4 forbids.
  const [rows] = useState(() => pinnedOrder(segments, shelf));

  // The sheet's own region. Debounced like the filter sheet's, and keyed on the
  // shelf rather than on its sentence.
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const current = segments.find((s) => s.shelf === shelf);
    if (!current) return;
    const t = setTimeout(
      () => setAnnouncement(folderCopy.shelves.aria(current.label, current.count)),
      300,
    );
    return () => clearTimeout(t);
  }, [shelf, segments]);

  return (
    <div className="fixed inset-0 z-50 hidden flex-col justify-end max-[999px]:flex">
      <div
        aria-hidden="true"
        onClick={onDismiss}
        className="absolute inset-0 bg-[rgba(16,13,10,0.74)]"
      />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={folderCopy.shelves.sheetTitle}
        tabIndex={-1}
        // Bounded, and the ROWS are what scrolls: a player with a dozen shelves
        // would otherwise push `New folder…` and `Done` off the bottom of a
        // sheet that has no scroll of its own.
        className="relative z-10 flex max-h-[80vh] flex-col rounded-t-[22px] border-x-0 border-b-0 border-t border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] pb-[16px]"
      >
        <div
          aria-hidden="true"
          className="mt-[9px] mb-[4px] h-[4px] w-[36px] self-center rounded-[2px] bg-[color:var(--border-strong)]"
        />

        <div className="flex items-center justify-between px-[16px] pb-[10px]">
          <h2 className="m-0 font-display text-[18px] font-semibold text-[color:var(--fg)]">
            {folderCopy.shelves.sheetTitle}
          </h2>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={folderCopy.shelves.closeLabel}
            className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] text-[13px] text-[color:var(--fg-muted)]"
          >
            ✕
          </button>
        </div>

        {/* `overscroll-contain` (Hugh, 2026-10-03): stops a scroll of this list at either
            end from chaining into the page behind the sheet. */}
        <div className="flex min-h-0 flex-auto flex-col overflow-y-auto overscroll-contain">
        {rows.map((row) => {
          const selected = row.shelf === shelf;
          return (
            <button
              key={row.shelf ?? "all"}
              type="button"
              onClick={() => onSelect(row.shelf)}
              aria-current={selected ? "true" : undefined}
              aria-label={folderCopy.shelves.aria(row.label, row.count)}
              className={ROW}
            >
              <span
                aria-hidden
                className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[12px] ${
                  selected
                    ? "border border-solid border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--bg)]"
                    : "border border-dashed border-[color:var(--border-dashed)] bg-[color:var(--bg)]"
                }`}
              >
                {selected ? "●" : ""}
              </span>
              <span className="flex-1 text-[14.5px] text-[color:var(--fg)]">{row.label}</span>
              <span
                className={`font-mono text-[12px] ${
                  selected ? "text-[color:var(--fg-body)]" : "text-[color:var(--fg-faint)]"
                }`}
              >
                {row.count}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onCreate}
          className={`${ROW} gap-[10px] text-[color:var(--fg-body)]`}
        >
          <span aria-hidden className="font-mono text-[14px]">
            +
          </span>
          {/* The line and the sheet share one label; `actionFromMove` is the
              move panel's, where the row makes a destination you are about to
              file into. */}
          <span className="text-[14.5px]">{folderCopy.create.action}</span>
        </button>
        </div>

        {/* `Done` dismisses; it does not apply. Selection already happened as
            the reader tapped, which is the same contract the filter sheet has. */}
        <button
          type="button"
          onClick={onDismiss}
          className="mx-[16px] mt-[12px] flex h-[44px] cursor-pointer items-center justify-center rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-transparent font-sans text-[13.5px] text-[color:var(--fg)]"
        >
          {folderCopy.shelves.sheetDismiss}
        </button>

        <p
          aria-live="polite"
          aria-atomic="true"
          className="sr-only m-0"
        >
          {announcement}
        </p>
      </div>
    </div>
  );
}
