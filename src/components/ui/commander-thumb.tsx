import { ART_STRIPES } from "../../lib/collection/browse";
import { commanderGradient } from "../../lib/collection/gradients";
import { HydratedImg } from "./hydrated-art";
import { ArtLayer } from "./art-layer";

/**
 * A commander's card face at thumb size. Five renders each invented one of
 * these — the deck rail's phone spine, the create picker's candidate row and its
 * selected summary, the pre-filled flow's phone thumb and the partner slot — at
 * five geometries and three ring alphas, which is the drift this round exists to
 * end.
 *
 * What decides the size is what the thumb is FOR rather than which screen it
 * lands on: a `row` thumb identifies one row among several you are choosing
 * between; a `summary` thumb stands for a choice already made. `result` is the
 * row's job in Help me choose's longer list, which its handoff draws a step
 * smaller.
 *
 * **The image is the card face, not `art_crop`.** The ban on the printed frame
 * exists because Magic's own name and type line land in the same band as our
 * labels — and a thumb carries no labels, so the reason does not reach here. The
 * two big card faces are exempt for the same reason from the other direction:
 * the player is meant to read the printing.
 */
export type ThumbSize = "row" | "summary" | "result" | "list" | "open" | "openWide";

/** `[]` is COLORLESS — a real identity, and what `commanderGradient` answers with
    the colorless gradient both card faces draw. `null` is "we do not know", which
    is the case B6 rules draws no wash at all, and the stripes are what an artless
    card with nothing to say about its colours draws everywhere else in the app.
    The two are different facts and the prop distinguishes them, because a
    `string[]` alone cannot: routing `[]` to the stripes gives every colorless
    commander a treatment its own card face does not use, and routing an unknown
    identity to `commanderGradient` invents a colour for it. */
export type ThumbIdentity = string[] | null;

const BOX: Record<ThumbSize, { width: number; height: number; radius: string }> = {
  // 63/88 to within a pixel at every size: 44/62 is 0.710, 64/89 is 0.719 and 40/56 is 0.714.
  row: { width: 44, height: 62, radius: "rounded-[6px]" },
  summary: { width: 64, height: 89, radius: "rounded-[6px]" },
  // Help me choose's result rows (its handoff's §5): one row among many, a step smaller.
  result: { width: 40, height: 56, radius: "rounded-[5px]" },
  // The precon list's rows (its handoff's PreconRow): a long list of decklists, smaller again.
  list: { width: 34, height: 48, radius: "rounded-[4px]" },
  // An open precon's header (its handoff's O1): 46/64 is 0.719 and 56/78 is 0.718. Two sizes,
  // because the box is inline: the page draws one below md and the other from md.
  open: { width: 46, height: 64, radius: "rounded-[6px]" },
  openWide: { width: 56, height: 78, radius: "rounded-[6px]" },
};

/** The ring every commander's card art carries, at whatever size — the two thumb
    boxes and both full card faces, which is why it is not named for the thumb.
    One alpha replacing three: `.35` on the partner slot, `.35` on the pre-filled
    thumb and `.3` on the two faces. `.4` is `IdentityPips`' own value and is
    already reused by the progress bar's track, so the convergence is on a number
    the app draws rather than on a fourth one. */
export const CARD_ART_RING = "inset 0 0 0 1px rgba(0,0,0,0.4)";

/** The ground under the art, which is the partner slot's own reasoning adopted:
    art is fetched, and a plate with nothing behind it flashes the card beneath
    through a 6px radius while it loads. */
const THUMB_GROUND = "var(--elevated)";

export function CommanderThumb({
  imageUri,
  colorIdentity,
  size = "row",
  className = "",
  lazy = false,
  eager = false,
}: {
  imageUri: string | null;
  colorIdentity: ThumbIdentity;
  size?: ThumbSize;
  /** Layout only — the flex behaviour of whatever row this sits in. The box, the
      radius, the ring and the ground are not a caller's to set. */
  className?: string;
  /** OPT-IN: draw the art as an `<img>` that waits for hydration and the viewport (`HydratedImg`),
      rather than a CSS background, which a browser fetches for every rendered thumb on or off
      screen. The precon list's rows asked for all ~186 commanders' `normal` art (~16MB) that way.
      Every other call site draws a handful of thumbs and keeps the background. */
  lazy?: boolean;
  /** With `lazy`: this thumb is in the first screen, so its art is in the server HTML. */
  eager?: boolean;
}) {
  const box = BOX[size];
  if (lazy && imageUri) {
    return (
      <span
        aria-hidden
        data-commander-thumb={size}
        className={`relative block shrink-0 overflow-hidden ${box.radius} ${className}`}
        style={{ width: box.width, height: box.height, background: THUMB_GROUND }}
      >
        <HydratedImg
          eager={eager}
          src={imageUri}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        {/* The ring, drawn OVER the art: an inset shadow on this box would paint under its img. */}
        <span className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ boxShadow: CARD_ART_RING }} />
      </span>
    );
  }
  // No art falls back to the identity, and an unknown identity falls back to the stripes: B6's two halves,
  // which are two different facts rather than one with a threshold. With art, the plain ground shows while it
  // travels and the art fades in over it (`ArtLayer`, card-art fades PR 3).
  const ground = imageUri ? THUMB_GROUND : colorIdentity === null ? ART_STRIPES : commanderGradient(colorIdentity);
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
      className={`relative block shrink-0 overflow-hidden ${box.radius} ${className}`}
      style={{ width: box.width, height: box.height, background: ground, boxShadow: CARD_ART_RING }}
    >
      {imageUri ? (
        <>
          {/* `center top`, not `center`: the face is at the top of a card, and a centred crop of a 63/88 frame at
              this size is mostly type box. */}
          <ArtLayer src={imageUri} style={{ backgroundPosition: "center top" }} />
          {/* The ring, drawn OVER the art: an inset shadow on this box paints under its children. */}
          <span className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ boxShadow: CARD_ART_RING }} />
        </>
      ) : null}
    </span>
  );
}
