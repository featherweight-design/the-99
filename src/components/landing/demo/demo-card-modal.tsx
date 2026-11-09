"use client";
// The card details modal, read-only, for the landing's Try it (public landing, 5l-d). The signed-in `CardModal` (`cards/card-modal.tsx`)
// is the state half of this same dialog: it imports the collection's actions, the printing picker, the proxy, wishlist and token boxes
// and Find a deck's door, so the public surface cannot reach it. This is that state half with everything that writes or reads a reader
// taken out: it draws the same two props-only halves (`CardModalArtSide`, `CardModalSheet`) and the same zoom layer, neighbor plates,
// phone sheet snaps, gestures, focus trap and Escape ladder, from ONE card's exported details (`DemoCardDetail`).
//
// Left out, on purpose, and why:
//   - the printing picker and the art pick (a write): `hasPicker` is false, the card shows the printing the fixture holds;
//   - the wishlist, proxy and token deck boxes, Edit copies and Bought this card? (writes), and Find a deck's door (a paid read);
//   - the Mana Pool link-out (the page leaves: the demo stays on the page) and the links to a deck's page, which draw as text
//     (`DeckLinksContext`: those pages are the signed-in app's), and the combo block's partner and sheet presses
//     (`onSelectCard` and `onOpenCombo` null: they open another card and a sheet over it, which the demo has no payload for);
//   - the stacked, covered, dropped and leaving layers, the door strip and Find a deck's view: nothing in the demo opens one.
// The pure parts (neighbor plates, the zoom layer, the face and price derivations, the turning art and the under-card rows, the
// own-height hook and the geometry) are `cards/card-modal-parts.tsx`, the ONE copy both modals import (5l-e, 5l-f). What is still a copy
// of the signed-in modal's is the state half; `card-modal-parity.test.ts` holds the dialog's literal markup to it, so the two cannot drift.

import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { printingCaption, resolvedPrinting, type BrowseCard } from "../../../lib/collection/browse";
import { printingPickerCopy } from "../../../lib/copy/collection";
import { cardLinkOutCopy } from "../../../lib/copy/collection-browse";
import { prefersReducedMotion } from "../../../lib/ui/motion";
import { useDialogA11y } from "../../../lib/a11y/dialog";
import { useInertWhileOpen } from "../../../lib/a11y/inert-page";
import { HELP_STOP_ID, helpStop, useCardDetailsOpen, useCardDetailsUp } from "../../../lib/a11y/help-over-dialog";
import { ArrivalOrder } from "../../ui/arrival-queue";
import { FoilFilm } from "../../ui/foil-film";
import { useMinWidth } from "../../ui/use-min-width";
import { CardModalArtSide } from "../../cards/card-modal-art-side";
import { DeckLinksContext } from "../../cards/card-detail-blocks";
import { CardModalSheet } from "../../cards/card-modal-sheet";
import { SHEET, useCardSheetGestures, type SheetSnap } from "../../cards/card-sheet-gesture";
import { dropTilt, liftTilt, tiltsOnHover } from "../../cards/card-tilt";
import { Glare } from "../../cards/card-turn";
import { CardZoomLayer, MIN_TEASER_CARD_WIDTH, NEIGHBOR_MIN_WIDTH, NeighborPlate, PriceFrom, TurningArt, UnderCard, ZOOM_REGION, cardFace, cardPrice, underCardRows, useOwnHeight } from "../../cards/card-modal-parts";
import { PriceTag } from "../../cards/price-tag";
import type { SiblingCard } from "../../cards/card-detail-context";

const TITLE_ID = "card-modal-title";

export type Enter = "prev" | "next" | "prevPeek" | "nextPeek" | null;

const noop = () => {};
/** No printing region: the picker is a write, so the demo draws none (`hasPicker` is false and nothing asks for one). */
const noRegion = (): ReactNode => null;

export type DemoCardModalProps = {
  card: BrowseCard;
  position: number;
  total: number;
  onClose: () => void;
  onPrev: ((offset?: number, progress?: number, leftFace?: string | null) => void) | null;
  onNext: ((offset?: number, progress?: number, leftFace?: string | null) => void) | null;
  onPrevPeek: ((leftFace?: string | null) => void) | null;
  onNextPeek: ((leftFace?: string | null) => void) | null;
  onAtStart?: () => void;
  onAtEnd?: () => void;
  prevSibling: SiblingCard | null;
  nextSibling: SiblingCard | null;
  /** Which control led to THIS mount, captured once: the entrance's side and where focus lands. Null on a fresh open. */
  enterFrom: Enter;
  enterOffset: number;
  enterProgress: number;
  enterLeftFace: string | null;
  /** The phone sheet opens at its min snap, carried from the card before. */
  startMinimized: boolean;
  onMinimizedChange: (minimized: boolean) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
};

/** The dialog for one card; the host keys it on the oracle id, so a page remounts it on its front face at the teaser. */
export function DemoCardModal({
  card, position, total, onClose, onPrev, onNext, onPrevPeek, onNextPeek, onAtStart, onAtEnd, prevSibling, nextSibling,
  enterFrom, enterOffset, enterProgress, enterLeftFace, startMinimized, onMinimizedChange, returnFocusRef,
}: DemoCardModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inertHost = useInertWhileOpen(true);
  const backdropRef = useRef<HTMLDivElement>(null);
  const backdropAndInertRef = useCallback((el: HTMLDivElement | null) => { backdropRef.current = el; inertHost(el); }, [inertHost]);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const desktopTriggerRef = useRef<HTMLButtonElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const wideEnoughForNeighbors = useMinWidth(`(min-width: ${NEIGHBOR_MIN_WIDTH}px)`);
  const narrow = !useMinWidth("(min-width: 768px)");
  const zoomTriggerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const zoomCloseRef = useRef<HTMLButtonElement>(null);
  const zoomFlipRef = useRef<HTMLButtonElement>(null);
  const [zoomFlipped, setZoomFlipped] = useState(false);
  const desktopTiltRef = useRef<HTMLDivElement | null>(null);
  const phoneTiltRef = useRef<HTMLDivElement | null>(null);
  const zoomTiltRef = useRef<HTMLDivElement | null>(null);
  const [turning, setTurning] = useState(false);
  const [zoomTurning, setZoomTurning] = useState(false);
  // Crossing the 768px line mid-turn hides the tree that was turning, which sends no transitionend: end the turn when the width changes.
  const [turnNarrow, setTurnNarrow] = useState(narrow);
  if (turnNarrow !== narrow) {
    setTurnNarrow(narrow);
    setTurning(false);
  }
  const zoomPress = useRef<{ id: number; x: number; y: number; tilting: boolean } | null>(null);
  const zoomDragged = useRef(false);
  const heldArtFace = useRef<string | null>(null);
  const closeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Captured once, at this instance's own construction: the host clears its `enterFrom` once the arrival is announced.
  const [enteredFrom] = useState(enterFrom);
  const [enteredOffset] = useState(enterOffset);
  const [enteredProgress] = useState(enterProgress);
  const [enteredLeftFace] = useState(enterLeftFace);
  const leftFaceRef = useRef<string | null>(null);
  const [snap, setSnapState] = useState<SheetSnap>(startMinimized ? "min" : "teaser");
  const reportedMount = useRef(false);
  useEffect(() => {
    if (reportedMount.current) return;
    reportedMount.current = true;
    onMinimizedChange(startMinimized);
  }, [onMinimizedChange, startMinimized]);
  const [gentle, setGentle] = useState(false);
  const sheetFull = snap === "full";
  const setSnap = (next: SheetSnap) => {
    setGentle(next === "min" || snap === "min");
    setSnapState(next);
    if ((next === "min") !== (snap === "min")) onMinimizedChange(next === "min");
  };
  // No door strip in the demo: the teaser is the fixed height.
  const teaserHeight: number = SHEET.teaserHeight;
  const dialogHeight = useOwnHeight(dialogRef, narrow, dialogRef);
  const cramped = dialogHeight > 0 && (dialogHeight - teaserHeight - 85) * 0.7159 < MIN_TEASER_CARD_WIDTH;
  const full = sheetFull || cramped;
  const sheetOpen = narrow && sheetFull && !cramped;
  const min = narrow && snap === "min" && !cramped;
  const bandRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const sheetBodyRef = useRef<HTMLDivElement | null>(null);
  const gripRef = useRef<HTMLButtonElement | null>(null);
  const prevPhonePeekRef = useRef<HTMLButtonElement | null>(null);
  const nextPhonePeekRef = useRef<HTMLButtonElement | null>(null);
  const prevButtonRef = useRef<HTMLButtonElement | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement | null>(null);
  const prevPeekRef = useRef<HTMLButtonElement | null>(null);
  const nextPeekRef = useRef<HTMLButtonElement | null>(null);
  const doorRef = useRef<HTMLDivElement | null>(null);
  const initialFocusRef = useMemo(
    () => ({
      get current() {
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
    [enteredFrom],
  );
  const [announcement, setAnnouncement] = useState("");
  const [flipped, setFlipped] = useState(false);

  // The card as shown: the printing the fixture holds, no pick and no opened-at printing.
  const preview = card;
  const resolved = resolvedPrinting(preview);
  const ownedPrintings = useMemo(() => card.printings.filter((p) => p.quantity > 0), [card.printings]);
  const isToken = card.kind === "token";

  const closeZoom = useCallback(() => {
    setZoomed(false);
    setZoomTurning(false);
    zoomPress.current = null;
    zoomDragged.current = false;
    const held = heldArtFace.current;
    heldArtFace.current = null;
    setAnnouncement(held ?? "");
  }, []);
  const openZoom = useCallback(() => {
    setZoomFlipped(false);
    setAnnouncement("");
    setZoomTurning(false);
    setZoomed(true);
  }, []);

  // Three rungs: the zoom, the phone's full (or min) sheet, then the dialog.
  const onEscape = useCallback(() => {
    if (zoomed) {
      closeZoom();
      return;
    }
    if (sheetOpen || min) {
      setSnap("teaser");
      return;
    }
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `setSnap` reads `snap`, which `min` and `sheetOpen` track
  }, [closeZoom, onClose, sheetOpen, min, zoomed]);

  useDialogA11y(dialogRef, onEscape, { initialFocusRef, returnFocusRef, extraStop: helpStop });
  useCardDetailsUp(true);
  useCardDetailsOpen(true);

  const gestures = useCardSheetGestures({
    bandRef, sheetRef, stageRef, full, min, canMinimize: !cramped, teaserHeight,
    canPrev: onPrev !== null, canNext: onNext !== null,
    onPage: (dir, offset, progress) => (dir === "next" ? onNext?.(offset, progress, leftFaceRef.current) : onPrev?.(offset, progress, leftFaceRef.current)),
    onSnap: setSnap, bodyRef: sheetBodyRef, canCollapse: !cramped, disabled: false, tiltRef: phoneTiltRef,
  });

  const wasFull = useRef(false);
  useEffect(() => {
    if (wasFull.current === sheetFull) return;
    wasFull.current = sheetFull;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body && dialogRef.current?.contains(active) && active.getClientRects().length > 0) return;
    gripRef.current?.focus();
  }, [sheetFull]);

  const wasZoomed = useRef(false);
  useEffect(() => {
    if (wasZoomed.current === zoomed) return;
    wasZoomed.current = zoomed;
    if (zoomed) {
      (zoomFlipRef.current ?? zoomCloseRef.current)?.focus();
      return;
    }
    const active = document.activeElement;
    if (active && active !== document.body && dialogRef.current?.contains(active)) return;
    const mounted = zoomTriggerRefs.current.filter((el): el is HTMLButtonElement => el !== null);
    const target = mounted.find((el) => el.getClientRects().length > 0) ?? mounted[0];
    target?.focus();
  }, [zoomed]);

  const caption = printingCaption(preview, ownedPrintings);
  const triggerAria = printingPickerCopy.printing.triggerAria(ownedPrintings.length, caption);
  const tokenNoSet = card.kind === "token" && caption === "";

  // Arrow-key paging, as the signed-in modal's: anywhere in the dialog but a field, a radiogroup and the zoom.
  useEffect(() => {
    const backdrop = backdropRef.current;
    if (!backdrop || total <= 1) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.defaultPrevented) return;
      const target = e.target;
      if (target !== document.body && !(target instanceof Node && backdrop.contains(target))) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
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
  }, [total, onPrev, onNext, onAtStart, onAtEnd, narrow, full]);

  const face = cardFace({ card, preview, resolved, flipped, zoomFlipped });
  const { backImage, twoFaced, showingBack, flipLabel, shownLabel, frontFilm, faceImage, artStyleOf } = face;
  if (!twoFaced && (turning || zoomTurning)) {
    setTurning(false);
    setZoomTurning(false);
  }

  function onZoomFlip() {
    const next = !zoomFlipped;
    setZoomFlipped(next);
    dropTilt(zoomTiltRef.current);
    if (prefersReducedMotion()) setAnnouncement(shownLabel(next));
    else setZoomTurning(true);
  }
  function onTurnSettled(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
    setZoomTurning(false);
    setAnnouncement(shownLabel(zoomFlipped));
  }
  function onFlip() {
    const next = !flipped;
    setFlipped(next);
    dropTilt(desktopTiltRef.current);
    dropTilt(phoneTiltRef.current);
    if (prefersReducedMotion()) setAnnouncement(shownLabel(next));
    else setTurning(true);
  }
  function onArtTurnSettled(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
    setTurning(false);
    const face = shownLabel(showingBack);
    // Not while the zoom is up: held, and said when the zoom closes (`closeZoom`).
    if (zoomed) {
      heldArtFace.current = face;
      return;
    }
    setAnnouncement(face);
  }

  const oneFaceFilm = twoFaced ? null : <><FoilFilm {...frontFilm} size="large" /><Glare /></>;
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
    setTimeout(() => { zoomDragged.current = false; }, 0);
  };
  const turningAttr = turning && twoFaced ? "" : undefined;

  const leftFace = faceImage ?? null;
  useEffect(() => {
    leftFaceRef.current = leftFace;
  });
  const artStyle = artStyleOf(faceImage);
  const zoomWashStyle = artStyleOf(zoomFlipped ? backImage : resolved?.imageUri);

  const { price, fromCents, figured } = cardPrice(card, resolved);
  const priceTag = price ? <PriceTag fact={price.fact} newestAsOf={card.prices?.newestAsOf ?? null} standalone /> : null;
  const fromLine = (phone: boolean) => (fromCents === null ? null : <PriceFrom cents={fromCents} phone={phone} />);

  const turningArt = (radius: string) => (twoFaced ? <TurningArt radius={radius} face={face} onTurnSettled={onArtTurnSettled} /> : null);

  // No door in the demo: the stack's reservation is the base, plus the turn control's row when two-faced.
  const underCardHeight = underCardRows(twoFaced, false);
  const underCard = (
    <UnderCard twoFaced={twoFaced} flipAria={flipLabel(!showingBack)} onFlip={onFlip} priceTag={priceTag} fromLine={fromLine(false)} />
  );

  return (
    // A deck's name in the receipt and the proxy list is text here: its page is the signed-in app's, which a link would prefetch and open.
    <DeckLinksContext.Provider value={false}>
    <ArrivalOrder>
    <div
      ref={backdropAndInertRef}
      className="fixed inset-0 flex items-center justify-center z-50"
      role="presentation"
      onClick={onClose}
      style={{ background: "color-mix(in oklab, var(--bg) 72%, transparent)" }}
    >
      {wideEnoughForNeighbors && prevSibling && !zoomed ? (
        <NeighborPlate ref={prevPeekRef} sibling={prevSibling} direction="previous" onPress={() => onPrevPeek?.(leftFaceRef.current)} />
      ) : null}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        aria-owns={HELP_STOP_ID}
        onClick={(e) => e.stopPropagation()}
        onClickCapture={gestures.onClickCapture}
        className="relative flex flex-col overflow-hidden w-full h-full md:h-[620px] md:max-h-[85dvh] md:w-[820px] md:flex-row md:rounded-2xl bg-[color:var(--surface-sunken)] md:bg-[color:var(--surface-rail)] md:[border:1px_solid_var(--border-strong)]"
        style={{ boxShadow: "var(--modal-shadow)" }}
      >
        <CardModalArtSide
          artStyle={artStyle} preview={preview} oneFaceFilm={oneFaceFilm} turningArt={turningArt} turningAttr={turningAttr}
          twoFaced={twoFaced} showingBack={showingBack} flipLabel={flipLabel} onFlip={onFlip}
          underCard={underCard} underCardHeight={underCardHeight} door={null}
          narrow={narrow} min={min} full={full} zoomed={zoomed} viewOpen={false} teaserHeight={teaserHeight}
          bandRef={bandRef} stageRef={stageRef} onBandPointerDown={gestures.onBandPointerDown}
          prevSibling={prevSibling} nextSibling={nextSibling} onPrevPeek={onPrevPeek} onNextPeek={onNextPeek}
          prevPhonePeekRef={prevPhonePeekRef} nextPhonePeekRef={nextPhonePeekRef}
          leftFace={leftFace} enteredLeftFace={enteredLeftFace} enteredFrom={enteredFrom}
          enteredOffset={enteredOffset} enteredProgress={enteredProgress} phoneTiltRef={phoneTiltRef}
          total={total} position={position} phoneBack={null} registerCloseRef={(slot, el) => { closeRefs.current[slot] = el; }} onClose={onClose}
          desktopTiltRef={desktopTiltRef} tiltHover={tiltHover} tiltLeave={tiltLeave}
          registerZoomTriggerRef={(slot, el) => { zoomTriggerRefs.current[slot] = el; }} openZoom={openZoom} zoomRegion={ZOOM_REGION}
        />
        <CardModalSheet
          card={card} preview={preview} resolved={resolved} titleId={TITLE_ID} caption={caption} ownedPrintings={ownedPrintings}
          hasPicker={false} isToken={isToken} tokenNoSet={tokenNoSet} pick={card.preferredPrinting} deckScope={false} total={total} position={position}
          deckPage={false} deckName={null} buyUrl={null} buyLabel={cardLinkOutCopy.card}
          min={min} full={full} zoomed={zoomed} viewOpen={false} cramped={cramped} gentle={gentle} sheetFull={sheetFull}
          teaserHeight={teaserHeight} closeReserve={46} back={null}
          onSheetPointerDown={narrow ? gestures.onSheetPointerDown : undefined} setSnap={setSnap}
          priceTag={priceTag} fromLine={fromLine} doorStrip={null} footer={null} figured={figured}
          printingRegion={noRegion}
          wishlistBox={null} proxyBox={null} tokenDeckBox={null}
          openCombo={false} onOpenCombo={null} onSelectCard={undefined}
          expanded={false} triggerAria={triggerAria} onToggleExpanded={noop}
          fitsDoor={null}
          onEditCopies={null} receiptLink={null} onPrev={onPrev} onNext={onNext}
          sheetRef={sheetRef} gripRef={gripRef} doorRef={doorRef} sheetBodyRef={sheetBodyRef}
          mobileTriggerRef={mobileTriggerRef} desktopTriggerRef={desktopTriggerRef}
          prevButtonRef={prevButtonRef} nextButtonRef={nextButtonRef}
          registerCloseRef={(el) => { closeRefs.current[1] = el; }}
          registerBackRef={(el) => { closeRefs.current[1] = el; }}
          onClose={onClose}
        />
        {/* The modal's one live region. */}
        <div aria-live="polite" className="sr-only">{announcement}</div>

        {zoomed && (
          <CardZoomLayer
            face={face}
            preview={preview}
            zoomDraggedRef={zoomDragged}
            closeZoom={closeZoom}
            zoomWashStyle={zoomWashStyle}
            zoomTiltRef={zoomTiltRef}
            zoomTurning={zoomTurning}
            tiltHover={tiltHover}
            tiltLeave={tiltLeave}
            zoomPressRef={zoomPress}
            endZoomPress={endZoomPress}
            zoomFlipped={zoomFlipped}
            onTurnSettled={onTurnSettled}
            artStyle={artStyle}
            oneFaceFilm={oneFaceFilm}
            zoomFlipRef={zoomFlipRef}
            onZoomFlip={onZoomFlip}
            zoomCloseRef={zoomCloseRef}
          />
        )}
      </div>
      {wideEnoughForNeighbors && nextSibling && !zoomed ? (
        <NeighborPlate ref={nextPeekRef} sibling={nextSibling} direction="next" onPress={() => onNextPeek?.(leftFaceRef.current)} />
      ) : null}
    </div>
    </ArrivalOrder>
    </DeckLinksContext.Provider>
  );
}
