"use client";

// ClearAutoButton — the auto-lifecycle cluster in the group toolbar: the kept
//   note, the bulk keep, and the sweep.
// SweepReceipt — the one-strip receipt that persists until the player undoes or navigates.
//
// §Decklist Group Toggle (design table) — ClearAutoButton lives right of the spacer,
// left of the Group label.

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { recommendationsCopy } from "../../lib/copy/recommendations";
import { useLockCards } from "./lock-cards";

// ── ClearAutoButton ────────────────────────────────────────────────────────────

interface ClearAutoButtonProps {
  /** The number of untouched auto cards remaining. Absent (not rendered) at 0. */
  count: number;
  /** Non-auto cards — kept fill cards and the player's own additions alike.
      Shows the kept note when ≥ 1. */
  keptCount: number;
  onClear: () => void;
  pending: boolean;
  onKeepAll: () => void;
  keepAllPending: boolean;
  /** Locked (L3): the auto COPIES a sweep leaves because their card is locked (T3). Keep all
      still counts them; Clear does not. 0 with the switch off. */
  lockedCount?: number;
  /** The Lock cards mode is on: both bulk controls stay in place, disabled (addendum F3). */
  lockMode?: boolean;
  /** Told when Keep all's question opens and closes, so Lock cards can stand down with the pair. */
  onConfirmingChange?: (confirming: boolean) => void;
}

/** Identical treatment for both bulk controls: these are two answers to the
 *  same question about the same forty cards, and the toolbar has no view on
 *  which is right. A filled or accent plate on either would make the app
 *  recommend an answer it cannot know. `min-h-[44px]` only below md, where the
 *  pair wraps to a line of its own and becomes a phone target. */
export const BULK_BUTTON_BASE =
  "font-mono text-[12px] bg-transparent border rounded-[8px] px-[12px] min-h-[44px] md:min-h-0 py-[6px] cursor-pointer disabled:opacity-50 disabled:cursor-default";
/** The base in its resting ink. Split so Lock cards can take the same box in `--accent` as
 *  `Done` without two text colours on one element fighting over the cascade. */
export const BULK_BUTTON_CLASS = `${BULK_BUTTON_BASE} text-fg-body border-border-strong`;

/** The confirm's two answers, taking `game-history-row.tsx`'s inline confirm
 *  verbatim minus its danger ink — this app's only confirm vocabulary, and it
 *  is a toolbar question here for the same reason it is a row question there.
 *  The caller appends the one border colour that separates the two answers. */
const CONFIRM_BUTTON_CLASS =
  "flex-1 md:flex-none flex md:inline-flex items-center justify-center min-h-[44px] md:min-h-[30px] px-[14px] md:px-[10px] rounded-[7px] text-[11.5px] text-fg-body bg-transparent border cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

/** A GhostButton in mono 12px, right-aligned in the group toolbar.
 *  Absent entirely at zero rather than shown disabled, because a disabled
 *  "Clear 0 auto cards" is a control offering nothing. The one time it does
 *  render disabled is while its own sweep is in flight.
 *
 *  Design table state 7: the keptNote must survive even when count === 0 and
 *  the button is absent. The note is rendered outside the button's own guard
 *  so it stays visible throughout the auto-card lifecycle — but with neither a
 *  note nor a button to show, the wrapper leaves too, rather than sitting in
 *  the toolbar's flex row as an empty child collecting a gap. */
export function ClearAutoButton({
  count,
  keptCount,
  onClear,
  pending,
  onKeepAll,
  keepAllPending,
  lockedCount = 0,
  lockMode = false,
  onConfirmingChange,
}: ClearAutoButtonProps) {
  // The keep asks first because it cannot be undone: its inverse would write
  // `auto = true` back across forty rows, the app re-claiming as its own the
  // cards the player has just declared theirs. The sweep beside it needs no
  // question, because it ships a receipt with a real undo. Confirm where there
  // is no undo, receipt where there is.
  const [confirming, setConfirming] = useState(false);
  // Per instance rather than a module constant: two decklists on one page would
  // otherwise share one id and leave `aria-describedby` pointing at whichever
  // question the document happened to hold first.
  const questionId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const yesRef = useRef<HTMLButtonElement>(null);
  // The trigger unmounts while the question is up, so focus has to be carried
  // by hand at both ends or a keyboard reader is dropped back at the top of the
  // document. Only a cancel restores it: after a confirm the trigger comes back
  // disabled, or does not come back at all.
  const returningFocus = useRef(false);

  // A row's own keep can take the last auto card while the question is up. The
  // question unmounts with the count, but the flag would outlive it and raise
  // the question again unasked the next time a fill pass puts auto cards back.
  // Adjusted during render rather than in an effect so the stale question never
  // paints, and so the focus effect below never runs against it.
  const [seenCount, setSeenCount] = useState(count);
  if (count !== seenCount) {
    setSeenCount(count);
    if (count === 0) setConfirming(false);
  }

  // A layout effect, so Lock cards leaves in the same paint the question arrives in rather than one
  // frame after it. Reports `false` on unmount too, or a question torn down with the cluster would
  // hold Lock cards off for good.
  useLayoutEffect(() => {
    onConfirmingChange?.(confirming);
  }, [confirming, onConfirmingChange]);
  useLayoutEffect(() => () => onConfirmingChange?.(false), [onConfirmingChange]);

  useEffect(() => {
    if (confirming) {
      yesRef.current?.focus();
    } else if (returningFocus.current) {
      returningFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [confirming]);

  // Read before the early return below: a hook runs on every render or not at all.
  const lockWriting = (useLockCards()?.pending.size ?? 0) > 0;

  if (count === 0 && keptCount === 0) return null;

  // Either write in flight disables both. They read the same count and act on
  // the same rows, so the second one clicked would be deciding the fate of
  // cards the first has already spoken for.
  // The Lock cards mode disables them too, in place (addendum F3): the row's ✕ is a lock while it
  // is on, and a bulk removal beside a list of locks would be a second answer to one question.
  // And so does any lock write still in flight (`lockWriting`): a sweep that reached the deck row
  // first would take a card the client already draws as locked, and its receipt would count it as
  // one that stayed. The sweep waits until every lock has settled, so the client keeps what the
  // server holds.
  const busy = pending || keepAllPending || lockMode || lockWriting;
  // What a sweep can actually take (L3): a locked auto card can be kept but never cleared.
  const clearable = Math.max(0, count - lockedCount);

  return (
    /* At a count of 0 the only thing left to render is the kept note, which is
       desktop-only — so below md the wrapper would be an empty flex child
       collecting the toolbar's gap, spacing the row for content nobody can see.
       The wrapper takes the note's own breakpoint rather than the note taking
       the wrapper's: the note is hidden on phones because the toolbar has no
       room for it, and that is still true after a keep. */
    <span
      /* `flex-wrap`: the question is much wider than the pair it replaces, and
         at 390px it does not fit on one line beside its own two answers. The
         cluster is a single child of the toolbar's wrap, so without this the
         answers would be pushed off the edge rather than under the question. */
      className={`${count === 0 ? "hidden md:flex" : "flex"} flex-wrap items-center gap-[8px]`}
    >
      {keptCount >= 1 && (
        <span className="font-mono text-[11px] text-fg-locked hidden md:inline">
          {recommendationsCopy.auto.keptNote(String(keptCount))}
        </span>
      )}
      {/* The question replaces both bulk controls rather than only the one
          tapped, for the same reason `busy` disables both: they read the same
          count and act on the same rows, so a sweep offered beside an unanswered
          keep would be offered on cards already spoken for. */}
      {count > 0 &&
        (confirming ? (
          /* Phone puts the question on a line of its own and splits the row
             between its two answers; desktop keeps all three inline. The row
             gap is zeroed because the question carries its own 9px below it. */
          <span className="w-full md:w-auto flex flex-wrap md:flex-nowrap items-center gap-x-[8px] gap-y-0">
            {/* Focus lands on `Keep them`, whose own label says nothing about
                what is being kept. Both answers point back at the question, so
                a screen reader hears what it is answering. The two width
                variants sit inside this one element and only the visible one is
                in the accessibility tree, so the description is never doubled. */}
            <span
              id={questionId}
              className="w-full mb-[9px] md:w-auto md:mb-0 text-[11.5px] leading-[1.5] text-fg-body"
            >
              <span className="hidden md:inline">
                {recommendationsCopy.auto.keepAllConfirm(String(count))}
              </span>
              <span className="md:hidden">
                {recommendationsCopy.auto.keepAllConfirmMobile(String(count))}
              </span>
            </span>
            {/* Neither answer takes danger ink. Keeping is a graduation, not a
                deletion — it destroys no cards, only the record of where they
                came from — and danger would say the one thing this does not do.
                The weaker border on Cancel is the only difference between them,
                so the toolbar still recommends neither. */}
            <button
              ref={yesRef}
              type="button"
              disabled={busy}
              aria-describedby={questionId}
              onClick={() => {
                setConfirming(false);
                onKeepAll();
              }}
              className={CONFIRM_BUTTON_CLASS + " border-border-strong"}
            >
              {recommendationsCopy.auto.keepAllConfirmYes}
            </button>
            <button
              type="button"
              disabled={busy}
              aria-describedby={questionId}
              onClick={() => {
                returningFocus.current = true;
                setConfirming(false);
              }}
              className={CONFIRM_BUTTON_CLASS + " border-border"}
            >
              {recommendationsCopy.auto.keepAllConfirmNo}
            </button>
          </span>
        ) : (
          <>
            {/* Keep leads, so the cluster reads from the safe answer to the
                destructive one and the sweep is not the first bulk control the
                eye lands on. They count DIFFERENT SETS on purpose since Locked
                (L3, audit T5): Keep counts every auto card, and Clear only the
                copies it can take, auto less locked auto. A locked auto card can
                be kept and cannot be cleared, so when every one left is locked
                Clear is absent and Keep stays. */}
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setConfirming(true)}
              disabled={busy}
              aria-label={recommendationsCopy.auto.keepAllAria(String(count))}
              className={BULK_BUTTON_CLASS}
            >
              <span className="hidden md:inline">
                {recommendationsCopy.auto.keepAll(String(count))}
              </span>
              <span className="md:hidden">
                {recommendationsCopy.auto.keepAllMobile(String(count))}
              </span>
            </button>
            {clearable > 0 && (
              <button
                type="button"
                onClick={onClear}
                disabled={busy}
                aria-label={
                  lockedCount > 0
                    ? recommendationsCopy.auto.clearAllAriaLocked(String(clearable), String(lockedCount))
                    : recommendationsCopy.auto.clearAllAria(String(clearable))
                }
                className={BULK_BUTTON_CLASS}
              >
                {/* Responsive label: desktop shows the full string, mobile shows the short form.
                    Both live in one button element to keep a single interactive control. */}
                <span className="hidden md:inline">
                  {recommendationsCopy.auto.clearAll(String(clearable))}
                </span>
                <span className="md:hidden">
                  {recommendationsCopy.auto.clearAllMobile(String(clearable))}
                </span>
              </button>
            )}
          </>
        ))}
    </span>
  );
}

// ── SweepReceipt ──────────────────────────────────────────────────────────────

interface SweepReceiptProps {
  /** Cards removed, counted in copies rather than rows — a swept basic-land
   *  stack contributes 37. The receipt reads "{n} auto cards removed". */
  removed: number;
  /** Locked auto copies the sweep left (L3, T3). A second clause at 1 or more; none at 0. */
  stayed?: number;
  onUndo: () => void;
}

/** One strip, not one per row. Lifetime is decklist state, matching PR #204. */
export function SweepReceipt({ removed, stayed = 0, onUndo }: SweepReceiptProps) {
  return (
    <div className="flex items-center gap-[10px] px-[13px] py-[10px] mb-[16px] bg-surface-sunken border border-dashed border-border-strong rounded-[8px]">
      <span className="flex-1 font-mono text-[11px] md:text-[12px] text-fg-locked">
        {/* Each clause `whitespace-nowrap`, the separator INSIDE the second (audit T2): at 390 with
            two-digit counts the pair is wider than the slot, and the line must break at the middot
            rather than inside `stayed`, with no separator stranded at a line's end. */}
        <span className="whitespace-nowrap">{recommendationsCopy.auto.swept(String(removed))}</span>
        {stayed > 0 && (
          <>
            {" "}
            <span className="whitespace-nowrap" data-testid="sweep-receipt-locked">
              {"· "}
              {recommendationsCopy.auto.sweptLeftLocked(String(stayed))}
            </span>
          </>
        )}
      </span>
      {/* Undo — matches decklist-row.tsx Undo treatment: sans 12.5px semibold,
          accent coloured, border-bottom underline in accent-shadow. */}
      <button
        type="button"
        onClick={onUndo}
        aria-label={recommendationsCopy.auto.sweptUndoAria(String(removed))}
        className="flex-none flex items-center bg-transparent border-0 border-b border-accent-shadow p-0
          text-[12.5px] font-semibold leading-[1.4]
          text-accent cursor-pointer"
      >
        {recommendationsCopy.auto.sweptUndo}
      </button>
    </div>
  );
}
