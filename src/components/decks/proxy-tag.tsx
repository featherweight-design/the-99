// ProxyTag — the mark that says this deck's copy of a card is printed.
//
// One glyph, `P`, in the box `BuyTag` draws its collapsed `$` in, at the same
// density. The two SHARE A SLOT and can never co-occur (`deckRowTag`), which is
// why the geometry is identical: the row must not move when the state flips.
//
// THE WORD IS NEVER ON THE ROW. It rides three carriers instead — the mark key
// under the toolbar, a `title` for a pointer, and an `sr-only` span — which is
// `BuyTag`'s own arrangement at collapsed density rather than a new mechanism.
// A one-character mark is only safe for a fact the app must not be vague about
// if the word is reachable three ways.
//
// IT SPENDS NO COLOUR, and that is the ruling rather than a saving. Every hue is
// booked — `--accent` is in use / to buy, `--warning` is money, `--success` is
// complete, `--danger` is over-committed — and a proxy is none of those. The one
// thing it must never say is OWNED, which rules out the two a reader would
// otherwise reach for. Neutral ink on a dashed edge borrows no meaning, and
// dashed is already this app's word for "not settled cardboard".

import { CARD_TILE_SLOT_BOX } from "../ui/card-tile-caption";
import { proxyCopy } from "../../lib/copy/proxies";

type ProxyTagVariant = "row" | "band";

/**
 * The edge is `--fg-locked`, never `--border-dashed`: a dashed line that carries
 * state takes a foreground token. Measured against `--surface-rail`,
 * `--fg-locked` clears 3.14–3.35:1 in all six themes; `--border-dashed` clears
 * none of them.
 *
 * AN OUTLINE, NOT A BORDER, and that is the shared slot's whole contract. A
 * border is layout: it makes this tag 2px wider and taller than the collapsed
 * `$` it stands in for, so flipping between the two would nudge the row and
 * change how much width the card name has. An outline is painted outside the
 * box model, and — unlike a box-shadow, which cannot be dashed at all — it keeps
 * the dashed stroke, which is load-bearing: dashed is already this app's word
 * for "not settled cardboard".
 *
 * The offset pulls it onto the box's own edge rather than 1px outside it, so it
 * reads as the tag's border without occupying space.
 */
const EDGE = { outline: "1px dashed var(--fg-locked)", outlineOffset: "-1px" } as const;

const PLACEMENT: Record<ProxyTagVariant, string> = {
  row: "flex-none text-[9px] md:text-[9.5px]",
  // On the commander caption, where the tag sits over an art crop.
  band: "flex-none text-[9px]",
};

/** The band variant's scrim, UNCONDITIONALLY — never gated on how bright the
 *  crop is. `BuyTag`'s tile plate takes the same 92% at the same opacity for the
 *  same stated reason: a primitive deciding how to look from what is behind it
 *  is the defect that component's own comment warns about. */
const PLATE: Record<ProxyTagVariant, React.CSSProperties> = {
  row: {},
  band: { background: "color-mix(in oklab, var(--bg) 92%, transparent)" },
};

export function ProxyTag({
  variant = "row",
  /** The commander's SHORT name — `shortName()`, everything before the epithet —
   *  on a PAIR deck only. The caption beside it already carries the full name,
   *  so `P · Kraum, Ludevic's Opus` would repeat it and spend the narrow
   *  header's width saying so twice. Two commanders, two
   *  independent flags and one caption row: a bare `P` there could belong to
   *  either name. A single commander never pays for this, and `P×2` is banned
   *  by ruling 5. */
  pairName,
  plate = true,
  silent = false,
}: {
  variant?: ProxyTagVariant;
  pairName?: string;
  /**
   * Band variant only. `false` drops the scrim and takes the shared caption box,
   * which the availability chip and the collapsed buy tag also take there — the
   * three are one slot by rule, and off the art they are one box.
   *
   * A prop rather than a third variant: `band` is also the commander spine's at
   * both widths, and the caption's geometry must not reach those.
   */
  plate?: boolean;
  /**
   * Drop the tag's own spoken label, for a surface that says the same state in a
   * fuller sentence of its own.
   *
   * The review row does: its `aria-describedby` carries "…is a proxy in this
   * deck, so this add asks nothing of your collection", and the tag's own
   * `sr-only` word repeated that state a second time — where the guard tags
   * beside it deliberately speak once. `BuyTag` takes the same option for the
   * same reason.
   */
  silent?: boolean;
}) {
  const word = pairName ? proxyCopy.tag.pairAria(pairName) : proxyCopy.tag.aria;
  // See `plate`. The edge is already an outline here, so only the scrim and the
  // placement differ between the band and the caption.
  const captionBox = variant === "band" && !plate;
  return (
    <span
      className={
        captionBox
          ? CARD_TILE_SLOT_BOX
          : `font-mono rounded-[4px] px-[5px] py-[1px] font-semibold ${PLACEMENT[variant]}`
      }
      style={{ color: "var(--fg)", ...EDGE, ...(captionBox ? {} : PLATE[variant]) }}
      title={pairName ? proxyCopy.tag.pairTitle(pairName) : proxyCopy.tag.title}
    >
      {/* Drawn, never spoken — the glyph stands for the word rather than saying
          it, exactly as the collapsed buy tag's `$` does. `pair` carries the
          glyph itself, so the two are alternatives and never both. */}
      <span aria-hidden="true">
        {pairName ? proxyCopy.tag.pair(pairName) : proxyCopy.tag.glyph}
      </span>
      {silent ? null : <span className="sr-only">{word}</span>}
    </span>
  );
}
