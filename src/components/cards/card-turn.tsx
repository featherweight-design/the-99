import type { CSSProperties, Ref } from "react";
import type { FoilFinish } from "../../lib/collection/browse";
import { FoilFilm } from "../ui/foil-film";

/**
 * TWO FACES ON ONE PIECE OF CARD STOCK — both drawn, each hiding its own back —
 * for whichever box above is doing the turning.
 *
 * One component rather than two copies. The modal's art and the zoom turn the
 * same object by the same rule, and the rule is four properties that have to
 * agree: both faces absolutely filling the box, `backface-visibility: hidden` on
 * each, the back pre-rotated 180°, and each face carrying the seam itself —
 * they paint over the parent's inset ring, so without it the card loses its edge
 * on exactly the cards that have two of them.
 *
 * Only the radius and the seam's darkness differ per surface, because the shadow
 * each face paints over differs, so both are props. Everything else is the
 * construction, and a second copy of it is where the two would drift.
 */
/** The tilt's light (foil R2): one per face, after its film, drawn by the stylesheet as strong as the lift. */
export function Glare() {
  return <span aria-hidden data-glare="" className="pointer-events-none absolute inset-0 rounded-[inherit]" />;
}

export function CardFaces({
  front,
  back,
  frontFilm,
  backFilm,
  radius,
  seam,
  testIdPrefix,
}: {
  front: CSSProperties;
  back: CSSProperties;
  /** Each face's foil film (foil handoff R2): inside the face, so it turns with the stock and hides with its back. */
  frontFilm?: { finish: FoilFinish | undefined; src: string | null | undefined };
  backFilm?: { finish: FoilFinish | undefined; src: string | null | undefined };
  radius: string;
  seam: string;
  testIdPrefix: string;
}) {
  return (
    <>
      <div
        aria-hidden
        data-testid={`${testIdPrefix}-face-front`}
        className={`absolute inset-0 ${radius}`}
        style={{ ...front, backfaceVisibility: "hidden", boxShadow: seam }}
      >
        {frontFilm ? <FoilFilm {...frontFilm} size="large" /> : null}
        <Glare />
      </div>
      <div
        aria-hidden
        data-testid={`${testIdPrefix}-face-back`}
        className={`absolute inset-0 ${radius}`}
        style={{
          ...back,
          backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          boxShadow: seam,
        }}
      >
        {backFilm ? <FoilFilm {...backFilm} size="large" /> : null}
        <Glare />
      </div>
    </>
  );
}

/**
 * The modal's turn-over control (#363). It sits UNDER the card at every width and
 * on every surface — the modal's art column, the phone's art header, and the zoom
 * — between the zoom hint above it and the price below (#4).
 *
 * It used to sit ON the art, bottom-centre, which put a button across the bottom
 * edge of the picture the modal exists to show. Under the card it is still
 * unmistakably about the card and covers none of it, and one placement across
 * three mounts is what stops the modal and its zoom drawing the same control two
 * ways. It still cannot read as a sibling of Prev/Next: those page between cards
 * and live in the content column's footer, this turns one card over and lives
 * under the card.
 *
 * Its accessible name is the face it turns TO, never "flip" — the act is the
 * part the reader can already see, and the other face's name is the fact they
 * are reaching for.
 *
 * The drawn glyph is a turn arrow, not the `//` the row and the tile carry. One
 * notation across all three was the tidier idea and the wrong one: `//` is a
 * mark that says *this card has two faces*, and reading it as a control asks the
 * reader to infer an action from a statement. A button on the art has to say
 * what pressing it does, and every app that turns a card over draws an arrow
 * going round.
 */
export function FlipControl({
  flipAria, onFlip, size, controlRef,
}: {
  /**
   * Built by the caller, because what the label can say depends on the printing:
   * the other face's NAME where the two differ, and the side where one name is
   * printed on both (`twoFacedCopy.flipToSideAria`).
   */
  flipAria: string;
  onFlip: () => void;
  /** 44 on the phone's art header and inside the zoom, 32 in the desktop art column. */
  size: number;
  /** The zoom passes one so it can hand focus to the turn on open. */
  controlRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={controlRef}
      type="button"
      onClick={onFlip}
      aria-label={flipAria}
      // The ground is a scrim rather than a solid: the control has to stay
      // legible over whatever art is under it without hiding a square of the card.
      // In normal flow now that it is under the card; the stack around it centres
      // it. The ground stays the scrim it drew over art — the phone's stack sits on
      // the blurred wash, so a transparent control would still have to survive
      // whatever crop is behind it.
      className="flex flex-none items-center justify-center cursor-pointer bg-[color-mix(in_oklab,var(--bg)_86%,transparent)] border border-[color:var(--border-strong)] text-[color:var(--fg)]"
      style={{ width: size, height: size, borderRadius: 7 }}
    >
      <TurnOverIcon size={Math.round(size * 0.5)} />
    </button>
  );
}

/**
 * The turn arrow: a circle open at the top with a head on the rising end, in the
 * same `currentColor` stroke shape as `SearchIcon` so the two read as one set.
 * The gap sits at the top because the head has to be somewhere the eye lands
 * first, and at 17px a head on the underside of the circle is a smudge.
 */
export function TurnOverIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6.5 5.1A6 6 0 1 0 13.5 5.1" />
      <path d="m13.5 5.1 .31 2.6M13.5 5.1l2.55 .6" />
    </svg>
  );
}
