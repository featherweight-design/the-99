import type { CSSProperties } from "react";

import { markArt, markForm, SLUG } from "../../lib/bracket/mark-size";
import type { Bracket } from "../../lib/bracket/types";

/**
 * The bracket mark — the ornament in the rank's own ink, with the rank numeral inside it.
 *
 * THE ART IS A MASK, NEVER AN `<img>`, AND THAT IS MEASURED RATHER THAN STYLISTIC. Every path
 * in the ten files is inked `currentColor`, and an external SVG resolves `currentColor` against
 * its OWN root rather than against the element that loaded it — so `<img src="/brackets/…svg">`
 * renders every mark BLACK, in every theme, with correct-looking markup and no error anywhere.
 * A mask has no such problem: the file supplies the shape and this element supplies the ink.
 *
 * AND THE NUMERAL IS REAL HTML TEXT, for the half a mask does not fix. The files carry their
 * numeral as `<text font-family="Cinzel,serif">`, and an external SVG cannot load the page's
 * webfont — so inside the mask it falls back to the platform serif. That is invisible at the
 * 22px chip, which `ASSETS.md` calls decorative there, and plainly wrong at 26 / 36 / 44 where
 * it is the thing being read. Ruled 2026-09-22: mask the art, draw the numeral as text.
 *
 * SO THE MASK SUBTRACTS THE FILE'S OWN NUMERAL. Two mask layers composited `intersect`: the art,
 * and a hard-edged disc that is transparent in the middle. Without it the file's serif numeral
 * survives in the mask and sits UNDER the Cinzel one in the same ink — a doubled digit, which is
 * worse than either numeral alone. The disc is 35% of the box's half-width, which is 7 units of
 * the 40-unit viewBox: the numeral is drawn at `font-size` 16-17 there, so it fits inside 7, and
 * the nearest ornament to the centre is an inner diamond whose EDGE passes at 11.5/sqrt(2) ~ 8.13
 * units. No ornament in any of the ten files crosses it.
 *
 * THE MASK'S ART IS INLINE DATA, NOT A FETCHED URL (Hugh, 2026-10-11). A mask fetched by url paints
 * its other layer alone until the file lands, and the full form's other layer is the numeral disc
 * (`MARK_NUMERAL_DISC`): a cold load drew a filled square. `pnpm assets:brackets` builds `app/bracket-marks.css`
 * from the files in `public/brackets/` (data URIs, ~1KB gzipped), so the art arrives with the
 * stylesheet, before first paint; `copy-bracket-marks.test.mts` fails when the build drifts from
 * the files. Inlining the SVG MARKUP stays rejected: that would be a hand-kept third copy.
 */

/** Spelled per rank rather than interpolated, so `check:tokens` can see every read. */
/**
 * How far the unlit half of a range is dimmed.
 *
 * EXPORTED so the contrast gate measures the figure the component draws rather than a copy of
 * it: the bar this has to clear is 3:1 on a COMPOSITE, and a gate holding its own 0.65 would go
 * on passing the day the component moved to 0.5.
 */
export const DIM_OPACITY = 0.65;


const INK: Record<Bracket, string> = {
  1: "var(--bracket-1)",
  2: "var(--bracket-2)",
  3: "var(--bracket-3)",
  4: "var(--bracket-4)",
  5: "var(--bracket-5)",
};

/**
 * The ink of a rank, for callers that draw a label or a border beside the mark.
 *
 * Exported so no surface spells `var(--bracket-${n})` itself: an interpolated custom property is
 * invisible to a class-list reading and resolves to nothing when it is wrong, which is the
 * silent failure `check:tokens` exists for.
 */
export function bracketInk(bracket: Bracket): string {
  return INK[bracket];
}

export function BracketMark({
  bracket,
  px,
  mdPx,
  dim = false,
  className,
}: {
  bracket: Bracket;
  /** A ship size from `ASSETS.md`: 26 / 36 / 44 full, 22 chip, under 20 the numeral alone. */
  px: number;
  /**
   * The size from 768px up, where the two differ. One element either way — see `.bracket-mark`.
   *
   * REFUSED WHEN IT CROSSES A FORM BOUNDARY, because the two sides would need different art and
   * a CSS rule cannot swap a mask by width. A caller wanting 22 below and 26 above is asking for
   * the chip file on one side and the full file on the other, and must mount both.
   */
  mdPx?: number;
  /**
   * The upper member of a range, drawn behind the one that holds.
   *
   * 0.65, RAISED FROM THE CANVAS'S 0.45 BY THE ADDENDUM'S RULING 3. The mark is a graphical
   * object held to 3:1, and at 0.45 rank 2 composited over `--surface` reads 2.2533 on kaldheim
   * — 6 of its 12 theme×rank pairs under the bar. At 0.65 the floor is **3.2963**, still
   * kaldheim rank 2, and nothing is under. 0.6 was measured too: 3.0128, which is not a margin
   * to spend across six themes.
   *
   * The meaning survives the smaller step — this is still the unlit half of the range.
   */
  dim?: boolean;
  className?: string;
}) {
  const form = markForm(px);
  if (mdPx !== undefined && markForm(mdPx) !== form) {
    throw new Error(
      `BracketMark: ${px}px draws the ${form} form and ${mdPx}px draws the ${markForm(mdPx)} `
      + `form, so one element cannot serve both widths`,
    );
  }
  const art = markArt(bracket, px);
  const ink = INK[bracket];
  // THE CHIP KEEPS THE FILE'S OWN NUMERAL, and that is `ASSETS.md`'s rule rather than a saving:
  // at 22px the chip's numeral renders at ~9px and is not legible, so "the silhouette carries
  // the rank there, and that is the design". Drawing an HTML numeral at 8.8px would replace an
  // unreadable decorative digit with an unreadable one in a different face, and subtracting the
  // file's would leave the chip's own drawing incomplete.
  const drawsOwnNumeral = form === "full";
  return (
    <span
      data-testid="bracket-mark"
      data-bracket={bracket}
      data-form={form}
      aria-hidden="true"
      className={`bracket-mark relative inline-flex flex-none items-center justify-center ${className ?? ""}`}
      style={
        {
          "--bracket-mark-px": `${px}px`,
          ...(mdPx === undefined ? {} : { "--bracket-mark-px-md": `${mdPx}px` }),
          opacity: dim ? DIM_OPACITY : undefined,
        } as CSSProperties
      }
    >
      {art === null ? null : (
        // The art is a mask drawn from `app/bracket-marks.css`, inline data rather than a fetched
        // file: a fetched mask paints its numeral-disc layer alone until the file lands, which a
        // cold load showed as a filled square (Hugh, 2026-10-11).
        <span
          data-testid="bracket-mark-art"
          data-art={art}
          data-form={form}
          aria-hidden="true"
          className="bracket-art absolute inset-0"
          style={{ backgroundColor: ink }}
        />
      )}
      {/*
        THE NUMERAL, AT 40% OF THE BOX. The files draw it at `font-size` 16 in a 40-unit viewBox,
        which is the ratio this reproduces rather than a figure chosen here. Below 20px it is the
        whole mark and fills the box, because there is no ornament left to sit inside.

        `--font-cinzel` RATHER THAN `--font-display`, and deliberately: the bracket palette is
        identical in all six themes because a bracket is the format's vocabulary rather than this
        app's mood, and the numeral inside the mark is part of the same mark. A per-theme face
        would make the same rank read as a different mark depending on which theme was active.
      */}
      {drawsOwnNumeral || form === "numeral" ? (
        <span
          data-testid="bracket-mark-numeral"
          className="relative leading-none"
          style={{
            color: ink,
            fontFamily: "var(--font-cinzel), serif",
            fontWeight: 700,
            // In `em`, so one declaration follows the box across the breakpoint. The files draw
          // the numeral at `font-size` 16 in a 40-unit viewBox, which is the 0.4 below; under
          // 20px it is the whole mark and fills the box.
          fontSize: form === "numeral" ? "1em" : "0.4em",
          }}
        >
          {bracket}
        </span>
      ) : null}
    </span>
  );
}

/** The slug behind a rank, re-exported so a probe can name the file it expects to be served. */
export { SLUG as BRACKET_SLUG };
