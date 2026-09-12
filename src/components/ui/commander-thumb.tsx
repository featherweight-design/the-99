import { ART_STRIPES, cssUrl } from "../../lib/collection/browse";
import { commanderGradient } from "../../lib/collection/gradients";

/**
 * A commander's card face at thumb size. Five renders each invented one of
 * these — the deck rail's phone spine, the create picker's candidate row and its
 * selected summary, the pre-filled flow's phone thumb and the partner slot — at
 * five geometries and three ring alphas, which is the drift this round exists to
 * end.
 *
 * Two sizes, and what decides is what the thumb is FOR rather than which screen
 * it lands on: a `row` thumb identifies one row among several you are choosing
 * between; a `summary` thumb stands for a choice already made.
 *
 * **The image is the card face, not `art_crop`.** The ban on the printed frame
 * exists because Magic's own name and type line land in the same band as our
 * labels — and a thumb carries no labels, so the reason does not reach here. The
 * two big card faces are exempt for the same reason from the other direction:
 * the player is meant to read the printing.
 */
export type ThumbSize = "row" | "summary";

const BOX: Record<ThumbSize, { width: number; height: number }> = {
  // 63/88 to within a pixel at both sizes: 44/62 is 0.710 and 64/89 is 0.719.
  row: { width: 44, height: 62 },
  summary: { width: 64, height: 89 },
};

/** One alpha, replacing three: `.35` on the partner slot, `.35` on the
    pre-filled thumb and `.3` on the two card faces. `.4` is `IdentityPips`' own
    value and is already reused by the progress bar's track, so the convergence
    is on a number the app already draws rather than on a fourth one. */
export const THUMB_RING = "inset 0 0 0 1px rgba(0,0,0,0.4)";

/** The ground under the art, which is the partner slot's own reasoning adopted:
    art is fetched, and a plate with nothing behind it flashes the card beneath
    through a 6px radius while it loads. */
const THUMB_GROUND = "var(--elevated)";

export function CommanderThumb({
  imageUri,
  colorIdentity,
  size = "row",
  className = "",
}: {
  imageUri: string | null;
  colorIdentity: string[];
  size?: ThumbSize;
  /** Layout only — the flex behaviour of whatever row this sits in. The box, the
      radius, the ring and the ground are not a caller's to set. */
  className?: string;
}) {
  const box = BOX[size];
  return (
    <span
      // Decorative at every call site: each row names its commander in text
      // beside the thumb, and a second name in the accessibility tree would read
      // it twice.
      aria-hidden
      // The marker a browser probe selects on. Shape is not enough to identify
      // one of these: `DecksZero`'s decorative card fan is a 63/88-ish div too,
      // and a probe matching on aspect alone reported those as commander thumbs
      // and failed them against a treatment they have nothing to do with.
      data-commander-thumb={size}
      className={`block shrink-0 rounded-[6px] ${className}`}
      style={{
        width: box.width,
        height: box.height,
        // `center top`, not `center`: the face is at the top of a card, and a
        // centred crop of a 63/88 frame at this size is mostly type box.
        background: imageUri
          ? `${cssUrl(imageUri)} center top/cover, ${THUMB_GROUND}`
          : // No art and no identity draws neither — the stripes, as every other
            // artless card in the app does. An identity is a real signal and
            // gets its gradient; an empty one is not, and a gradient invented
            // from nothing would say a colour the commander does not have.
            colorIdentity.length > 0
            ? commanderGradient(colorIdentity)
            : ART_STRIPES,
        boxShadow: THUMB_RING,
      }}
    />
  );
}
