"use client";

// The card details modal's dialog hooks: the sheet's snap, the Escape ladder, the arrow keys, the focus returns, the paged
// open's focus and the turn and tilt handlers, moved here from the signed-in modal (`card-modal.tsx`, 5l-e PR 2) so the
// landing demo's modal, which forks them today, can run the same dialog on the public surface from one copy. Like
// `card-modal-parts.tsx`, nothing here reads a context, a server action or a provider: what the signed-in modal adds (a
// pending landing, a covered or dropping card, an open view) arrives as an argument.

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SHEET, type SheetSnap } from "./card-sheet-gesture";
import { dropTilt, liftTilt, tiltsOnHover } from "./card-tilt";
import { prefersReducedMotion } from "../../lib/ui/motion";
import { MIN_TEASER_CARD_WIDTH, ZOOM_REGION, useOwnHeight } from "./card-modal-parts";

type Ref<T> = React.RefObject<T>;

/** A page handler as the modal is handed it: the drag's offset and progress, and the face the card being left shows. */
type PageHandler = ((offset?: number, progress?: number, leftFace?: string | null) => void) | null;

/**
 * The phone's sheet (carousel R2): the teaser on every open and every page, which a remount
 * per card gives by construction, or the full details column. Set only by the phone's own
 * controls and gestures; everything else reads `sheetOpen`, which is false at desktop widths.
 *
 * `forceFull` opens the sheet at full whatever it was handed (the signed-in modal's pending Find a deck landing and its
 * combo open); it is read at construction only. `doorHeight` is the measured stand-ins door strip at the sheet's head, 0
 * where a card carries none.
 */
export function useSheetSnap({
  startMinimized,
  forceFull = false,
  onMinimizedChange,
  narrow,
  doorHeight = 0,
  dialogRef,
}: {
  startMinimized: boolean;
  forceFull?: boolean;
  onMinimizedChange?: (minimized: boolean) => void;
  narrow: boolean;
  doorHeight?: number;
  dialogRef: Ref<HTMLElement | null>;
}) {
  const [snap, setSnapState] = useState<SheetSnap>(forceFull ? "full" : startMinimized ? "min" : "teaser");
  // A card mounts at the snap it was handed, and says so: a remount that is not a page (a step back
  // from a partner, say) starts at the teaser, and the provider must not go on carrying a min the
  // reader can no longer see into the next page.
  const reportedMount = useRef(false);
  useEffect(() => {
    if (reportedMount.current) return;
    reportedMount.current = true;
    // A pending landing opens the card full even when the reader carried a minimized sheet here: report what is drawn.
    onMinimizedChange?.(startMinimized && !forceFull);
  }, [onMinimizedChange, startMinimized, forceFull]);
  // Whether the sheet's last move reached or left the min snap: those moves are gentle (the motion
  // rule's beat and ease-in-out), and teaser to full keeps the quick snap (`--motion-quick`).
  const [gentle, setGentle] = useState(false);
  const sheetFull = snap === "full";
  const setSnap = (next: SheetSnap) => {
    setGentle(next === "min" || snap === "min");
    setSnapState(next);
    if ((next === "min") !== (snap === "min")) onMinimizedChange?.(next === "min");
  };

  // THE TEASER'S HEIGHT, which places the sheet and sizes the card band above it. A fixed 280
  // (README R2 "States"), plus the door's strip where the card carries one, as the caller measured it.
  const teaserHeight = SHEET.teaserHeight + doorHeight;

  // A TEASER THAT WOULD CRUSH THE CARD IS NOT OFFERED. A short screen (or a teaser grown by a
  // door strip) can leave the band so little room that the card would
  // draw tens of pixels wide; there the sheet opens full and stays full, the way the stacked
  // sheet drew its details before R2, and Escape closes it. 120 keeps the card at least the
  // size of a readable thumbnail. Stacked sheets' own spec check is the carousel's PR 4.
  const dialogHeight = useOwnHeight(dialogRef, narrow, dialogRef);
  const cramped = dialogHeight > 0 && (dialogHeight - teaserHeight - 85) * 0.7159 < MIN_TEASER_CARD_WIDTH;
  // What the sheet DRAWS: full when the reader raised it, or when the teaser is not offered.
  const full = sheetFull || cramped;
  // What Escape and the arrow keys read. Phone width only: a window widened with the sheet up
  // must not leave the desktop's keys answering to a sheet nobody can see. And a cramped sheet
  // has no teaser to step down to, so its Escape closes.
  const sheetOpen = narrow && sheetFull && !cramped;
  // THE MIN SNAP (Hugh, 2026-10-13): the shelf shrinks to its title row and the card grows to fill
  // the band, much like the retired zoom. Phone width only, and never where the teaser itself is
  // not offered.
  const min = narrow && snap === "min" && !cramped;
  return { snap, setSnap, gentle, sheetFull, teaserHeight, cramped, full, sheetOpen, min };
}

/**
 * The dialog's Escape as a ladder of rungs, tried in order: the first that returns true has handled the key, and the rest
 * are not asked. A plain function, called from the caller's own `useCallback`, so the deps list stays a literal the lint
 * can read and the callback's identity follows those deps exactly.
 */
export function runEscapeLadder(rungs: ReadonlyArray<() => boolean>): void {
  for (const rung of rungs) if (rung()) return;
}

/**
 * Arrow-key paging (handoff decision 4): anywhere in the dialog except the printing search
 * input, the printing radiogroup, and the zoom — "a look, not a browser", decision 1. A list
 * of one or two behaves exactly as the buttons do: the missing side is simply absent.
 *
 * SCOPED TO THE BACKDROP, not the dialog (pre-open review, round 1). A peek press moves
 * focus to the pressed plate via `initialFocusRef` on the REMOUNTED instance, and a neighbor
 * plate is a sibling of `dialogRef`'s element, outside it — a listener on the dialog alone
 * never sees a key pressed while focus sits on a plate, which stalled paging dead after the
 * first peek. The backdrop is the one ancestor both the dialog and the plates share.
 *
 * The listener itself sits ON THE DOCUMENT, taking a key whose target is the backdrop's
 * subtree OR the body. A click on plain text in the dialog (a rules line, a label) focuses
 * nothing, so focus falls to <body>, and a listener on the backdrop never heard the key: paging
 * went dead until the reader clicked something focusable. The body case is ours while this
 * modal is open; a modal that is not `enabled` (a card held under a sheet, say) attaches no listener at all.
 */
export function usePagingKeys({
  backdropRef,
  total,
  enabled,
  onPrev,
  onNext,
  onAtStart,
  onAtEnd,
  narrow,
  full,
  leftFaceRef,
}: {
  backdropRef: Ref<HTMLElement | null>;
  total: number;
  enabled: boolean;
  onPrev: PageHandler;
  onNext: PageHandler;
  onAtStart?: () => void;
  onAtEnd?: () => void;
  narrow: boolean;
  full: boolean;
  /** The face this card shows when turned, read at the key, since the listener is attached before it is known. */
  leftFaceRef: Ref<string | null>;
}) {
  useEffect(() => {
    const backdrop = backdropRef.current;
    if (!backdrop || total <= 1 || !enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.defaultPrevented) return;
      const target = e.target;
      if (target !== document.body && !(target instanceof Node && backdrop.contains(target))) return;
      // A modified arrow is somebody else's shortcut — Alt+Left/Right is browser history,
      // Cmd/Ctrl+Left/Right is a text-editing jump in some inputs (pre-open review, round 2).
      // Plain Left/Right only, or the carousel silently eats a navigation the reader meant.
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      // Paging is withheld while the phone's sheet is full (STATES h3); the counter stays.
      if (narrow && full) return;
      const active = document.activeElement;
      if (active instanceof HTMLElement) {
        if (active.tagName === "INPUT") return;
        if (active.closest('[role="radiogroup"]')) return;
        if (active.closest(`#${ZOOM_REGION}`)) return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (onPrev) onPrev(undefined, undefined, leftFaceRef.current); else onAtStart?.();
      } else {
        e.preventDefault();
        if (onNext) onNext(undefined, undefined, leftFaceRef.current); else onAtEnd?.();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // The refs are the caller's own `useRef`s, stable for the instance's life: listed for the lint, they never re-run it.
  }, [backdropRef, leftFaceRef, total, onPrev, onNext, onAtStart, onAtEnd, narrow, full, enabled]);
}

/**
 * Focus returns for the two moves that unmount the control that made them: the sheet's snap and the zoom layer.
 */
export function useFocusReturns({
  dialogRef,
  sheetFull,
  gripRef,
  zoomed,
  zoomFlipRef,
  zoomCloseRef,
  zoomTriggerRefs,
}: {
  dialogRef: Ref<HTMLElement | null>;
  sheetFull: boolean;
  gripRef: Ref<HTMLElement | null>;
  zoomed: boolean;
  zoomFlipRef: Ref<HTMLElement | null>;
  zoomCloseRef: Ref<HTMLElement | null>;
  zoomTriggerRefs: Ref<(HTMLButtonElement | null)[]>;
}) {
  // Focus follows the sheet when the control that moved it is gone: `All details` unmounts as the
  // sheet opens, and the whole full column is hidden as it closes. The grip is the one control
  // standing in both states, and it is the same toggle.
  const wasFull = useRef(false);
  useEffect(() => {
    if (wasFull.current === sheetFull) return;
    wasFull.current = sheetFull;
    const active = document.activeElement;
    if (
      active instanceof HTMLElement
      && active !== document.body
      && dialogRef.current?.contains(active)
      && active.getClientRects().length > 0
    ) return;
    gripRef.current?.focus();
    // The refs are the caller's own `useRef`s, stable for the instance's life: listed for the lint, they never re-run it.
  }, [sheetFull, dialogRef, gripRef]);

  // Focus follows the layer. In: to the flip control when the card has a back face,
  // otherwise to the close (row 3.12). Out: to the art that opened it, at whichever
  // width has layout (row 3.10).
  const wasZoomed = useRef(false);
  useEffect(() => {
    // Transitions only. Without this the effect's first run — on mount, with the
    // layer closed — would take focus off whatever the dialog's own trap had just
    // given it and park it on the art.
    if (wasZoomed.current === zoomed) return;
    wasZoomed.current = zoomed;
    if (zoomed) {
      // The turn where there is a face to turn to, the close otherwise — row 3.12,
      // now that the layer has both.
      (zoomFlipRef.current ?? zoomCloseRef.current)?.focus();
      return;
    }
    // Only when nothing else has claimed focus. A close leaves focus on the button
    // that is being unmounted, so the document falls back to `body` and this runs;
    // anything else already sitting on a control inside the dialog got there on
    // purpose — the printing region's own Escape stage is the one that does — and
    // taking it back would undo that.
    const active = document.activeElement;
    if (active && active !== document.body && dialogRef.current?.contains(active)) return;
    const mounted = zoomTriggerRefs.current.filter((el): el is HTMLButtonElement => el !== null);
    // The visible one where the environment reports layout, and the first mounted one
    // where it does not — jsdom gives every element a zero rect, so a strict
    // visibility filter would hand focus to nobody in tests while looking correct.
    const target = mounted.find((el) => el.getClientRects().length > 0) ?? mounted[0];
    target?.focus();
    // The refs are the caller's own `useRef`s, stable for the instance's life: listed for the lint, they never re-run it.
  }, [zoomed, dialogRef, zoomFlipRef, zoomCloseRef, zoomTriggerRefs]);
}

/**
 * Where the dialog puts focus when it opens: the ✕ that has layout.
 *
 * Named explicitly rather than left to DOM order, because the art is now a button
 * and sits before the content column — so without this the first thing a keyboard
 * reader lands on would have become "Look at … up close", which is neither where
 * focus used to go nor the same at both widths.
 *
 * A PAGED mount (`enteredFrom` non-null) focuses the same-role control instead (handoff
 * "Notes for engineering" §3): the footer button or the peek that led here, so the remount
 * this component is built around does not drop focus to the ✕ on every press. Falls back to
 * the ✕ if that control did not land — this width's footer is hidden at the peek's, say.
 */
export function usePagedInitialFocus({
  enteredFrom,
  prevButtonRef,
  nextButtonRef,
  prevPeekRef,
  prevPhonePeekRef,
  nextPeekRef,
  nextPhonePeekRef,
  closeRefs,
}: {
  enteredFrom: "prev" | "next" | "prevPeek" | "nextPeek" | null;
  prevButtonRef: Ref<HTMLElement | null>;
  nextButtonRef: Ref<HTMLElement | null>;
  prevPeekRef: Ref<HTMLElement | null>;
  prevPhonePeekRef: Ref<HTMLElement | null>;
  nextPeekRef: Ref<HTMLElement | null>;
  nextPhonePeekRef: Ref<HTMLElement | null>;
  closeRefs: Ref<(HTMLButtonElement | null)[]>;
}): Ref<HTMLElement | null> {
  return useMemo(
    () => ({
      get current() {
        // A peek exists at each width (the desktop plate, the phone's card band), and only the
        // one on screen has layout.
        const candidates = enteredFrom === "prev" ? [prevButtonRef.current]
          : enteredFrom === "next" ? [nextButtonRef.current]
          : enteredFrom === "prevPeek" ? [prevPeekRef.current, prevPhonePeekRef.current]
          : enteredFrom === "nextPeek" ? [nextPeekRef.current, nextPhonePeekRef.current]
          : [];
        const paged = candidates.find((el) => el && el.getClientRects().length > 0);
        if (paged) return paged;
        const mounted = closeRefs.current.filter((el): el is HTMLButtonElement => el !== null);
        return mounted.find((el) => el.getClientRects().length > 0) ?? mounted[0] ?? null;
      },
    }),
    // The refs are the caller's own `useRef`s, stable for the instance's life: listed for the lint, they never recompute it.
    [enteredFrom, prevButtonRef, nextButtonRef, prevPeekRef, prevPhonePeekRef, nextPeekRef, nextPhonePeekRef, closeRefs],
  );
}

/**
 * The art's and the zoom's turn handlers, and the tilt and press handlers round them. Calls no hook of its own: built each
 * render from that render's faces and flags, as the inline handlers it replaces were, and named a hook so the refs it is
 * handed are read only in the handlers, never during render.
 */
export function useCardTurnHandlers({
  flipped,
  setFlipped,
  zoomFlipped,
  setZoomFlipped,
  turning,
  setTurning,
  setZoomTurning,
  setAnnouncement,
  twoFaced,
  showingBack,
  shownLabel,
  zoomed,
  heldArtFace,
  zoomPress,
  zoomDragged,
  desktopTiltRef,
  phoneTiltRef,
  zoomTiltRef,
}: {
  flipped: boolean;
  setFlipped: (next: boolean) => void;
  zoomFlipped: boolean;
  setZoomFlipped: (next: boolean) => void;
  turning: boolean;
  setTurning: (next: boolean) => void;
  setZoomTurning: (next: boolean) => void;
  setAnnouncement: (text: string) => void;
  twoFaced: boolean;
  showingBack: boolean;
  shownLabel: (onBack: boolean) => string;
  zoomed: boolean;
  heldArtFace: Ref<string | null>;
  zoomPress: Ref<{ id: number; x: number; y: number; tilting: boolean } | null>;
  zoomDragged: Ref<boolean>;
  desktopTiltRef: Ref<HTMLElement | null>;
  phoneTiltRef: Ref<HTMLElement | null>;
  zoomTiltRef: Ref<HTMLElement | null>;
}) {
  function onZoomFlip() {
    const next = !zoomFlipped;
    setZoomFlipped(next);
    dropTilt(zoomTiltRef.current);
    // Announced when the card has LANDED, not when the press happened: a reader who
    // presses twice quickly would otherwise be told about a face the card never
    // rested on. `onTransitionEnd` below carries the animated path; where there is no
    // transition to wait for — a reader who asked for less motion — the press is the
    // landing.
    const reduced = prefersReducedMotion();
    if (reduced) setAnnouncement(shownLabel(next));
    else setZoomTurning(true);
  }

  function onTurnSettled(e: React.TransitionEvent<HTMLDivElement>) {
    // Only the box's own turn, not a transition bubbling from something inside it.
    if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
    setZoomTurning(false);
    setAnnouncement(shownLabel(zoomFlipped));
  }

  function onFlip() {
    const next = !flipped;
    setFlipped(next);
    // The inline tilt values come off, or they would beat the turn's flat centre (G4).
    dropTilt(desktopTiltRef.current);
    dropTilt(phoneTiltRef.current);
    // Same rule as the zoom's turn, for the same reason, now that the art in the
    // modal turns rather than swapping: announced when the card has LANDED. The
    // reduced-motion path has no transition to wait for, so the press is the
    // landing there.
    const reduced = prefersReducedMotion();
    if (reduced) setAnnouncement(shownLabel(next));
    else setTurning(true);
  }

  function onArtTurnSettled(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
    setTurning(false);
    const face = shownLabel(showingBack);
    // NOT while the zoom is up. A reader who turns the art and opens the zoom
    // inside the 320ms turn leaves this transition still running underneath a
    // layer that deliberately opens on the FRONT — and `openZoom` clears the
    // region for exactly that reason. Announcing here would write the art's back
    // face into it while the front is on screen.
    //
    // HELD, not dropped: when the zoom closes, that back face is what the reader
    // is looking at, and a turn nobody ever announced is a face they were never
    // told about. `closeZoom` flushes this.
    if (zoomed) {
      heldArtFace.current = face;
      return;
    }
    setAnnouncement(face);
  }

  // The desktop's hover tilt (G12: a mouse or a pen only), on the host round the art alone.
  const tiltHover = (e: React.PointerEvent<HTMLDivElement>) => {
    if (tiltsOnHover(e.pointerType)) liftTilt(e.currentTarget, e.clientX, e.clientY);
  };
  const tiltLeave = (e: React.PointerEvent<HTMLDivElement>) => dropTilt(e.currentTarget);
  const endZoomPress = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = zoomPress.current;
    if (!p || p.id !== e.pointerId) return;
    zoomPress.current = null;
    if (!p.tilting) return;
    dropTilt(e.currentTarget);
    zoomDragged.current = true;
    // This release's click only, never the next tap's.
    setTimeout(() => { zoomDragged.current = false; }, 0);
  };
  // A turn pins the host flat, but only while the art can turn: a pick that takes the back away mid-turn ends it.
  const turningAttr: "" | undefined = turning && twoFaced ? "" : undefined;

  return { onZoomFlip, onTurnSettled, onFlip, onArtTurnSettled, tiltHover, tiltLeave, endZoomPress, turningAttr };
}
