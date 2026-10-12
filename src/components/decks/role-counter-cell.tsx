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
import { tuningHubCopy } from "../../lib/copy/tuning-hub";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";

interface RoleCounterCellProps {
  label: string;
  /** The current count, or `null` when the count is not yet known (A3
   *  in-flight treatment). `0` is a real known zero and keeps the ordinary
   *  short-cell treatment.
   *
   *  No caller passes `null` today: the strip derives its counts from
   *  `computeRoleCounts`, which always resolves to a number. The treatment is
   *  built ahead of its consumer because any path that hands the cell an
   *  unknown count needs it, and drawing a zero there would be a real bar
   *  standing for no data. */
  have: number | null;
  target: number;
  advisory: boolean;
  /** Absent when there is no shelf to send the user to, which is a cell that
   *  has met its target or one that is short of a role Consider built no shelf
   *  for. */
  onSeeShelf?: () => void;
  /** The land cell's other action (Tuning hub R3, `Land cell — balance mana`): open Mana Balance.
   *  `onSeeShelf` takes precedence, so a cell carries one action at most. */
  onBalanceMana?: () => void;
  /** True when the deck was just filled (`deck.filled && autoCount > 0`). A
   *  short cell in this state takes `border-border-strong` in place of the
   *  default `border-border`. A met cell is unaffected. */
  justFilled?: boolean;
  /** The figure this role held in the newest committed version, when a draft has
   *  moved it. Takes the bottom-left slot the recommendation otherwise holds —
   *  and only when the figure actually moved, because "was 10" beside a 10 is a
   *  sentence that says nothing. The strip decides that; the cell just draws. */
  was?: number;
}

export function RoleCounterCell({
  label,
  have,
  target,
  advisory,
  onSeeShelf,
  onBalanceMana,
  justFilled = false,
  was,
}: RoleCounterCellProps) {
  const balance = onSeeShelf ? undefined : onBalanceMana;
  // A3: `have === null` means count is not yet known — in-flight treatment.
  // `have === 0` is a real known zero and follows the ordinary short path.
  const inFlight = have === null;
  const { figureColor, barColor, pct } = inFlight
    ? { figureColor: "var(--border-strong)", barColor: "", pct: 0 }
    : roleCellState({ have, target });
  const met = !inFlight && have >= target;

  /*
    §Role counter cell container
    mobile:  bg --surface-sunken, border 1px --border, br 7px, p 7px 2px 6px,
             text-center, min-height 62px
    desktop: br 9px, p 11px 14px, 72px tall
    Hover and pressed are drawn on the short cell only, because the met cell is
    not a control — they arrive as classes rather than inline style so the
    caption inside can follow the cell through group-hover / group-active.
  */
  // A4: a short cell in a just-filled deck takes border-border-strong at phone
  // only — desktop stays on the default border-border so the stronger hairline
  // reads as a phone-only affordance. The conditional replaces border-border
  // entirely so the original class does not linger beside the stronger one.
  const borderClass =
    !met && justFilled ? "border-border-strong md:border-border" : "border-border";
  const shell =
    "group flex-1 min-w-0 min-h-[62px] md:min-h-[72px] rounded-[7px] md:rounded-[9px] " +
    "pt-[7px] px-[2px] pb-[6px] md:px-[14px] md:py-[11px] text-center md:text-left " +
    `bg-surface-sunken border ${borderClass}`;
  const interactive =
    " cursor-pointer hover:bg-elevated-hover hover:border-border-strong transition-colors " +
    "active:bg-bg active:border-accent-shadow transition-colors";

  const face = (
    <>
      {/* §Role counter cell — label.
          A3: drops to --fg-locked so the strip reads as not-yet rather than
          as five failed roles. */}
      <p
        className={
          "font-mono uppercase truncate overflow-hidden text-ellipsis " +
          "text-[8.5px] md:text-[10px] tracking-[0.06em] md:tracking-[0.1em] " +
          (inFlight ? "text-fg-locked" : "text-fg-faint")
        }
      >
        {label}
      </p>

      {/* §Role counter cell — current-count figure. The `/ target` denominator
          is desktop only; the phone cell carries the target on its `rec N`
          line instead, where there is room for it.
          A3: numerator is an em dash; denominator stays so the dash reads as
          pending rather than broken. */}
      <p
        className="font-mono font-semibold text-[13px] md:text-[16px] mt-[2px] md:mt-[3px]"
        style={{ color: figureColor }}
      >
        {inFlight ? "—" : have}
        {/* In flight the denominator drops to --border-dashed so the whole
            figure reads as not-yet rather than 0/target. */}
        <span
          className={
            "hidden md:inline font-normal text-[11px] " +
            (inFlight ? "text-border-dashed" : "text-fg-faint")
          }
        >
          {" "}
          / {target}
        </span>
      </p>

      {/* §Role counter cell — fill bar track (desktop only).
          A3: replaced by a dashed rule at height 0, carrying the margins the
          design specifies for it rather than the live track's. A rule is not a
          container, so there is nothing for a fill to be measured against. */}
      {inFlight ? (
        <div
          aria-hidden
          className="hidden md:block mt-[10px] mb-[11px]"
          style={{ height: 0, borderTop: "1px dashed var(--border-strong)" }}
        />
      ) : (
        <div
          className="hidden md:block rounded-full overflow-hidden mt-[8px] h-[5px] bg-elevated"
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
      )}

      {/* §Role counter cell — caption row. Desktop sets `rec N` and the caption
          on one baseline; the phone stacks them. */}
      <div className="md:flex md:items-baseline md:justify-between md:gap-[8px] md:mt-[6px]">
        {/* In flight both widths drop to --border-dashed so the rec line is
            consistent with the em-dash numerator above it. */}
        <span
          className={
            "block font-mono text-[8px] md:text-[9px] " +
            (inFlight ? "text-border-dashed" : "text-fg-locked md:text-fg-faint")
          }
        >
          {was !== undefined
            ? deckVersioningCopy.pending.mixCellWas(was)
            : advisory
              ? `rec ~${target}`
              : `rec ${target}`}
        </span>
        {onSeeShelf ? (
          <span className="block font-mono text-[9px] md:text-[10px] mt-[3px] md:mt-0 text-accent group-hover:text-accent-hover group-active:text-accent-mid">
            {addPanelCopy.strip.cellLink}
          </span>
        ) : balance ? (
          <span className="block font-mono text-[9px] md:text-[10px] mt-[3px] md:mt-0 text-accent group-hover:text-accent-hover group-active:text-accent-mid">
            <span className="hidden md:inline">{tuningHubCopy.shortcuts.balanceMana}</span>
            <span className="md:hidden">{tuningHubCopy.shortcuts.balanceManaShort}</span>
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

  // The `was N` caption above is the only place the cell says a draft moved this
  // figure, and a caption inside a figure or a button is not part of its
  // accessible name. Both names take it so the move is spoken, not just seen.
  const named = (base: string) =>
    was !== undefined ? deckVersioningCopy.pending.mixCellWasA11y(base, was) : base;

  if (!onSeeShelf && balance) {
    return (
      <button
        type="button"
        onClick={balance}
        data-shortcut="balance-mana"
        aria-label={named(tuningHubCopy.shortcuts.balanceManaAria(have ?? 0, target))}
        // The shipped interactive cell's border (design table, `Land cell — balance mana`).
        className={shell.replace(`border ${borderClass}`, "border border-border-strong") + interactive}
      >
        {face}
      </button>
    );
  }

  if (!onSeeShelf) {
    return (
      <div
        role="figure"
        aria-label={named(addPanelCopy.strip.cellStaticAria(label, have, target))}
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
      aria-label={named(addPanelCopy.strip.cellLinkAria(label, have, target))}
      className={shell + interactive}
    >
      {face}
    </button>
  );
}
