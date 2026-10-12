"use client";

// The shelf line — the nav level above the chassis (handoff decision 2).
//
// §1 of the canvas, candidate `1a`. One 34px line on `--bg`, above the chassis's
// `--surface-sunken` ground, so the two are different surfaces as well as
// different heights. Every shelf and its count is on screen without opening
// anything, which is what makes a feature nothing currently draws discoverable.
//
// NOT A FILTER, and the treatment says so twice: the selected segment spends no
// accent (decision 3 — `--fg` on `--elevated` under a `--border-strong` ring,
// what the active `By type` pill already draws), and accent stays the chassis's
// own "this filter is on". Nothing here appears in a chip, in the `Filters`
// badge, or under `Clear all filters`.

import { folderCopy } from "../../lib/copy/folders";
import {
  ALL_DECKS,
  UNFILED,
  showsUnfiled,
  type Shelf,
  type ShelfCounts,
} from "../../lib/decks/folder-view";
import type { DeckFolderWithCount } from "../../lib/decks/folders";
import { Chevron } from "../ui/chevron";

export type ShelfSegment = { shelf: Shelf; label: string; count: number };

/**
 * The segments, in the order the line prints them: All decks, folders by name —
 * `listFolders`' own order, and its reason carries, because a creation order
 * moves a shelf the moment one is added — then Unfiled, which is the residue
 * rather than a shelf anybody chose.
 *
 * `Unfiled` is omitted until the first folder exists (decision 13): with no
 * folders every deck is unfiled, so a bucket equal to the whole list is a
 * distinction without a difference.
 */
export function shelfSegments(
  folders: readonly DeckFolderWithCount[],
  counts: ShelfCounts,
): ShelfSegment[] {
  const segments: ShelfSegment[] = [
    { shelf: ALL_DECKS, label: folderCopy.shelves.all, count: counts.all },
    ...folders.map((f) => ({
      shelf: f.id as Shelf,
      label: f.name,
      count: counts.byFolder.get(f.id) ?? 0,
    })),
  ];
  if (showsUnfiled(folders)) {
    segments.push({ shelf: UNFILED, label: folderCopy.shelves.unfiled, count: counts.unfiled });
  }
  return segments;
}

// No horizontal padding here: the segment's own padding depends on what it
// holds — a bare button pays it inside, and a button plus a `…` splits it — and
// an `px-` on the shared base fought whatever the case set, doubling it on the
// segments with no actions.
const SEGMENT =
  "inline-flex h-[34px] cursor-pointer items-center whitespace-nowrap rounded-[8px] "
  + "border border-solid font-sans text-[13px]";

/**
 * The wide form. A plain button group carrying `aria-current` — not a tablist:
 * a segment changes what the list contains, not what page you are on, and
 * `aria-selected` outside a tablist is not honoured (STATES §8).
 *
 * The line may wrap to a second row; the chassis below it may not. A shelf
 * change moves the list anyway, so the height change costs the reader nothing —
 * which is the argument decision 10 makes and the reason the two rules differ.
 */
export function ShelfLine({
  folders,
  counts,
  shelf,
  onSelect,
  onCreate,
  menu,
  lead,
}: {
  folders: readonly DeckFolderWithCount[];
  counts: ShelfCounts;
  shelf: Shelf;
  onSelect: (next: Shelf) => void;
  onCreate: () => void;
  /**
   * The selected shelf's own `…`, drawn INSIDE its segment (STATES W3). Only a
   * named folder gets one — `All decks` and `Unfiled` have nothing to rename or
   * delete — so the caller returns null for those and for every unselected
   * segment.
   */
  menu?: (segment: ShelfSegment) => React.ReactNode;
  /** What leads the row, outside the shelves' group: the `Tiles · Stats` switch (Stats on /decks), then a
   *  hairline. Absent, the line is exactly as it shipped. */
  lead?: React.ReactNode;
}) {
  const line = (
    <div
      data-shelf-line
      // A named GROUP: an `aria-label` on a bare div names nothing in the
      // accessibility tree, so the level had no identity at all. `role="group"`
      // is what `import-entry.tsx` already uses for a set of related controls.
      role="group"
      aria-label={folderCopy.shelves.sheetTitle}
      // WRAPS TO TWO ROWS AND THEN SCROLLS (STATES W5). The chassis below may
      // never wrap, because it promises a fixed height while a reader filters;
      // this line moves the list only when the reader changes shelf, which moves
      // it anyway.
      //
      // THE SCROLL IS VERTICAL, WHERE W5 SAYS HORIZONTAL, and it is deliberate.
      // A wrapped flex row overflows on the cross axis: `overflow-x` cannot
      // reach a third line, so pairing the two-row ceiling with a horizontal
      // scroller CLIPS every shelf past the second row out of existence — which
      // is worse than the state W5 was written to avoid. A horizontal answer
      // needs a two-row column flow, and that reads wrong at three segments,
      // where it would stack the second under the first. Recorded for Design
      // rather than guessed at; a player with fifteen shelves is the reader
      // READINESS itself says this round is not drawn for.
      // 94px, not 74: two 34px rows and their 6px gap are 74 on their own, and
      // the container's own 20px of padding is inside the box under this app's
      // border-box reset — at 74 the second row was already in the scroll area
      // rather than on screen, which is the opposite of a two-row ceiling.
      className={`flex max-h-[94px] flex-wrap items-center gap-[6px] overflow-y-auto bg-[color:var(--bg)] py-[10px] ${lead ? "min-w-0 flex-1 pr-[22px]" : "px-[22px]"}`}
    >
      {shelfSegments(folders, counts).map((segment) => {
        const selected = segment.shelf === shelf;
        const actions = selected ? menu?.(segment) : null;
        // A `div` either way, so the element type does not change under a
        // keyboard reader when they select a shelf — and so the panel's own
        // `div` is not phrasing content inside a `span`, which a browser would
        // close early and hydrate differently from React's tree.
        return (
          <div
            key={segment.shelf ?? "all"}
            className={`${SEGMENT} ${actions ? "pr-[5px]" : "px-0"} ${
              selected
                ? "border-[color:var(--border-strong)] bg-[color:var(--elevated)] font-medium text-[color:var(--fg)]"
                : "border-transparent bg-transparent text-[color:var(--fg-muted)]"
            }`}
          >
            <button
              type="button"
              aria-current={selected ? "true" : undefined}
              aria-label={folderCopy.shelves.aria(segment.label, segment.count)}
              onClick={() => onSelect(segment.shelf)}
              // The padding stays on the BUTTON: put on the wrapper it became a
              // dead zone, where the segment looked pressable and was not.
              className={`flex h-[32px] cursor-pointer items-center border-none bg-transparent px-[11px] font-sans text-[13px] ${
                selected ? "font-medium text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]"
              }`}
            >
              <span className="max-w-[220px] overflow-hidden text-ellipsis" title={segment.label}>
                {segment.label}
              </span>
              <span className="ml-[7px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">
                {segment.count}
              </span>
            </button>
            {actions}
          </div>
        );
      })}

      <span className="flex-1" />

      {/* Dashed, because it makes a shelf rather than selecting one — the same
          distinction `--border-dashed` already carries elsewhere. */}
      <button
        type="button"
        onClick={onCreate}
        className={`${SEGMENT} gap-[6px] px-[11px] border-dashed border-[color:var(--border-dashed)] bg-transparent text-[12.5px] text-[color:var(--fg-body)]`}
      >
        <span className="font-mono text-[13px]">+</span>
        {folderCopy.create.action}
      </button>
    </div>
  );
  if (!lead) return line;
  return (
    <div className="flex items-center bg-[color:var(--bg)] pl-[22px]">
      <span className="flex flex-none items-center py-[10px]">
        {lead}
        <span aria-hidden="true" className="mx-[6px] h-[22px] w-[1px] bg-[var(--border-strong)]" />
      </span>
      {line}
    </div>
  );
}

/**
 * The compact form: a 44px trigger that opens the sheet. It prints a NAME at
 * 15px semibold — a title's register, not a control's — on `--bg` above the
 * chassis's hairline, which is one of the four carriers keeping it out of the
 * filter register (decision 11).
 *
 * The `…` beside it belongs to a named folder alone — it opens rename and
 * delete, and `All decks` and `Unfiled` have neither (STATES C1/C2, errata E7).
 * The caller passes nothing for those, and nothing is what draws: a disabled
 * control would be a dead one.
 */
export function ShelfTrigger({
  label,
  count,
  onOpen,
  open,
  menu,
  lead,
}: {
  label: string;
  count: number;
  onOpen: () => void;
  open: boolean;
  menu?: React.ReactNode;
  /** The `Tiles · Stats` switch (Stats on /decks), drawn at the row's left with the trigger pushed right.
   *  Absent, the row is exactly as it shipped. */
  lead?: React.ReactNode;
}) {
  return (
    <div
      data-shelf-trigger
      className={`flex items-center gap-[8px] overflow-hidden bg-[color:var(--bg)] px-[16px] ${lead ? "pt-[8px] pb-[10px]" : "py-[8px]"}`}
    >
      {lead ? <>{lead}<span className="flex-1" /></> : null}
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={folderCopy.shelves.triggerAria(label, count)}
        className="flex h-[44px] min-w-0 cursor-pointer items-center gap-[8px] rounded-[10px] border-none bg-transparent px-0 font-sans text-[15px] font-semibold text-[color:var(--fg)]"
      >
        {/* Truncated, with the whole name in the accessible name above: one
            long single-token name would otherwise push the 44px action target
            past the edge of a phone and make it unreachable. */}
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
        <span className="font-mono text-[11px] font-normal text-[color:var(--fg-faint)]">
          {count}
        </span>
        <Chevron className="flex-none text-[color:var(--fg-faint)]" />
      </button>
      {/* `flex-none`, so the label yields before the action does. */}
      {menu && <span className="flex-none">{menu}</span>}
    </div>
  );
}
