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
// `card-modal-parity.test.ts` holds the literal geometry and the zoom layer's markup to the signed-in modal's, so the two cannot drift.

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { cssUrl, faceFilm, printedNameOf, printingCaption, resolvedPrinting, type BrowseCard } from "../../../lib/collection/browse";
import { identityGradient } from "../../../lib/cards/gradients";
import { printingPickerCopy } from "../../../lib/copy/collection";
import { cardLinkOutCopy } from "../../../lib/copy/collection-browse";
import { cardCarouselCopy } from "../../../lib/copy/card-carousel";
import { cardZoomCopy, twoFacedCopy } from "../../../lib/copy/card-surfaces";
import { priceCopy } from "../../../lib/copy/price";
import { cheapestLiveCents, priceFor } from "../../../lib/cards/price-lookup";
import { formatCents, priceOf, priceState } from "../../../lib/decks/price";
import { faceNames, isTwoFaced } from "../../../lib/cards/faces";
import { useDialogA11y } from "../../../lib/a11y/dialog";
import { useInertWhileOpen } from "../../../lib/a11y/inert-page";
import { HELP_STOP_ID, helpStop, useCardDetailsOpen, useCardDetailsUp } from "../../../lib/a11y/help-over-dialog";
import { ArtLayer } from "../../ui/art-layer";
import { ArrivalOrder } from "../../ui/arrival-queue";
import { FoilFilm } from "../../ui/foil-film";
import { useMinWidth } from "../../ui/use-min-width";
import { CardModalArtSide, SiblingFilm, siblingGround } from "../../cards/card-modal-art-side";
import { DeckLinksContext } from "../../cards/card-detail-blocks";
import { CardModalSheet } from "../../cards/card-modal-sheet";
import { SHEET, SWIPE, useCardSheetGestures, type SheetSnap } from "../../cards/card-sheet-gesture";
import { dropTilt, liftTilt, tiltsOnHover } from "../../cards/card-tilt";
import { CardFaces, FlipControl, Glare } from "../../cards/card-turn";
import { PriceTag } from "../../cards/price-tag";
import type { SiblingCard } from "../../cards/card-detail-context";

/** The dialog's own desktop half-width (820px) and the neighbor plate's measures: the signed-in modal's, held equal by the parity test. */
export const DIALOG_HALF_WIDTH = 410;
const PLATE_GAP = 24;
const PLATE_WIDTH = 168;
export const NEIGHBOR_MIN_WIDTH = 2 * (DIALOG_HALF_WIDTH + PLATE_GAP + PLATE_WIDTH + 24);
/** The narrowest card the phone's teaser may leave room for; below it the sheet opens full. */
const MIN_TEASER_CARD_WIDTH = 120;
/** The desktop under-card stack's reservation with no door: 10 above, the hint's 15, the price row's 27 (and the turn control's 38 when two-faced). */
const UNDER_CARD_BASE = 10 + 15 + 27;
const ZOOM_REGION = "card-zoom";
const TITLE_ID = "card-modal-title";

export type Enter = "prev" | "next" | "prevPeek" | "nextPeek" | null;

const noop = () => {};
/** No printing region: the picker is a write, so the demo draws none (`hasPicker` is false and nothing asks for one). */
const noRegion = (): ReactNode => null;

const NeighborPlate = React.forwardRef<HTMLButtonElement, { sibling: SiblingCard; direction: "previous" | "next"; onPress: () => void }>(
  function NeighborPlate({ sibling, direction, onPress }, ref) {
    const art = siblingGround(sibling);
    const left = direction === "previous"
      ? `calc(50% - ${DIALOG_HALF_WIDTH + PLATE_GAP + PLATE_WIDTH}px)`
      : `calc(50% + ${DIALOG_HALF_WIDTH + PLATE_GAP}px)`;
    return (
      <button
        ref={ref}
        type="button"
        onClick={(e) => { e.stopPropagation(); onPress(); }}
        aria-label={cardCarouselCopy.neighborAria(direction, sibling.name)}
        className="group absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-[10px] cursor-pointer bg-transparent border-0 p-0 outline-none"
        style={{ left }}
      >
        <span
          aria-hidden="true"
          className="relative block overflow-hidden rounded-[9px] group-focus-visible:outline-2 group-focus-visible:outline-offset-[3px] group-focus-visible:outline-[color:var(--accent)] group-focus-visible:[outline-style:solid]"
          style={{ width: PLATE_WIDTH, height: 235, ...art, boxShadow: "0 18px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.3)" }}
        >
          {sibling.imageUri ? <ArtLayer src={sibling.imageUri} style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.3)" }} /> : null}
          <SiblingFilm sibling={sibling} />
        </span>
        {sibling.name ? (
          <span className="flex gap-[6px] max-w-[168px] text-[12.5px] whitespace-nowrap text-[color:var(--fg)]">
            <span aria-hidden="true">{direction === "previous" ? "‹" : "›"}</span>
            <span className="truncate">{sibling.name}</span>
          </span>
        ) : null}
      </button>
    );
  },
);

/** The holds on an element's transitions that `useOwnHeight` has taken and not yet let go (counted: two measurements may share one element). */
const settling = new WeakMap<HTMLElement, number>();

/** An element's own height, kept current as it changes; zero while `active` is false. A settle is applied with `still`'s transitions held off. */
function useOwnHeight(ref: RefObject<HTMLElement | null>, active: boolean, still: RefObject<HTMLElement | null>): number {
  const [height, setHeight] = useState(0);
  const last = useRef(0);
  const holding = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const settle = (next: number) => {
      if (next === last.current) return;
      last.current = next;
      const el = still.current;
      if (el && holding.current === null) {
        holding.current = el;
        settling.set(el, (settling.get(el) ?? 0) + 1);
        el.setAttribute("data-settling", "");
      }
      setHeight(next);
    };
    const el = ref.current;
    if (!active || !el) {
      settle(0);
      return;
    }
    const measure = () => settle(el.offsetHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, active, still]);
  useLayoutEffect(() => {
    const el = holding.current;
    if (el === null || height !== last.current) return;
    holding.current = null;
    void el.offsetHeight;
    const left = (settling.get(el) ?? 1) - 1;
    if (left > 0) settling.set(el, left);
    else {
      settling.delete(el);
      el.removeAttribute("data-settling");
    }
  }, [height]);
  return height;
}

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

  const backImage = resolved?.backImageUri ?? card.backImageUri ?? null;
  const twoFaced = Boolean(backImage) && (isTwoFaced(card.layout) || Boolean(resolved?.hasOwnBack));
  if (!twoFaced && (turning || zoomTurning)) {
    setTurning(false);
    setZoomTurning(false);
  }
  const showingBack = twoFaced && flipped;
  const faces = faceNames(printedNameOf(preview));
  const oneName = faces.front === faces.back;
  const flipLabel = (toBack: boolean) => (oneName
    ? twoFacedCopy.flipToSideAria(toBack ? "back" : "front")
    : twoFacedCopy.flipToAria(toBack ? faces.back : faces.front));
  const shownLabel = (onBack: boolean) => (oneName
    ? twoFacedCopy.flippedSideAria(onBack ? "back" : "front")
    : twoFacedCopy.flippedAria(onBack ? faces.back : faces.front));

  const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  function onZoomFlip() {
    const next = !zoomFlipped;
    setZoomFlipped(next);
    dropTilt(zoomTiltRef.current);
    if (reducedMotion()) setAnnouncement(shownLabel(next));
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
    if (reducedMotion()) setAnnouncement(shownLabel(next));
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

  const frontStyle: React.CSSProperties = resolved?.imageUri
    ? { backgroundImage: cssUrl(resolved.imageUri), backgroundSize: "cover", backgroundPosition: "center" }
    : { background: identityGradient(card.colorIdentity) };
  const backStyle: React.CSSProperties = backImage
    ? { backgroundImage: cssUrl(backImage), backgroundSize: "cover", backgroundPosition: "center" }
    : { background: identityGradient(card.colorIdentity) };
  const frontFilm = { finish: faceFilm(resolved, "front"), src: resolved?.imageUri };
  const backFilm = { finish: faceFilm(resolved, "back"), src: backImage };
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

  const zoomCaption = resolved
    ? `${cardZoomCopy.printing(resolved.setName ?? resolved.setCode, resolved.setCode, resolved.collectorNumber)}${zoomFlipped ? cardZoomCopy.backSuffix : ""}`
    : null;
  const faceImage = showingBack ? backImage : resolved?.imageUri;
  const leftFace = faceImage ?? null;
  useEffect(() => {
    leftFaceRef.current = leftFace;
  });
  const artStyleOf = (image: string | null | undefined): React.CSSProperties => image
    ? { backgroundImage: cssUrl(image), backgroundSize: "cover", backgroundPosition: "center" }
    : { background: identityGradient(card.colorIdentity) };
  const artStyle = artStyleOf(faceImage);
  const zoomWashStyle = artStyleOf(zoomFlipped ? backImage : resolved?.imageUri);

  const price = priceFor(card.prices, resolved);
  const priceTag = price ? <PriceTag fact={price.fact} newestAsOf={card.prices?.newestAsOf ?? null} standalone /> : null;
  const shownState = price?.fact ? priceState(price.fact, card.prices?.newestAsOf ?? null) : null;
  const shownCents = price?.fact && shownState ? priceOf(price.fact, shownState) : null;
  const cheapestCents = cheapestLiveCents(card.prices);
  const fromCents = cheapestCents !== null && (shownCents === null || cheapestCents < shownCents) ? cheapestCents : null;
  const figured = price !== null && (shownCents !== null || fromCents !== null);
  const fromLine = (phone: boolean) =>
    fromCents === null ? null : (
      <span className="flex items-center" data-testid={phone ? "modal-price-from-mobile" : "modal-price-from-desktop"}>
        <span aria-hidden="true" className="font-mono text-[10px]" style={{ color: "var(--fg-locked)" }}>
          {priceCopy.cheapest.from(formatCents(fromCents))}
        </span>
        <span className="sr-only">{priceCopy.cheapest.aria(formatCents(fromCents))}</span>
      </span>
    );

  const turningArt = (radius: string) =>
    twoFaced ? (
      <div
        aria-hidden
        data-testid="modal-art-turn"
        data-face={showingBack ? "back" : "front"}
        className={`absolute inset-0 ${radius} anim-card-turn`}
        onTransitionEnd={onArtTurnSettled}
        style={{ transformStyle: "preserve-3d", transform: showingBack ? "rotateY(180deg)" : undefined }}
      >
        <CardFaces front={frontStyle} back={backStyle} frontFilm={frontFilm} backFilm={backFilm} radius={radius} seam="inset 0 0 0 1px rgba(0,0,0,0.3)" testIdPrefix="modal-art" />
      </div>
    ) : null;

  const underCardHeight = UNDER_CARD_BASE + (twoFaced ? 38 : 0);
  const underCard = (
    <>
      <p aria-hidden data-testid="modal-zoom-hint" className="m-0 whitespace-nowrap font-mono text-[10px]" style={{ color: "var(--fg-locked)" }}>
        {cardZoomCopy.hintDesktop}
      </p>
      {twoFaced && <FlipControl flipAria={flipLabel(!showingBack)} onFlip={onFlip} size={32} />}
      {priceTag && (
        <div data-testid="modal-price-desktop">
          <span className="inline-flex items-center gap-[6px]">
            <span data-testid="modal-price-tag-desktop">{priceTag}</span>
            {fromLine(false)}
          </span>
        </div>
      )}
    </>
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
          <div
            id={ZOOM_REGION}
            role="region"
            aria-label={cardZoomCopy.layerAria(printedNameOf(preview))}
            data-testid="card-zoom"
            className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden anim-zoom-in bg-[color:var(--surface-sunken)] md:bg-[color-mix(in_srgb,var(--bg)_94%,transparent)] md:backdrop-blur-[10px]"
            onClick={() => {
              if (zoomDragged.current) {
                zoomDragged.current = false;
                return;
              }
              closeZoom();
            }}
            style={{ perspective: "1400px" }}
          >
            <div
              aria-hidden
              data-testid="card-zoom-wash"
              className="pointer-events-none absolute inset-0 md:hidden"
              style={{ ...zoomWashStyle, filter: "blur(22px)", transform: "scale(1.2)", opacity: 0.45 }}
            />
            <div className="relative flex flex-col items-center" data-testid="card-zoom-stage">
            <div
              ref={zoomTiltRef}
              data-testid="card-zoom-tilt"
              data-tilt="zoom"
              data-turning={zoomTurning && twoFaced ? "" : undefined}
              className="relative rounded-[13px] md:rounded-[14px]"
              style={{ perspective: "1400px" }}
              onPointerEnter={tiltHover}
              onPointerLeave={(e) => { if (tiltsOnHover(e.pointerType)) tiltLeave(e); }}
              onPointerDown={(e) => {
                if (tiltsOnHover(e.pointerType)) return;
                if (zoomPress.current) return;
                zoomPress.current = { id: e.pointerId, x: e.clientX, y: e.clientY, tilting: false };
                try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* already released */ }
              }}
              onPointerMove={(e) => {
                if (tiltsOnHover(e.pointerType)) { tiltHover(e); return; }
                const p = zoomPress.current;
                if (!p || p.id !== e.pointerId) return;
                if (!p.tilting && Math.hypot(e.clientX - p.x, e.clientY - p.y) < SWIPE.lockPx) return;
                p.tilting = true;
                liftTilt(e.currentTarget, e.clientX, e.clientY);
              }}
              onPointerUp={(e) => endZoomPress(e)}
              onPointerCancel={(e) => endZoomPress(e)}
            >
            <div
              data-testid="card-zoom-card"
              className={`relative rounded-[13px] md:rounded-[14px] w-[var(--zoom-w)] md:w-[var(--zoom-w-md)] ${
                twoFaced ? "anim-card-turn" : ""
              }`}
              data-face={twoFaced ? (zoomFlipped ? "back" : "front") : undefined}
              onTransitionEnd={twoFaced ? onTurnSettled : undefined}
              style={{
                "--zoom-w": twoFaced
                  ? "min(318px, calc(100vw - 32px), calc((100vh - 196px) * 0.7159))"
                  : "min(318px, calc(100vw - 32px), calc((100vh - 140px) * 0.7159))",
                "--zoom-w-md": twoFaced
                  ? "min(372px, calc((min(620px, 85dvh) - 128px) * 0.7159))"
                  : "min(372px, calc((min(620px, 85dvh) - 72px) * 0.7159))",
                aspectRatio: "63/88",
                ...(twoFaced ? null : artStyle),
                transformStyle: twoFaced ? "preserve-3d" : undefined,
                transform: twoFaced && zoomFlipped ? "rotateY(180deg)" : undefined,
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
              } as React.CSSProperties}
            >
              {twoFaced && (
                <CardFaces
                  front={frontStyle}
                  back={backStyle}
                  frontFilm={frontFilm}
                  backFilm={backFilm}
                  radius="rounded-[13px] md:rounded-[14px]"
                  seam="inset 0 0 0 1px rgba(0,0,0,0.35)"
                  testIdPrefix="card-zoom"
                />
              )}
              {oneFaceFilm}
            </div>
            </div>
            {twoFaced && (
              <span onClick={(e) => e.stopPropagation()} className="mt-[12px] flex justify-center">
                <FlipControl controlRef={zoomFlipRef} flipAria={flipLabel(!zoomFlipped)} onFlip={onZoomFlip} size={44} />
              </span>
            )}
            </div>
            {zoomCaption && (
              <p
                className="relative font-mono text-[11px] mt-[14px] m-0 max-w-[calc(100%-32px)] overflow-hidden text-ellipsis whitespace-nowrap rounded-[7px] px-[8px] py-[3px] bg-[color:var(--bg)] border border-[color:var(--border-strong)] md:rounded-none md:p-0 md:bg-transparent md:border-0"
                style={{ color: "var(--fg-muted)" }}
              >
                {zoomCaption}
              </p>
            )}
            <button
              type="button"
              ref={zoomCloseRef}
              onClick={(e) => { e.stopPropagation(); closeZoom(); }}
              aria-label={cardZoomCopy.close}
              className="absolute flex items-center justify-center rounded-full top-[22px] right-[18px] md:right-[24px] w-[32px] md:w-[34px] h-[32px] md:h-[34px] text-[16px] md:text-[15px] bg-[color:var(--elevated)] border border-[color:var(--border-strong)] text-[color:var(--fg)]"
            >
              ✕
            </button>
          </div>
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
