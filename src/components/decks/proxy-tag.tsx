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

import { proxyCopy } from "../../lib/copy/proxies";

type ProxyTagVariant = "row" | "band";

/** The edge is `--fg-locked`, never `--border-dashed`: a dashed line that
 *  carries state takes a foreground token. Measured against `--surface-rail`,
 *  `--fg-locked` clears 3.14–3.35:1 in all six themes; `--border-dashed` clears
 *  none of them. */
const EDGE = "1px dashed var(--fg-locked)";

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
  /** The commander's short name, on a PAIR deck only. Two commanders, two
   *  independent flags and one caption row: a bare `P` there could belong to
   *  either name. A single commander never pays for this, and `P×2` is banned
   *  by ruling 5. */
  pairName,
}: {
  variant?: ProxyTagVariant;
  pairName?: string;
}) {
  const word = pairName ? proxyCopy.tag.pairAria(pairName) : proxyCopy.tag.aria;
  return (
    <span
      className={`font-mono rounded-[4px] px-[5px] py-[1px] font-semibold ${PLACEMENT[variant]}`}
      style={{ color: "var(--fg)", border: EDGE, ...PLATE[variant] }}
      title={pairName ? proxyCopy.tag.pairTitle(pairName) : proxyCopy.tag.title}
    >
      {/* Drawn, never spoken — the glyph stands for the word rather than saying
          it, exactly as the collapsed buy tag's `$` does. `pair` carries the
          glyph itself, so the two are alternatives and never both. */}
      <span aria-hidden="true">
        {pairName ? proxyCopy.tag.pair(pairName) : proxyCopy.tag.glyph}
      </span>
      <span className="sr-only">{word}</span>
    </span>
  );
}
