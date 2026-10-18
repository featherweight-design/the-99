"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";

import { identityGradient } from "../../lib/cards/gradients";
import { publicPagesCopy } from "../../lib/copy/public-pages";
import { twoFacedCopy } from "../../lib/copy/card-surfaces";
import { CardFaces, FlipControl, Glare } from "../cards/card-turn";
import { dropTilt, liftTilt, tiltsOnHover } from "../cards/card-tilt";

const c = publicPagesCopy.card;

const cssUrl = (uri: string) => `url("${encodeURI(uri).replaceAll('"', "%22")}")`;
const art = (uri: string): CSSProperties => ({ backgroundImage: cssUrl(uri), backgroundSize: "cover", backgroundPosition: "center" });

/**
 * The card box, always 63/88. The card page's: 272 by 380 on the phone, 336 by 469 from `md`, 14px radius (A1 to A4). The
 * commander page draws it a little smaller on the phone and larger from `md`: 248 by 346 at 13px, then 344 by 481 at 14px
 * (B1 to B4).
 */
const BOXES = {
  card: "relative w-[272px] h-[380px] md:w-[336px] md:h-[469px] flex-none rounded-[14px]",
  commander: "relative w-[248px] h-[346px] md:w-[344px] md:h-[481px] flex-none rounded-[13px] md:rounded-[14px]",
} as const;
const RADII = { card: "rounded-[14px]", commander: "rounded-[13px] md:rounded-[14px]" } as const;

/**
 * The public card page's card (A1 to A4, README call 2): the image with card details' hover tilt, the identity gradient
 * when the catalog has no image (no caption, nothing stood in), and the SHIPPED flip for a card with a back image: the
 * 44px turn control under the card at both widths, with a mono `Front` / `Back` caption. Both faces' text is on the page,
 * so the flip is personality, not a gate.
 *
 * Client only for the turn and the tilt; it reads nothing but its props.
 */
export function PublicCardArt({
  name,
  faces,
  imageUri,
  backImageUri,
  colorIdentity,
  printing,
  size = "card",
}: {
  name: string;
  faces: { name: string }[];
  imageUri: string | null;
  backImageUri: string | null;
  colorIdentity: string[];
  /** The pictured printing as `SOC · 8`, or null when nothing is pictured. */
  printing: string | null;
  /** Which page's box (`BOXES`). */
  size?: keyof typeof BOXES;
}) {
  const BOX = BOXES[size];
  const [flipped, setFlipped] = useState(false);
  const [turning, setTurning] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const tiltRef = useRef<HTMLDivElement>(null);

  if (!imageUri) {
    return (
      <div
        role="img"
        aria-label={c.noImage}
        data-testid="public-card-noimage"
        className={BOX}
        data-tilt=""
        data-tilt-seam=""
        style={{ background: identityGradient(colorIdentity) }}
      />
    );
  }

  const twoFaced = backImageUri !== null;
  const front = faces[0]?.name ?? name;
  const back = faces[1]?.name ?? front;
  const oneName = front === back;
  const turnLabel = (toBack: boolean) =>
    oneName ? twoFacedCopy.flipToSideAria(toBack ? "back" : "front") : twoFacedCopy.flipToAria(toBack ? back : front);
  const shownLabel = (onBack: boolean) =>
    oneName ? twoFacedCopy.flippedSideAria(onBack ? "back" : "front") : twoFacedCopy.flippedAria(onBack ? back : front);

  const hover = (e: PointerEvent<HTMLDivElement>) => {
    if (tiltsOnHover(e.pointerType)) liftTilt(e.currentTarget, e.clientX, e.clientY);
  };
  const leave = (e: PointerEvent<HTMLDivElement>) => dropTilt(e.currentTarget);

  function onFlip() {
    const next = !flipped;
    setFlipped(next);
    // The inline tilt values come off, or they would beat the turn's flat centre (card details' G4).
    dropTilt(tiltRef.current);
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) setAnnouncement(shownLabel(next));
    else setTurning(true);
  }

  return (
    <>
      <div
        ref={tiltRef}
        data-testid="public-card-art"
        data-tilt=""
        data-tilt-seam={twoFaced ? undefined : ""}
        data-turning={turning && twoFaced ? "" : undefined}
        onPointerEnter={hover}
        onPointerMove={hover}
        onPointerLeave={leave}
        className={BOX}
        role="img"
        aria-label={name}
        style={{ perspective: "1400px", ...(twoFaced ? null : art(imageUri)) }}
      >
        {twoFaced ? (
          <div
            aria-hidden
            data-testid="public-card-turn"
            data-face={flipped ? "back" : "front"}
            className={`absolute inset-0 ${RADII[size]} anim-card-turn`}
            onTransitionEnd={(e) => {
              if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
              setTurning(false);
              setAnnouncement(shownLabel(flipped));
            }}
            style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : undefined }}
          >
            <CardFaces
              front={art(imageUri)}
              back={art(backImageUri)}
              radius={RADII[size]}
              seam="inset 0 0 0 1px rgba(0,0,0,0.3)"
              testIdPrefix="public-card"
            />
          </div>
        ) : (
          <Glare />
        )}
      </div>
      {twoFaced ? (
        <div className="mt-[14px] md:mt-0 flex items-center justify-center gap-[10px] md:gap-[12px]">
          <FlipControl flipAria={turnLabel(!flipped)} onFlip={onFlip} size={44} />
          <span data-testid="public-card-side" className="font-mono text-[11px] text-[color:var(--fg-muted)]">
            {flipped ? c.back : c.front}
            {printing ? <span className="hidden md:inline">{` · ${printing}`}</span> : null}
          </span>
          <span className="sr-only" aria-live="polite">{announcement}</span>
        </div>
      ) : printing ? (
        <p data-testid="public-card-printing" className="m-0 mt-[14px] md:mt-0 text-center font-mono text-[11px] text-[color:var(--fg-muted)]">
          {printing}
        </p>
      ) : null}
    </>
  );
}
