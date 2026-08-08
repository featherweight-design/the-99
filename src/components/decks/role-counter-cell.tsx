// Role Counter Cell — §Role Counter Strip — the cell IS the control (#184).
//
// A cell under target is a button that opens that role's shelf; a cell that has
// met its target is a figure with no action and no caption. The nested anchor
// and the per-cell rationale disclosure are both gone: rationale moved up to
// one strip-level panel, which is what freed the cell face to be the target.
// 44px arrives for free from the cell height (62px phone / 72px desktop), so
// the caption can stay at 9-10px where it reads as a hint.
"use client";

import { roleCellState } from "../../lib/decks/mix";
import { addPanelCopy } from "../../lib/copy/decks-builder";

interface RoleCounterCellProps {
  label: string;
  have: number;
  target: number;
  advisory: boolean;
  /** Absent when there is no shelf to send the user to, which is a cell that
   *  has met its target or one that is short of a role Consider built no shelf
   *  for. */
  onSeeShelf?: () => void;
}

export function RoleCounterCell({
  label,
  have,
  target,
  advisory,
  onSeeShelf,
}: RoleCounterCellProps) {
  const { figureColor, barColor, pct } = roleCellState({ have, target });

  /*
    §Role counter cell container
    mobile:  bg --surface-sunken, border 1px --border, br 7px, p 7px 2px 6px,
             text-center, min-height 62px
    desktop: br 9px, p 11px 14px, 72px tall
    Hover and pressed are drawn on the short cell only, because the met cell is
    not a control — they arrive as classes rather than inline style so the
    caption inside can follow the cell through group-hover / group-active.
  */
  const shell =
    "group flex-1 min-w-0 min-h-[62px] md:min-h-[72px] rounded-[7px] md:rounded-[9px] " +
    "pt-[7px] px-[2px] pb-[6px] md:px-[14px] md:py-[11px] text-center md:text-left " +
    "bg-surface-sunken border border-border";
  const interactive =
    " cursor-pointer hover:bg-elevated-hover hover:border-border-strong " +
    "active:bg-bg active:border-brass-shadow";

  const face = (
    <>
      {/* §Role counter cell — label */}
      <p
        className="font-mono uppercase truncate overflow-hidden text-ellipsis text-[8.5px] md:text-[10px] tracking-[0.06em] md:tracking-[0.1em] text-fg-faint"
      >
        {label}
      </p>

      {/* §Role counter cell — current-count figure. The `/ target` denominator
          is desktop only; the phone cell carries the target on its `rec N`
          line instead, where there is room for it. */}
      <p
        className="font-mono font-semibold text-[13px] md:text-[16px] mt-[2px] md:mt-[3px]"
        style={{ color: figureColor }}
      >
        {have}
        <span className="hidden md:inline font-normal text-[11px] text-fg-faint">
          {" "}
          / {target}
        </span>
      </p>

      {/* §Role counter cell — fill bar track (desktop only) */}
      <div
        className="hidden md:block rounded-full overflow-hidden mt-[8px] h-[5px] bg-elevated"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>

      {/* §Role counter cell — caption row. Desktop sets `rec N` and the caption
          on one baseline; the phone stacks them. */}
      <div className="md:flex md:items-baseline md:justify-between md:gap-[8px] md:mt-[6px]">
        <span className="block font-mono text-[8px] md:text-[9px] text-fg-locked md:text-fg-faint">
          {advisory ? `rec ~${target}` : `rec ${target}`}
        </span>
        {onSeeShelf ? (
          <span className="block font-mono text-[9px] md:text-[10px] mt-[3px] md:mt-0 text-brass group-hover:text-brass-hover group-active:text-brass-mid">
            {addPanelCopy.strip.cellLink}
          </span>
        ) : (
          /* Whenever the cell is not a control — met, short with no shelf built
             for it, or handed no handler at all — the caption goes and a dash
             stands in its place, so the row keeps its rhythm and nothing offers
             a shelf it cannot open. The two widths disagree on the dash's tone;
             both are as drawn. */
          <span
            aria-hidden
            className="block font-mono text-[9px] md:text-[10px] mt-[3px] md:mt-0 text-border-strong md:text-border-dashed"
          >
            —
          </span>
        )}
      </div>
    </>
  );

  if (!onSeeShelf) {
    return (
      <div
        role="figure"
        aria-label={addPanelCopy.strip.cellStaticAria(label, have, target)}
        className={shell}
      >
        {face}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSeeShelf}
      aria-label={addPanelCopy.strip.cellLinkAria(label, have, target)}
      className={shell + interactive}
    >
      {face}
    </button>
  );
}
