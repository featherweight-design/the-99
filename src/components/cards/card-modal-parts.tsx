"use client";

// The card details modal's pure parts: hooks and plates with no context, server action or provider behind them, shared by
// the signed-in modal (`card-modal.tsx`) and the landing demo's modal, which draws the same card on the public surface.
// A part moves here byte for byte; what it reads is in its arguments.

import React, { useLayoutEffect, useRef, useState } from "react";
import { ArtLayer } from "../ui/art-layer";
import { cardCarouselCopy } from "../../lib/copy/card-carousel";
import { cssUrl, faceFilm, printedNameOf, type BrowseCard, type BrowsePrinting } from "../../lib/collection/browse";
import { identityGradient } from "../../lib/cards/gradients";
import { cheapestLiveCents, priceFor } from "../../lib/cards/price-lookup";
import { formatCents, priceOf, priceState } from "../../lib/decks/price";
import { priceCopy } from "../../lib/copy/price";
import { faceNames, isTwoFaced } from "../../lib/cards/faces";
import { cardZoomCopy, twoFacedCopy } from "../../lib/copy/card-surfaces";
import type { SiblingCard } from "./card-detail-context";
import { SWIPE } from "./card-sheet-gesture";
import { liftTilt, tiltsOnHover } from "./card-tilt";
import { CardFaces, FlipControl } from "./card-turn";
import { SiblingFilm, siblingGround } from "./card-modal-art-side";

/**
 * The door's rows in the desktop art column, added to the stack's reservation so the art gives
 * them room: 8 above the block, the stack's 6 gap, a 16px limit line, 8 between, and a 21px link.
 */
const DOOR_HEIGHT = 8 + 6 + 16 + 8 + 21;

/**
 * The rows under the desktop card, reserved whatever they hold (row 1.14): 10 above, the 15px zoom hint, the 38px flip control
 * on a two-faced card, the 27px tag row, and the door's rows when the card has a door.
 */
export function underCardRows(twoFaced: boolean, door: boolean): number {
  return 10 + 15 + (twoFaced ? 38 : 0) + 27 + (door ? DOOR_HEIGHT : 0);
}

/** The narrowest card the phone's teaser may leave room for; below it the sheet opens full. */
export const MIN_TEASER_CARD_WIDTH = 120;

/** The zoom layer's id: the dialog's paging keys stand down while focus is inside it. */
export const ZOOM_REGION = "card-zoom";

/** Whether the reader asked for less motion: a turn then lands on the press, with no transition to wait for. */
export function reducedMotion(): boolean {
  return typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * A desktop neighbor plate (handoff decision 2): the whole card, scaled down, on the backdrop
 * 24px off the modal, with the name under it in 12.5px `--fg`. 168x235 at 63/88 — the
 * card ratio exactly, which is also how the ~1252px threshold was derived (decision 4).
 *
 * Art first, then identity, then a bare plate (handoff "Notes for engineering" §2): a sibling
 * carrying only an id draws no text at all, since there is none to draw.
 */
// The dialog's own fixed desktop geometry (`md:w-[820px]`) and the 24px gap decision 2 draws
// between it and a plate, from which `NEIGHBOR_MIN_WIDTH` computes the plates' threshold. The
// half-width is exported for `card-modal-geometry.test.ts`, which pins the dialog's class to it.
export const DIALOG_HALF_WIDTH = 410;
const PLATE_GAP = 24;
const PLATE_WIDTH = 168;
/**
 * The neighbor plates' threshold (handoff decision 4, ledger 2): the dialog, plus a plate, its gap
 * off the dialog and 24px clear of the viewport edge on each side. 1252 today, and COMPUTED, so a
 * move of the dialog's width moves it too; `card-modal-geometry.test.ts` pins the dialog's
 * `md:w-[…]` class to `DIALOG_HALF_WIDTH`, the half a Tailwind literal cannot read.
 */
export const NEIGHBOR_MIN_WIDTH = 2 * (DIALOG_HALF_WIDTH + PLATE_GAP + PLATE_WIDTH + 24);

export const NeighborPlate = React.forwardRef<
  HTMLButtonElement,
  { sibling: SiblingCard; direction: "previous" | "next"; onPress: () => void }
>(function NeighborPlate({ sibling, direction, onPress }, ref) {
  const art = siblingGround(sibling);
  // Anchored from the BACKDROP's own center rather than carried as a flex sibling of the
  // centered dialog (pre-open review, round 1): a flex sibling present on only one side
  // shifts the dialog itself by its width-plus-gap, which moved the dialog and its footer
  // controls under the reader on every page to a list's first or last card.
  const left = direction === "previous"
    ? `calc(50% - ${DIALOG_HALF_WIDTH + PLATE_GAP + PLATE_WIDTH}px)`
    : `calc(50% + ${DIALOG_HALF_WIDTH + PLATE_GAP}px)`;
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => { e.stopPropagation(); onPress(); }}
      aria-label={cardCarouselCopy.neighborAria(direction, sibling.name)}
      // `DesktopModal.dc.html` D1, with the plate OPAQUE (Hugh, 2026-10-12: at .55 the grid cards behind the
      // dialog showed through and clashed). Keyboard focus rings the plate in `--accent` 3px out. The ring
      // is the plate's, not the button's, so the browser's own ring around both is turned off.
      className="group absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-[10px] cursor-pointer bg-transparent border-0 p-0 outline-none"
      style={{ left }}
    >
      <span
        aria-hidden="true"
        className="relative block overflow-hidden rounded-[9px] group-focus-visible:outline-2 group-focus-visible:outline-offset-[3px] group-focus-visible:outline-[color:var(--accent)] group-focus-visible:[outline-style:solid]"
        style={{
          width: PLATE_WIDTH,
          height: 235,
          ...art,
          boxShadow: "0 18px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.3)",
        }}
      >
        {/* The inset ring rides on the layer too: a host's inset shadow paints under its children. */}
        {sibling.imageUri ? <ArtLayer src={sibling.imageUri} style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.3)" }} /> : null}
        <SiblingFilm sibling={sibling} />
      </span>
      {sibling.name ? (
        // `--fg`, not the handoff's `--fg-muted` (ledger 1, measured in build on every backdrop
        // pixel behind the name, six themes): `--fg-muted` put 39% to 78% of them under AA's 4.5:1
        // for 12.5px text, and `--fg-body` still up to 6%; `--fg` holds 5.5:1 at its worst pixel.
        // No hover state: the plate is already opaque (Hugh, 2026-10-12) and the name has no brighter ink
        // left; the pointer cursor and keyboard focus ring mark it as a control.
        <span className="flex gap-[6px] max-w-[168px] text-[12.5px] whitespace-nowrap text-[color:var(--fg)]">
          <span aria-hidden="true">{direction === "previous" ? "‹" : "›"}</span>
          <span className="truncate">{sibling.name}</span>
        </span>
      ) : null}
    </button>
  );
});

/**
 * The holds on an element's transitions that `useOwnHeight` has taken and not yet let go. Counted,
 * because two measurements share one element (the door strip's and the dialog's own both hold the
 * dialog), and one letting go must not release the other before its height is committed.
 */
const settling = new WeakMap<HTMLElement, number>();

/**
 * An element's own height, kept current as it changes. Zero while `active` is false or the element
 * has no layout, which is every element below a `display: none` ancestor.
 *
 * A height this settles moves the phone's geometry (the sheet's top, the band, the card sized from
 * it), and a settle is not a move, so it is applied with `still`'s transitions held off. The case
 * that needs it is every page: the modal remounts per card, its first measurement reads layout with
 * the height still 0, and without the hold the sheet eased up from there on every swipe, the card
 * shrinking with it (`[data-settling]`, `globals.css`).
 */
export function useOwnHeight(ref: React.RefObject<HTMLElement | null>, active: boolean, still: React.RefObject<HTMLElement | null>): number {
  const [height, setHeight] = useState(0);
  const last = useRef(0);
  // The element this instance holds, until its height is committed.
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
  // The new height is committed: lay it out while the hold is on, so the browser takes it as where
  // things already were, and only then let go. Not before it is committed: on mount this runs
  // straight after the measurement, with the height still the 0 it rendered with.
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

/**
 * What the modal draws of a card's faces, from the printing on screen: whether it turns over, the art and film of each face,
 * the labels its turn control and announcement read, the zoom's caption, and the face showing. Pure: both modals compute it
 * each render from their own `flipped` and `zoomFlipped`.
 */
export function cardFace({ card, preview, resolved, flipped, zoomFlipped }: {
  card: BrowseCard;
  preview: BrowseCard;
  resolved: BrowsePrinting | undefined;
  flipped: boolean;
  zoomFlipped: boolean;
}) {
  const backImage = resolved?.backImageUri ?? card.backImageUri ?? null;
  // A back face to turn to, or none (#363). The image is the second condition and
  // not an afterthought: a `transform` row seeded before the back-face column
  // existed carries the layout and no art, and a control that turns to a
  // colour-identity gradient is the lie the layout gate exists to prevent.
  //
  // TWO SIDES BY LAYOUT, OR BY THIS PRINTING'S OWN BACK ART.
  //
  // `card.layout` is ORACLE-level, and that is the wrong scope for a reversible
  // printing: `sld/2214` prints Teferi's Ageless Insight on both sides, while the
  // oracle row's layout comes from its M21 printing and says `normal`. So the art
  // was ingested (#811), stored, and unreachable — 81 printings carry their own
  // back image under a one-sided oracle layout, all of them reversibles.
  //
  // A printing's own back image is POSITIVE EVIDENCE of two-sided stock, and stronger
  // than the layout word, which describes the card in general.
  //
  // `hasOwnBack` RATHER THAN `backImageUri`, and the difference is the whole guard:
  // `resolveBackImageUri` hands a printing with no back of its own the ORACLE's image,
  // so the resolved string cannot say whose back it is. Reading it here put a turn on a
  // one-sided printing whose back belongs to another printing entirely — and the first
  // version of this gate did exactly that while passing its own test, because the
  // fixture built props by hand rather than through the loader. Raised by review.
  //
  // What excludes an ordinary split or adventure printing is its own null back art,
  // NOT the layout word: Scryfall gives those layouts one image between both halves,
  // so `card_faces[1]` carries no `image_uris` and the transform stores null. A
  // reversible printing OF an adventure card is a different thing and turns over
  // correctly — `tdm/381` prints Bloomvine Regent and Claim Territory on two sides,
  // and each side has its own art.
  const twoFaced = Boolean(backImage)
    && (isTwoFaced(card.layout) || Boolean(resolved?.hasOwnBack));
  // CLAMPED TO WHAT EXISTS, not to what the reader last asked for.
  //
  // `flipped` survives a printing pick by design — only a card change remounts this —
  // and since the turn began taking a PRINTING's own back art as its signal, a pick
  // can take that art away underneath a turned card. Turn `sld/2214` over, pick the
  // M21 printing, and `backImage` goes null: the art fell back to the colour-identity
  // gradient and `turningArt` returned nothing, so there was no control left to turn
  // back with. Exactly the lie the gate's own comment above says it prevents, reached
  // from a direction that did not exist before — a `transform` oracle always carries
  // `cards.back_image_uri` as a fallback, so `backImage` could not go null under a pick.
  //
  // The reader's intent stays in `flipped`; every drawn decision reads this instead.
  const showingBack = twoFaced && flipped;
  // The faces of the name on screen, which is the printed one when the copy in
  // hand carries a printed name. The title above and this announcement must
  // name the same card.
  const faces = faceNames(printedNameOf(preview));
  // A reversible card's two sides carry ONE name, so `faceNames` hands back the same
  // string twice and every label built from it would name the card already on screen.
  // The side is what is left to say. See `twoFacedCopy.flipToSideAria`.
  const oneName = faces.front === faces.back;
  const flipLabel = (toBack: boolean) => (oneName
    ? twoFacedCopy.flipToSideAria(toBack ? "back" : "front")
    : twoFacedCopy.flipToAria(toBack ? faces.back : faces.front));
  const shownLabel = (onBack: boolean) => (oneName
    ? twoFacedCopy.flippedSideAria(onBack ? "back" : "front")
    : twoFacedCopy.flippedAria(onBack ? faces.back : faces.front));
  // Art follows the resolved printing, not the card-level image: they are the same value
  // today, but an optimistic pick updates `resolved` a revalidate earlier.
  //
  // The back face follows it, through `printings.back_image_uri`. Both faces come off one
  // printing or a flip turns to another printing's back — which is what it used to do, the
  // column having been oracle-level. A printing ingested before that column existed carries
  // null and falls back to the card's, which is where every flip stood before.
  // The two faces are drawn from their own images rather than from `faceImage`,
  // which follows `flipped`: a turning card shows both at once, and a box whose
  // background swapped mid-turn would be the swap this amendment exists to replace.
  const frontStyle: React.CSSProperties = resolved?.imageUri
    ? { backgroundImage: cssUrl(resolved.imageUri), backgroundSize: "cover", backgroundPosition: "center" }
    : { background: identityGradient(card.colorIdentity) };
  const backStyle: React.CSSProperties = backImage
    ? { backgroundImage: cssUrl(backImage), backgroundSize: "cover", backgroundPosition: "center" }
    : { background: identityGradient(card.colorIdentity) };
  // THE FILM (foil handoff R2) reads the printing these faces are drawn from, never `preview.foil`, which a pick
  // does not recompute (audit G9). Each face takes its own, so a back drawn from the oracle's art carries none.
  // Drawn as a span INSIDE each face, armed by its own preload (`FoilFilm`): the face itself is never marked.
  const frontFilm = { finish: faceFilm(resolved, "front"), src: resolved?.imageUri };
  const backFilm = { finish: faceFilm(resolved, "back"), src: backImage };
  // `set · code · collector number`, and the field AND its separator go when the
  // holding carries no number — never "no number" (the printing picker's ruling).
  const zoomCaption = resolved
    ? `${cardZoomCopy.printing(
        resolved.setName ?? resolved.setCode,
        resolved.setCode,
        resolved.collectorNumber,
      )}${zoomFlipped ? cardZoomCopy.backSuffix : ""}`
    // A card with no printings at all names nothing, and ` · ` is not a caption.
    // The zoom draws the card and no line rather than a line with nothing in it.
    : null;

  const faceImage = showingBack ? backImage : resolved?.imageUri;
  const artStyleOf = (image: string | null | undefined): React.CSSProperties => image
    ? { backgroundImage: cssUrl(image), backgroundSize: "cover", backgroundPosition: "center" }
    : { background: identityGradient(card.colorIdentity) };
  return {
    backImage, twoFaced, showingBack, flipLabel, shownLabel, frontStyle, backStyle, frontFilm, backFilm, zoomCaption, faceImage,
    artStyleOf,
  };
}

/** One render's faces, as `cardFace` gives them. */
export type CardFace = ReturnType<typeof cardFace>;

/**
 * The price the modal quotes for the printing on screen, and the cheapest printing's figure beside it when that is lower.
 */
export function cardPrice(card: BrowseCard, resolved: BrowsePrinting | undefined) {
  // The figure belongs to the printing on screen, so it is resolved from the same
  // object the art and the `Set` caption read — a pick moves four things together
  // or none of them (card-detail R2, §1). `null` means draw nothing at all: either
  // no price read reached us, or the holding names no printing to ask about.
  // `{ fact: null }` is the other silence-adjacent state and is NOT silence — the
  // store answered, and the answer was that it has never carried this printing.
  const price = priceFor(card.prices, resolved);

  // The other question, answered beside the first rather than instead of it.
  //
  // `/commanders/[slug]` quotes a card's CHEAPEST printing and this modal quotes
  // the printing on screen, so a reader who follows a $2.34 synergy row into a
  // $4.39 modal reads two correct figures for one card with nothing saying why.
  // The tag keeps belonging to the art; this names where the card starts.
  //
  // Drawn only where the cheapest is genuinely LOWER than what is on screen — and
  // where this printing carries no figure at all, which is the same reader with
  // the same question and no number to hold it against. Equal figures say
  // nothing: on the cheapest printing itself `from $2.34` beside `$2.34` is the
  // same number twice.
  //
  // THE COMPARISON IS AGAINST THE DRAWN FIGURE, whatever finish supplied it, and
  // the cheapest is non-foil only — so the two sides can name different finishes.
  // That asymmetry is the rule rather than a gap in it: what this line must never
  // do is sit beside a smaller number claiming the card starts higher. A foil-only
  // $1.20 with a $4.39 non-foil sibling therefore says nothing, which is silence
  // and not a false claim; a foil-only $9.80 with the same sibling says
  // `from $4.39`, which is true and is the reason a reader would look.
  const shownState = price?.fact
    ? priceState(price.fact, card.prices?.newestAsOf ?? null)
    : null;
  const shownCents =
    price?.fact && shownState ? priceOf(price.fact, shownState) : null;
  const cheapestCents = cheapestLiveCents(card.prices);
  const fromCents =
    cheapestCents !== null && (shownCents === null || cheapestCents < shownCents)
      ? cheapestCents
      : null;
  // Whether the price line carries a FIGURE: a read that answered `no stock`, with no `from`
  // beside it, names no amount, so a phone footer keeps its own (stacked sheets R1, round 2).
  const figured = price !== null && (shownCents !== null || fromCents !== null);
  return { price, fromCents, figured };
}

/** The cheapest printing's figure, as a companion to the tag (`cardPrice`'s `fromCents`). */
export function PriceFrom({ cents, phone }: { cents: number; phone: boolean }) {
  return (
    <span
      className="flex items-center"
      data-testid={phone ? "modal-price-from-mobile" : "modal-price-from-desktop"}
    >
      <span aria-hidden="true" className="font-mono text-[10px]" style={{ color: "var(--fg-locked)" }}>
        {priceCopy.cheapest.from(formatCents(cents))}
      </span>
      <span className="sr-only">{priceCopy.cheapest.aria(formatCents(cents))}</span>
    </span>
  );
}

/** A two-faced card's art, turning between its faces in place: the modal's art box, at the radius it is drawn with. */
export function TurningArt({ radius, face, onTurnSettled }: {
  radius: string;
  /** The card's faces this render (`cardFace`). */
  face: CardFace;
  onTurnSettled: (e: React.TransitionEvent<HTMLDivElement>) => void;
}) {
  const { showingBack, frontStyle, backStyle, frontFilm, backFilm } = face;
  return (
    <div
      aria-hidden
      data-testid="modal-art-turn"
      data-face={showingBack ? "back" : "front"}
      className={`absolute inset-0 ${radius} anim-card-turn`}
      onTransitionEnd={onTurnSettled}
      style={{
        transformStyle: "preserve-3d",
        transform: showingBack ? "rotateY(180deg)" : undefined,
      }}
    >
      <CardFaces
        front={frontStyle}
        back={backStyle}
        frontFilm={frontFilm}
        backFilm={backFilm}
        radius={radius}
        seam="inset 0 0 0 1px rgba(0,0,0,0.3)"
        testIdPrefix="modal-art"
      />
    </div>
  );
}

/** The rows under the desktop card: the zoom hint, a two-faced card's turn control, and the price tag with its `from`. */
export function UnderCard({ twoFaced, flipAria, onFlip, priceTag, fromLine }: {
  twoFaced: boolean;
  flipAria: string;
  onFlip: () => void;
  priceTag: React.ReactNode;
  fromLine: React.ReactNode;
}) {
  return (
    <>
      <p
        aria-hidden
        data-testid="modal-zoom-hint"
        className="m-0 whitespace-nowrap font-mono text-[10px]"
        style={{ color: "var(--fg-locked)" }}
      >
        {cardZoomCopy.hintDesktop}
      </p>
      {twoFaced && (
        <FlipControl
          flipAria={flipAria}
          onFlip={onFlip}
          // 32 on the desktop, where the column below the art is 97px tall at the
          // drawn dialog height and this stack has to fit three rows inside it.
          size={32}
        />
      )}
      {priceTag && (
        <div data-testid="modal-price-desktop">
          {/* One ROW, not one more row: the stack's height is reserved by
              `underCardHeight` and a second line under the tag would need that
              figure moved — and would put the art's width under the reader at
              the moment a pick made the line appear, which is the defect row
              1.14 already forbids one level up. */}
          <span className="inline-flex items-center gap-[6px]">
            <span data-testid="modal-price-tag-desktop">{priceTag}</span>
            {fromLine}
          </span>
        </div>
      )}
    </>
  );
}
type PointerHandler = (e: React.PointerEvent<HTMLDivElement>) => void;

/**
 * The zoom layer (table §3.1): the whole card at the largest 63/88 the dialog allows, its wash, its turn and tilt, the
 * printing's caption and its close. Drawn while the card is zoomed, by both modals; every state and handler is its caller's.
 */
export function CardZoomLayer({
  face, preview, zoomDraggedRef, closeZoom, zoomWashStyle, zoomTiltRef, zoomTurning, tiltHover, tiltLeave, zoomPressRef, endZoomPress,
  zoomFlipped, onTurnSettled, artStyle, oneFaceFilm, zoomFlipRef, onZoomFlip, zoomCloseRef,
}: {
  /** The card's faces this render (`cardFace`): its styles, films, turn label and caption. */
  face: CardFace;
  preview: BrowseCard;
  zoomDraggedRef: React.RefObject<boolean>;
  closeZoom: () => void;
  zoomWashStyle: React.CSSProperties;
  zoomTiltRef: React.RefObject<HTMLDivElement | null>;
  zoomTurning: boolean;
  tiltHover: PointerHandler;
  tiltLeave: PointerHandler;
  zoomPressRef: React.RefObject<{ id: number; x: number; y: number; tilting: boolean } | null>;
  endZoomPress: PointerHandler;
  zoomFlipped: boolean;
  onTurnSettled: (e: React.TransitionEvent<HTMLDivElement>) => void;
  artStyle: React.CSSProperties;
  oneFaceFilm: React.ReactNode;
  zoomFlipRef: React.RefObject<HTMLButtonElement | null>;
  onZoomFlip: () => void;
  zoomCloseRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const { twoFaced, frontStyle, backStyle, frontFilm, backFilm, flipLabel, zoomCaption } = face;
  return (
    <div
      id={ZOOM_REGION}
      role="region"
      aria-label={cardZoomCopy.layerAria(printedNameOf(preview))}
      data-testid="card-zoom"
      // `inset-0` is the dialog's padding box, and above `md` the dialog also
      // draws a 1px border outside it. The layer cannot cover that strip: the
      // dialog is `overflow-hidden`, so a negative inset paints nothing and
      // receives nothing. A click on the hairline therefore hits the dialog and
      // does nothing at all — which is the right failure for a 1px target that
      // was never a dismissal path, and better than pretending otherwise.
      // THE ZOOM MATCHES THE VIEW BEHIND IT, AT EACH WIDTH (H22, Hugh's walk). Below
      // `md` that view is the phone's art header, so the zoom takes its ground and its
      // wash (below), opaque, and nothing of the page shows through. From `md` the
      // dialog draws no wash, so the zoom keeps the handoff's 94% scrim and its
      // backdrop blur (README:256). The blur needs no prefix: the utility emits the
      // WebKit declaration beside the standard one.
      className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden anim-zoom-in bg-[color:var(--surface-sunken)] md:bg-[color-mix(in_srgb,var(--bg)_94%,transparent)] md:backdrop-blur-[10px]"
      onClick={() => {
        // A press that tilted the card is not a tap on the layer.
        if (zoomDraggedRef.current) {
          zoomDraggedRef.current = false;
          return;
        }
        closeZoom();
      }}
      style={{
        // Shallow enough to be a turn rather than a lens (table row 4.2).
        perspective: "1400px",
      }}
    >
      {/* THE WASH, the phone header's own treatment (`mobile-art-wash`): the zoomed
          face's art, blurred, dimmed and scaled past its own edges so the blur has
          no transparent rim. The layer clips the overscale. Phone only, as that
          header is. */}
      <div
        aria-hidden
        data-testid="card-zoom-wash"
        className="pointer-events-none absolute inset-0 md:hidden"
        style={{
          ...zoomWashStyle,
          filter: "blur(22px)",
          transform: "scale(1.2)",
          opacity: 0.45,
        }}
      />
      {/* The whole card, at the largest 63/88 the rect allows — 372x520 desktop,
          318x444 phone. Clicking it closes too: three doors, one stage. */}
      <div className="relative flex flex-col items-center" data-testid="card-zoom-stage">
      {/* THE TILT HOST round the zoom card, which turns itself (desktop only, G5). A mouse or a pen tilts it on hover,
          as details does (README R2 "Desktop"); touch, which has no hover, tilts on a press that moves past the
          swipe's slop and closes nothing. Its own transform flattens, so it carries the perspective. */}
      <div
        ref={zoomTiltRef}
        data-testid="card-zoom-tilt"
        data-tilt="zoom"
        data-turning={zoomTurning && twoFaced ? "" : undefined}
        className="relative rounded-[13px] md:rounded-[14px]"
        style={{ perspective: "1400px" }}
        onPointerEnter={tiltHover}
        // A hovering pointer's leave only: a touch's tilt is ended by its own release (`endZoomPress`, by pointer
        // id), so a second finger leaving cannot drop the first finger's tilt.
        onPointerLeave={(e) => { if (tiltsOnHover(e.pointerType)) tiltLeave(e); }}
        onPointerDown={(e) => {
          // A hovering pointer is already tilting the card, and its click closes the zoom as any click does.
          if (tiltsOnHover(e.pointerType)) return;
          // One press at a time, as the sheet gesture does: a second finger would overwrite the first, whose
          // release or cancel is then ignored and leaves the card tilted with no gesture behind it.
          if (zoomPressRef.current) return;
          zoomPressRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, tilting: false };
          try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* already released */ }
        }}
        onPointerMove={(e) => {
          if (tiltsOnHover(e.pointerType)) { tiltHover(e); return; }
          const p = zoomPressRef.current;
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
          // ONE dimension is set and the ratio derives the other, because a
          // definite width AND a height cap is how an `aspect-ratio` box gets
          // squashed: once the cap bites, the width does not follow and the card
          // is drawn out of proportion. So the width is the smallest of the drawn
          // figure, what the viewport's width allows, and what its height allows
          // — 63/88 is 0.7159 — and the height is always the ratio's answer.
          //
          // The subtracted room is the caption, the ✕'s slot and the layer's own
          // breathing space; the desktop dialog is `min(620px, 85dvh)` tall, which
          // is what a landscape laptop can make shorter than the card.
          // The turn control sits UNDER the card now rather than on it, so a
          // two-faced card has to give back its 44px and the 12px above it.
          "--zoom-w": twoFaced
            ? "min(318px, calc(100vw - 32px), calc((100vh - 196px) * 0.7159))"
            : "min(318px, calc(100vw - 32px), calc((100vh - 140px) * 0.7159))",
          "--zoom-w-md": twoFaced
            ? "min(372px, calc((min(620px, 85dvh) - 128px) * 0.7159))"
            : "min(372px, calc((min(620px, 85dvh) - 72px) * 0.7159))",
          aspectRatio: "63/88",
          // A one-faced card is its own picture; a two-faced one draws both faces
          // inside and this box only turns them.
          ...(twoFaced ? null : artStyle),
          transformStyle: twoFaced ? "preserve-3d" : undefined,
          transform: twoFaced && zoomFlipped ? "rotateY(180deg)" : undefined,
          // The seam only: the drop shadow is the tilt host's, from the stylesheet (G3).
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
        } as React.CSSProperties}
      >
        {/* Two faces on one piece of card stock. Both are drawn, both hide their
            own back, and the card turns — so neither face is ever seen mirrored
            and the reader watches one object move rather than one picture being
            replaced by another. */}
        {twoFaced && (
          <CardFaces
            front={frontStyle}
            back={backStyle}
            frontFilm={frontFilm}
            backFilm={backFilm}
            radius="rounded-[13px] md:rounded-[14px]"
            // A shade darker than the art column's, because the shadow it
            // paints over is darker: `0 24px 60px rgba(0,0,0,.6)` against the
            // column's `.55`/`.5`.
            seam="inset 0 0 0 1px rgba(0,0,0,0.35)"
            testIdPrefix="card-zoom"
          />
        )}
        {oneFaceFilm}
      </div>
      </div>
      {/* OUTSIDE the box that turns. Inside it, the control rode the rotation:
          on the back face its corner became the opposite one and its glyph was
          drawn from behind, mirrored. It belongs to the zoom, not to either
          face. The press stops here too — the layer dismisses on click, and a
          control that turns the card is not one of the three doors out.

          UNDER the card rather than on it, matching the modal behind it: one
          placement for one control, and a card at hand size should not have a
          button printed across its bottom edge. */}
      {twoFaced && (
        <span
          onClick={(e) => e.stopPropagation()}
          className="mt-[12px] flex justify-center"
        >
          <FlipControl
            controlRef={zoomFlipRef}
            flipAria={flipLabel(!zoomFlipped)}
            onFlip={onZoomFlip}
            size={44}
          />
        </span>
      )}
      </div>
      {/* One mono line: which printing you are holding. Never the price — a card
          in your hand has none printed on it, and the tag is one dismissal away. */}
      {zoomCaption && (
        <p
          // One line, and one line's worth of room: a long set name on a narrow
          // phone would otherwise wrap under the card or run past the layer. The
          // end ellipsis is the same treatment every truncated name in this app
          // gets — the set code and number are the half that identifies the
          // printing, and they sit at the end where the ellipsis never eats them
          // first.
          // `relative` puts it over the wash, an absolute sibling that would otherwise
          // paint on top of an in-flow line. ON THE PLATE below `md`, where the wash
          // is, as the art-wash ratification defines it (the phone's price stack above):
          // over the wash a bare 11px line has nothing to be legible against, and a light
          // art read it at about 1.5:1. From `md` the scrim is its ground, as before.
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
        // The modal's shipped X in its shipped slot at both widths, gaining a
        // plate so it clears the scrim. Its label changes, its position does not.
        // The plate is what clears the scrim; the rest is the shipped ✕'s own
        // slot and size at each width.
        className="absolute flex items-center justify-center rounded-full top-[22px] right-[18px] md:right-[24px] w-[32px] md:w-[34px] h-[32px] md:h-[34px] text-[16px] md:text-[15px] bg-[color:var(--elevated)] border border-[color:var(--border-strong)] text-[color:var(--fg)]"
      >
        ✕
      </button>
    </div>
  );
}
