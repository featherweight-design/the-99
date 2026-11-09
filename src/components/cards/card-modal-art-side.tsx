"use client";
// The card modal's art side: the upper half of what `CardModal` draws inside its dialog. Pure and
// props-only (the landing's demo draws it from fixture data): every value, ref and handler is
// CardModal's, handed in; nothing here reads a reader, a store or an action.

import React, { type ReactNode } from "react";
import { ArtLayer } from "../ui/art-layer";
import { identityGradient } from "../../lib/cards/gradients";
import { cardCarouselCopy, cardSheetCopy } from "../../lib/copy/card-carousel";
import { cardZoomCopy } from "../../lib/copy/card-surfaces";
import { printedNameOf, type BrowseCard } from "../../lib/collection/browse";
import { FlipControl } from "./card-turn";
import { SHEET } from "./card-sheet-gesture";
import type { SiblingCard } from "./card-detail-context";


/**
 * The art column's own padding (28px, matching its other three edges).
 */
const ART_COLUMN_FOOT_PADDING_PX = 28;

/**
 * How much the art width formula's `calc()` subtracts: the stack's own height, doubled (equal
 * slack above and below the art), plus the column's 28px foot padding on both sides of that
 * doubling (one for the padding the bottom half must still show, one because shrinking the art
 * only buys back half of it on each side — see the derivation at the call site).
 *
 * Exported and pure so a test can assert the wiring directly, without parsing a rendered
 * `calc()` string back out of jsdom's style attribute: jsdom drops this property rather than
 * retain a value in a syntax it cannot parse.
 */
export function artWidthReservePx(underCardHeight: number): number {
  return 2 * underCardHeight + ART_COLUMN_FOOT_PADDING_PX * 2;
}


/**
 * A neighbor's ground: its identity, else a bare plate (README "Notes" §2). Its art, when it has one, is an
 * `ArtLayer` over this ground, so the plate shows while the art travels and the art fades in on landing.
 */
export function siblingGround(sibling: SiblingCard): React.CSSProperties {
  return sibling.colorIdentity
    ? { background: identityGradient([...sibling.colorIdentity]) }
    : { background: "var(--elevated)" };
}

/**
 * A neighbor's foil film (foil handoff R2, G10): R1's TILE film, still (`data-foil-still`), drawn AFTER the art's
 * `ArtLayer` so it reads that layer's own arrival mark through the sibling rule
 * (`[data-arrival="pending"] ~ [data-foil]`): the layer is queued in the modal's `ArrivalOrder`, and a neighbor whose
 * bytes landed but whose fade still waits its turn shows no film over its bare plate. No preload of its own. Only
 * over the neighbor's own art, so never over its identity plate.
 */
export function SiblingFilm({ sibling }: { sibling: SiblingCard }) {
  if (!sibling.imageUri || !sibling.foil) return null;
  return (
    <span
      aria-hidden
      data-testid="sibling-foil-film"
      data-foil={sibling.foil}
      data-foil-still=""
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
    />
  );
}

/**
 * A phone peek (carousel R2, `PhoneHero.dc.html`): the neighbor at 236/320 of the card's width and
 * opacity .5, 12px off the card and centred on it, cut by the screen edge. Read against the
 * band's `--card-w`, so a smaller card (a short screen, a stacked sheet) brings its peeks with it.
 * A button, so a tap pages and a reader can reach it; the band's drag handling cancels the press
 * when the touch became a swipe.
 */
const PhonePeek = React.forwardRef<
  HTMLButtonElement,
  {
    sibling: SiblingCard;
    direction: "previous" | "next";
    onPress: () => void;
    covered: boolean;
    /** The card just left, on a page: it shrinks into this peek from where it stood (`--enter-*`). */
    enter: React.CSSProperties | null;
    /** The face it was showing as the card, kept until the shrink lands. */
    enterFace: string | null;
  }
>(function PhonePeek({ sibling, direction, onPress, covered, enter, enterFace }, ref) {
  const [landed, setLanded] = React.useState(false);
  const left = direction === "previous"
    ? "calc(50% - var(--card-w) / 2 - 12px - var(--card-w) * 0.7375)"
    : "calc(50% + var(--card-w) / 2 + 12px)";
  return (
    <button
      ref={ref}
      type="button"
      data-testid={direction === "previous" ? "phone-peek-prev" : "phone-peek-next"}
      // Withheld with paging under the full sheet, which covers it.
      inert={covered}
      onClick={onPress}
      // Its own shrink only: the art's arrival fade inside it bubbles here too.
      onAnimationEnd={enter ? (e) => { if (e.target === e.currentTarget) setLanded(true); } : undefined}
      aria-label={cardCarouselCopy.neighborAria(direction, sibling.name)}
      // `phone-peek` holds its .5 opacity; `swipe-in-*` grows and lights it as a swipe brings it in.
      className={"card-grow phone-peek absolute overflow-hidden rounded-[11px] cursor-pointer border-0 p-0 "
        + (direction === "previous" ? "swipe-in-prev" : "swipe-in-next")
        + (enter ? " anim-phone-peek-enter" : "")}
      style={{
        ...enter,
        left,
        // (447 - 330) / 2 at the drawn size: the gap between the two heights, halved, as a share
        // of the card's width (88/63 x 0.2625 / 2). From the card's own top, which the min snap
        // moves down to centre the grown card.
        top: "calc(var(--card-top) + var(--card-w) * 0.18333)",
        width: "calc(var(--card-w) * 0.7375)",
        aspectRatio: "63/88",
        ...siblingGround(sibling),
        boxShadow: "0 16px 36px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.3)",
      }}
    >
      {sibling.imageUri ? <ArtLayer src={sibling.imageUri} style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.3)" }} /> : null}
      {/* Hidden under reduced motion, where no shrink runs and so no end would ever take it away. Under the
          film, so the card's finish stays on it through the shrink. */}
      {enter && enterFace && !landed ? (
        <span className="peek-enter-face absolute inset-0 rounded-[inherit]">
          <ArtLayer src={enterFace} style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.3)" }} />
        </span>
      ) : null}
      <SiblingFilm sibling={sibling} />
    </button>
  );
});

export type CardModalArtSideProps = {
  artStyle: React.CSSProperties;
  /** The card as shown (its printing's name labels the zoom trigger). */
  preview: BrowseCard;
  oneFaceFilm: ReactNode;
  turningArt: (radius: string) => ReactNode;
  turningAttr: "" | undefined;
  twoFaced: boolean;
  showingBack: boolean;
  flipLabel: (toBack: boolean) => string;
  onFlip: () => void;
  underCard: ReactNode;
  underCardHeight: number;
  door: ((layout: "art" | "strip") => ReactNode) | null;
  narrow: boolean;
  min: boolean;
  full: boolean;
  zoomed: boolean;
  viewOpen: boolean;
  teaserHeight: number;
  bandRef: React.Ref<HTMLDivElement>;
  stageRef: React.Ref<HTMLDivElement>;
  onBandPointerDown: React.PointerEventHandler<HTMLDivElement>;
  prevSibling: SiblingCard | null;
  nextSibling: SiblingCard | null;
  onPrevPeek: ((face: string | null) => void) | null;
  onNextPeek: ((face: string | null) => void) | null;
  prevPhonePeekRef: React.Ref<HTMLButtonElement>;
  nextPhonePeekRef: React.Ref<HTMLButtonElement>;
  leftFace: string | null;
  enteredLeftFace: string | null;
  enteredFrom: "prev" | "next" | "prevPeek" | "nextPeek" | null;
  /** Where a swipe left the band, and how far its peek had grown (px, 0 to 1): the entrance starts there. */
  enteredOffset: number;
  enteredProgress: number;
  phoneTiltRef: React.Ref<HTMLDivElement>;
  total: number;
  position: number;
  phoneBack: string | null;
  /** Files the ✕ (or back pill) at its slot in the focus list; CardModal owns the list. */
  registerCloseRef: (slot: number, el: HTMLButtonElement | null) => void;
  onClose: () => void;
  desktopTiltRef: React.Ref<HTMLDivElement>;
  tiltHover: React.PointerEventHandler<HTMLDivElement>;
  tiltLeave: React.PointerEventHandler<HTMLDivElement>;
  registerZoomTriggerRef: (slot: number, el: HTMLButtonElement | null) => void;
  openZoom: () => void;
  zoomRegion: string;
};

export function CardModalArtSide({
  artStyle, preview, oneFaceFilm, turningArt, turningAttr, twoFaced, showingBack, flipLabel, onFlip,
  underCard, underCardHeight, door, narrow, min, full, zoomed, viewOpen, teaserHeight,
  bandRef, stageRef, onBandPointerDown, prevSibling, nextSibling, onPrevPeek, onNextPeek,
  prevPhonePeekRef, nextPhonePeekRef, leftFace, enteredLeftFace, enteredFrom,
  enteredOffset, enteredProgress, phoneTiltRef, total, position, phoneBack, registerCloseRef, onClose,
  desktopTiltRef, tiltHover, tiltLeave, registerZoomTriggerRef, openZoom, zoomRegion,
}: CardModalArtSideProps) {

  // THE PHONE'S ENTRANCE (STATES §Motion, "Phone commit"): a paged card arrives from where its
  // peek stood, at the peek's scale and opacity, plus wherever a swipe left the band, and settles
  // after the beat, in `--motion-duration`. Centre to centre is half the card, the 12px gap and half the peek (0.86875 of the
  // card's own width, plus 12). Reduced motion draws it in place (`globals.css`).
  const phoneEnterX = enteredFrom === "next" || enteredFrom === "nextPeek"
    ? `calc(86.875% + 12px + ${enteredOffset}px)`
    : enteredFrom === "prev" || enteredFrom === "prevPeek"
    ? `calc(-86.875% - 12px + ${enteredOffset}px)`
    : null;
  // ...and the swap is one motion, not a slide and a snap (Hugh, 2026-10-28): the arriving card
  // starts at the size and opacity the swipe had grown its peek to, and the card being left (now
  // the peek on the side the reader came from) shrinks on from where the finger let it go, its
  // centre the band's offset from the screen's. A tap or a key is a swipe of 0: the card left
  // behind starts at full size, centred. Scales are of each element's own box (the peek is 0.7375
  // of the card). Reduced motion draws both in place (`globals.css`).
  const leftPeek = enteredFrom === "next" || enteredFrom === "nextPeek" ? "prev"
    : enteredFrom === "prev" || enteredFrom === "prevPeek" ? "next"
    : null;
  const phoneEnterVars = phoneEnterX === null ? null : ({
    "--enter-x": phoneEnterX,
    "--enter-scale": String(0.7375 + 0.2625 * enteredProgress),
    "--enter-opacity": String(0.5 + 0.5 * enteredProgress),
  } as React.CSSProperties);
  const leftPeekVars = leftPeek === null ? null : ({
    "--enter-x": `calc(${leftPeek === "prev" ? "" : "-"}1 * (var(--card-w) * 0.86875 + 12px) + ${enteredOffset}px)`,
    "--enter-scale": String((1 - 0.2625 * enteredProgress) / 0.7375),
    "--enter-opacity": String(1 - 0.5 * enteredProgress),
  } as React.CSSProperties);

  return (
    <>
    {/* PHONE, CARD FIRST (carousel R2, `PhoneHero.dc.html`). The art washes the whole screen;
        the card sits at y 64 in a band that ends where the teaser begins, between its two
        neighbors at .5; the counter and the ✕ ride the wash's top corners; and the sheet (the
        content column, at this width) rises over the band to y 64 when full. The 180px art
        header, its 72px compact form and the phone zoom all retire: a 320px card is already
        the zoom's 318. */}
    <div
      aria-hidden
      data-testid="mobile-art-wash"
      className="md:hidden pointer-events-none absolute inset-0 z-0"
      style={{ ...artStyle, filter: "blur(28px)", transform: "scale(1.25)", opacity: 0.55 }}
    />
    <div
      aria-hidden
      className="md:hidden pointer-events-none absolute inset-0 z-0"
      style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.45) 100%)" }}
    />
    {/* The band pages under a horizontal drag and moves the sheet under a vertical one, so it
        takes every touch itself (`touch-none`): nothing in it scrolls. Its height is what the
        card is sized from — `100cqh` is the band — so a taller teaser (a door, a footer) or a
        shorter, stacked dialog gives the card less room rather than covering it. */}
    <div
      ref={bandRef}
      inert={zoomed || viewOpen}
      data-testid="card-band"
      onPointerDown={narrow ? onBandPointerDown : undefined}
      data-snap={min ? "min" : full ? "full" : "teaser"}
      className="md:hidden band-dim absolute inset-x-0 top-0 z-[1] touch-none [container-type:size]"
      style={{ height: `calc(100% - ${min ? SHEET.minHeight : teaserHeight}px)`, opacity: full ? 0.35 : 1 }}
    >
      <div
        ref={stageRef}
        className="absolute inset-0"
        // Card width = min(320px, (100dvh - 85px - 280px) x 0.7159) (README R2 "Sizing"): 85 is
        // the 64 above the card and 21 below it, and the band already ends at the teaser. At the
        // min snap the band runs to the shelf and the 320 cap lifts to the band's width less a
        // 16px gutter each side (Hugh, 2026-10-13).
        // A drag between the teaser and min writes `--card-w-drag` and `--card-top-drag` here,
        // so the card grows with the finger (Hugh, 2026-10-13); on release they go and the
        // snap's own values below take over, eased by `card-grow`.
        style={{
          "--card-w": min
            ? "var(--card-w-drag, min(calc(100cqw - 32px), calc((100cqh - 85px) * 0.7159)))"
            : "var(--card-w-drag, min(320px, calc((100cqh - 85px) * 0.7159)))",
          // At the min snap the grown card sits in the middle of the band, never above y 64.
          // The peeks read it too, so they stay level with the card.
          "--card-top": min
            ? "var(--card-top-drag, max(64px, calc((100cqh - var(--card-w) * 88 / 63) / 2)))"
            : "var(--card-top-drag, 64px)",
        } as React.CSSProperties}
      >
        {narrow && prevSibling && onPrevPeek ? (
          <PhonePeek ref={prevPhonePeekRef} sibling={prevSibling} direction="previous" onPress={() => onPrevPeek(leftFace)} covered={full} enter={leftPeek === "prev" ? leftPeekVars : null} enterFace={enteredLeftFace} />
        ) : null}
        <div
          // Under the full sheet the card and its turn plate are covered, and paging is
          // withheld there: inert, so neither Tab nor a screen reader reaches what the reader
          // cannot see. The band itself stays live for the tap that returns to the teaser.
          inert={full}
          data-testid="modal-art-mobile"
          className={"card-grow swipe-out absolute rounded-[14px]" + (phoneEnterX !== null ? " anim-phone-card-enter" : "")}
          style={{
            top: "var(--card-top)",
            left: "calc(50% - var(--card-w) / 2)",
            width: "var(--card-w)",
            aspectRatio: "63/88",
            ...phoneEnterVars,
          }}
        >
          {/* THE TILT HOST (foil R2, G2): inside, as the entry animation owns this box's `transform`. Its shadow is
              the stylesheet's (G3); the hold that lifts it is the sheet gesture's (G13). */}
          <div
            ref={phoneTiltRef}
            data-testid="modal-art-mobile-tilt"
            data-tilt=""
            data-tilt-seam={twoFaced ? undefined : ""}
            data-turning={turningAttr}
            className="absolute inset-0 rounded-[14px]"
            style={{ perspective: "1400px", ...(twoFaced ? null : artStyle) }}
          >
            {turningArt("rounded-[14px]")}
            {oneFaceFilm}
          </div>
          {/* The turn plate, centred along the card's bottom and 10px up: the
              bottom-right corner it sat in covered the power/toughness box. OUTSIDE the box
              that turns, for the reason the desktop's is. */}
          {twoFaced && (
            <span className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 10 }}>
              <FlipControl flipAria={flipLabel(!showingBack)} onFlip={onFlip} size={44} />
            </span>
          )}
        </div>
        {narrow && nextSibling && onNextPeek ? (
          <PhonePeek ref={nextPhonePeekRef} sibling={nextSibling} direction="next" onPress={() => onNextPeek(leftFace)} covered={full} enter={leftPeek === "next" ? leftPeekVars : null} enterFace={enteredLeftFace} />
        ) : null}
      </div>
    </div>
    {/* One / two (decision 6): a list of one draws no counter. Off the band, so it stays put
        while the band slides, and above the sheet, which stops at y 64 below it. */}
    {total > 1 ? (
      <div
        data-testid="modal-counter-mobile"
        className="md:hidden absolute z-[3] flex items-center rounded-[16px] font-mono text-[11px]"
        style={{
          top: 22,
          left: 18,
          height: 32,
          padding: "0 12px",
          background: "color-mix(in oklab, var(--bg) 55%, transparent)",
          color: "var(--fg-body)",
        }}
      >
        {cardCarouselCopy.position(position, total)}
      </div>
    ) : null}
    {phoneBack ? (
      // STACKED OVER A SHEET (stacked sheets R1, calls 2 and 3): the ✕'s slot holds the way back,
      // `← {sheet}` on the counter's plate, and no ✕ beside it, one control for one layer. It caps
      // at 266 beside the counter and 354 without, and an invisible 44px band (y 16 to 60) makes
      // the 32px plate a full-height target.
      <button
        type="button"
        // Slot 0 of CardModal's `closeRefs` (the phone's ✕ or back pill); the desktop's is slot 1 in its content column.
        ref={(el) => { registerCloseRef(0, el); }}
        inert={zoomed || viewOpen}
        onClick={onClose}
        aria-label={cardSheetCopy.back.a11y(phoneBack)}
        data-testid="card-modal-back-mobile"
        className={
          "md:hidden absolute z-[3] flex items-center gap-[6px] h-[32px] px-[12px] rounded-full cursor-pointer border-0"
          + " bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] text-[13px] font-medium text-[color:var(--fg)]"
          + " before:absolute before:inset-x-0 before:-inset-y-[6px] before:content-['']"
          + " transition-transform active:scale-[.97] active:bg-[color-mix(in_oklab,var(--fg)_16%,color-mix(in_oklab,var(--bg)_55%,transparent))]"
          + " focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] focus-visible:[outline-style:solid]"
          // 266 and 354 are the 390 frame's; on a narrower phone the cap also keeps clear of the
          // counter's plate (its right edge near 88 at 360 with two digits) and an 18px gutter.
          + (total > 1 ? " max-w-[min(266px,calc(100%-114px))]" : " max-w-[min(354px,calc(100%-36px))]")
        }
        style={{ top: 22, right: 18 }}
      >
        <span aria-hidden="true" className="flex-none text-[color:var(--fg-muted)]">←</span>
        <span className="min-w-0 truncate">{phoneBack}</span>
      </button>
    ) : (
      <button
        type="button"
        // Slot 0 of CardModal's `closeRefs` (the phone's ✕ or back pill); the desktop's is slot 1 in its content column.
        ref={(el) => { registerCloseRef(0, el); }}
        // Inert under the zoom with everything else it would otherwise sit beside in the focus
        // trap. The zoom opens only from the desktop's art, where this is not drawn, but a
        // window narrowed with the zoom up would otherwise leave it reachable.
        inert={zoomed || viewOpen}
        onClick={onClose}
        aria-label="Close card details"
        // §Mobile: Art Close Button
        // The 32px plate drawn; a pseudo-element 6px past each edge takes its hit to 44px, as the back pill's does vertically.
        className="md:hidden absolute z-[3] rounded-full flex items-center justify-center bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] text-[color:var(--fg)] before:absolute before:-inset-[6px] before:content-['']"
        style={{ top: 22, right: 18, width: 32, height: 32, fontSize: 16 }}
      >
        ✕
      </button>
    )}

    {/* DESKTOP art column — §Desktop: Art Column: 320px, padding 28px, bg --bg */}
    {/* Live beside Find a deck's view, which sits to its right (md:left-[320px]): the art still says Click to
        zoom, so it zooms, and closing the zoom lands back on the view as it was (Hugh, 2026-10-12). */}
    <div
      inert={zoomed}
      className="hidden md:flex items-center justify-center flex-none"
      style={{ width: 320, padding: 28, background: "var(--bg)" }}
    >
      <div
        data-testid="modal-art-desktop"
        className={
          "relative rounded-[12px]"
          + (enteredFrom === "prev" || enteredFrom === "prevPeek" ? " anim-carousel-prev"
            : enteredFrom === "next" || enteredFrom === "nextPeek" ? " anim-carousel-next"
            : "")
        }
        style={{
          // THE ART GIVES BACK WHAT THE STACK NEEDS, rather than the stack
          // hanging off a fixed-size box and being clipped by the dialog's
          // `overflow-hidden`.
          //
          // The column's `items-center` centres the ART'S OWN BOX within the
          // column's CONTENT box — the box left after its own 28px padding
          // (top and bottom, 56 total) is already subtracted. The stack hangs
          // off the art via `position: absolute`, deliberately outside normal
          // flow (so the art never moves when a door appears or a pick changes
          // the caption), which means flex centring never sees it, and it sits
          // in the BOTTOM half of that content box's slack. Found by a Hugh
          // walk, reproduced by measuring the real DOM: the stack ate into the
          // column's own 28px padding instead of fitting inside the content
          // box ahead of it, down to an 11px gap where the other three edges
          // show 28.
          //
          //   innerH = min(620px, 85dvh) - 2px - 56px   (content box height)
          //   (innerH - artH) / 2 >= stack             (bottom slack holds it)
          //
          // Solving for the height gives `artH <= innerH - 2 * stack`, i.e.
          // `min(620px, 85dvh) - 2px - 56px - 2 * stack` — the column's own
          // padding (56, once) already removed from `innerH`, plus the stack
          // doubled because shrinking the art by any amount only buys back
          // HALF of it on each side. The defect this replaces used the full
          // `min(620px, 85dvh) - 2px` as if it were the content box, so the
          // column's own padding was never subtracted and the stack could
          // finish exactly on the column's outer edge.
          //
          // ONE dimension is set and the ratio derives the other, the zoom's
          // own rule: a definite width AND a height cap is how an
          // `aspect-ratio` box gets squashed. 63/88 is 0.7159, so the art is
          // 264px wherever there is room and narrower only where a tall stack
          // (the door, say) needs the column to give some back.
          // The extra 2px is the dialog's own 1px border, top and bottom: the
          // box-sizing is border-box, so `h-[620px]` is 618px of padding box —
          // the height the column actually stretches to.
          width: `min(264px, calc((min(620px, 85dvh) - 2px - ${artWidthReservePx(underCardHeight)}px) * 0.7159))`,
          aspectRatio: "63/88",
        }}
      >
        {/* THE TILT HOST (foil R2, G1): the art alone, clear of the stack below and of the paging animation's
            `transform`. Its shadow is the stylesheet's (G3). The trigger is its direct child, so focus on it plays
            R1's one band (G6). */}
        <div
          ref={desktopTiltRef}
          data-testid="modal-art-desktop-tilt"
          data-tilt=""
          data-tilt-seam={twoFaced ? undefined : ""}
          data-turning={turningAttr}
          onPointerEnter={tiltHover}
          onPointerMove={tiltHover}
          onPointerLeave={tiltLeave}
          className="absolute inset-0 rounded-[12px]"
          style={{ perspective: "1400px", ...(twoFaced ? null : artStyle) }}
        >
          {turningArt("rounded-[12px]")}
          {oneFaceFilm}
          {/* Same trigger at this width, stretched over the art and outside the box
              that turns — on the back face it would otherwise be facing away. */}
          <button
            type="button"
            // Slot 1 of CardModal's `zoomTriggerRefs` (the desktop art's trigger); keep the slot in step with CardModal's list.
            ref={(el) => { registerZoomTriggerRef(1, el); }}
            onClick={openZoom}
            aria-label={cardZoomCopy.zoomAria(printedNameOf(preview))}
            aria-expanded={zoomed}
            aria-controls={zoomed ? zoomRegion : undefined}
            className="absolute inset-0 rounded-[12px] cursor-pointer bg-transparent border-0 p-0"
          />
        </div>
        {/* Hint, turn, price — 10px under the art and centred on the card (table
            row 1.1). Hung off the art's own box rather than added to the column,
            because the column centres its children: a stack joining it would lift
            the art by half its height, and row 1.14 says nothing above the tag
            moves when a pick makes it appear.

            The gap is 6px rather than the phone's 8: the column leaves ~97px under
            a 264px card at the drawn dialog height, and three rows plus the turn
            control have to live inside it. */}
        <div
          data-testid="modal-under-card"
          className="absolute top-full left-1/2 mt-[10px] flex -translate-x-1/2 flex-col items-center gap-[6px] whitespace-nowrap"
        >
          {underCard}
          {door ? <div className="mt-[8px]">{door("art")}</div> : null}
        </div>
      </div>
    </div>
    </>
  );
}
