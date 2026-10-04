// Card surfaces — the strings behind #349, #350, #351 and #363.
//
// From `design/design_handoff_the99_card_surfaces/card-surfaces · copy strings.ts`.
// The mana mapper lives here rather than in `CostPips` because it is words, and
// because the pip cap must never reach the spoken form: a six-plus-symbol cost
// draws four pips and a `+N` but speaks every symbol OF THE FACE IT DRAWS. The
// cap is the thing that must not reach it; the front-face rule is not a
// truncation but the same face the pips show, and a label describing a cost no
// run on screen carries would be its own defect. A reader who cannot see the
// pips is the one reader for whom truncation is not a trade.

import { faceCosts, frontFaceCost } from "../cards/faces";

const SYMBOL: Record<string, string> = {
  W: "white",
  U: "blue",
  B: "black",
  R: "red",
  G: "green",
  C: "colorless",
  X: "X",
};

const HYBRID_JOINER = " or ";
const PHYREXIAN = "2 life";

export const manaCopy = {
  /** "{2}{W}{W}" → "mana cost 2 white white" */
  costAria: (spokenSymbols: string) => `mana cost ${spokenSymbols}`,
  /** A card with no cost — lands, and the back faces of some transforms. */
  costNone: "no mana cost",
  /**
   * The overflow pip's drawn text only. It has no accessible name of its own:
   * `costAria` already speaks the whole cost, and a spoken "+7" beside it would
   * count the symbols twice.
   */
  pipOverflow: (omitted: number) => `+${omitted}`,
  /**
   * The two halves of a split or Adventure cost, spoken.
   *
   * NOT "or", which is the obvious word and the wrong one: a hybrid symbol
   * already speaks as "green or blue", so `", or "` between the halves reads
   * "green or blue green or blue, or 1 green blue" — three ors, and no way to
   * hear where one cost ends. "second cost" cannot collide with a symbol's own
   * wording, and names what the reader is being given.
   *
   * Only ever given two or more halves. One cost speaks through `costAria`
   * alone, and announcing a second would promise a half the card lacks.
   */
  costAriaHalves: (spokenHalves: readonly string[]) =>
    `mana cost ${spokenHalves[0]}${spokenHalves.slice(1).map((half) => `, second cost ${half}`).join("")}`,
  /** The mark between two drawn costs — the separator the printed name uses. */
  costHalfSeparator: "//",
} as const;

/**
 * The view well's two segments, on both surfaces it appears. The glyph is drawn
 * and the name is spoken, so these strings are the whole accessible name of the
 * control — there is no visible label to fall back on.
 */
export const viewToggleCopy = {
  deck: { list: "List view", card: "Card view" },
  collection: { rows: "Rows view", grid: "Grid view" },
} as const;

/**
 * The card view tile. Two strings only — everything else the tile says is a
 * string it shares with the row it replaces.
 */
export const cardTileCopy = {
  /**
   * The availability slot when the player owns no copies. The tile draws the
   * same collapsed `$` the All row draws, but says something different: on the
   * row the chip is the shop, here it is the floor, and a tile carries no price
   * for the figure to belong to.
   */
  slotUnownedAria: "not owned",
  /**
   * Appended to the art trigger's name where the badge draws `×N`. The badge is
   * aria-hidden, and the trigger is the only label a tile has, so the count has
   * to ride it or go unsaid.
   */
  copiesAria: (copies: number) => `${copies} copies in deck`,
} as const;

/**
 * #363 — the two-faced mark and the modal's flip control.
 *
 * `mark` is drawn text, aria-hidden; `markAria` is the sr-only sibling. The
 * flip control names the FACE IT TURNS TO, not the act: "Turn over" tells the
 * reader nothing they cannot see, and the other face's name is the fact they
 * are actually reaching for.
 */
export const twoFacedCopy = {
  mark: "//",
  markAria: "two-faced card",
  flipToAria: (otherFaceName: string) => `Turn over to ${otherFaceName}`,
  /** Announced on the swap, since the image change is silent by design. */
  flippedAria: (faceName: string) => `Showing ${faceName}`,
  /**
   * The same pair, for a printing whose two faces carry ONE name: Secret Lair's
   * reversible cards, where the sides differ in art and in nothing else.
   *
   * `Turn over to Mimir's Ancient Wisdom` names the card already on screen, which
   * tells a reader who cannot see the art nothing at all. The side is what the
   * label has left to say, and `front` / `back` is the vocabulary the rest of this
   * feature already uses for the two images.
   */
  flipToSideAria: (side: "front" | "back") => `Turn over to the ${side} art`,
  flippedSideAria: (side: "front" | "back") => `Showing the ${side} art`,
} as const;

/**
 * The printed name (#467 follow-on). One string — everything else this feature
 * shows is an existing string re-sourced from the resolved printing.
 */
export const printedNameCopy = {
  /**
   * The modal header's oracle-name label. Mono, lowercase, 10.5px, --fg-faint.
   *
   * One word on purpose: the modal's meta grid already carries a `Set` field
   * naming the set and collector number, so the line does not have to explain
   * itself. Lowercase mono is the shipped field-label register (`no number ·
   * ×1`, `SLD · 2208`) — not the uppercase letterspaced register, which is
   * reserved for section labels.
   *
   * Never rendered when the printing prints the oracle name: the whole line is
   * absent in that case, label included.
   */
  oracleLabel: "oracle",
} as const;

/** "U/B" → "blue or black"; "2/W" → "2 or white"; "G/P" → "green or 2 life". */
function speakSymbol(symbol: string): string {
  return symbol
    .split("/")
    .map((part) => (part === "P" ? PHYREXIAN : (SYMBOL[part] ?? part.toLowerCase())))
    .join(HYBRID_JOINER);
}

/**
 * Every symbol of the FRONT FACE's cost, in order and never capped.
 *
 * Front face because that is what the pips beside it draw: an `adventure`,
 * `split` or `prepare` card carries both halves in one string, and a label that
 * spoke both would describe a cost no run on screen shows. `frontFaceCost` holds
 * that rule for both.
 *
 * Never capped, though — the pip run caps at four and a `+N`, and a reader who
 * cannot see the pips is the one reader for whom truncation is not a trade.
 *
 * Returns `costNone` for a card with no cost at all, so a land reads as having
 * no cost rather than falling silent — silence is indistinguishable from a
 * missing label.
 */
export function spokenManaCost(cost: string | null | undefined): string {
  // The same half the pips draw. A label that spoke both halves of an Adventure
  // would describe a cost the run beside it does not show.
  const spoken = speakHalf(frontFaceCost(cost ?? ""));
  return spoken === null ? manaCopy.costNone : manaCopy.costAria(spoken);
}

/**
 * Every printed cost on the card, spoken — the modal's label, and only the
 * modal's.
 *
 * It exists as a second function rather than a flag because the rule above is
 * the rule: a label describes the run beside it. The modal draws both halves of
 * a split cost, so its label speaks both; a row draws one, so its label speaks
 * one. A card with a single cost reads identically through either.
 */
export function spokenFullManaCost(cost: string | null | undefined): string {
  const halves = faceCosts(cost).map(speakHalf).filter((half): half is string => half !== null);
  if (halves.length === 0) return manaCopy.costNone;
  return halves.length === 1 ? manaCopy.costAria(halves[0]) : manaCopy.costAriaHalves(halves);
}

/** One half's symbols, spoken, or null when it holds none. */
function speakHalf(half: string): string | null {
  const symbols = [...half.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
  return symbols.length === 0 ? null : symbols.map(speakSymbol).join(" ");
}

/**
 * The zoom (card detail R2, §3) — the whole card at something like hand size.
 *
 * No price string anywhere here, and none is to be added: the figure lives under
 * the art, the zoom refuses it deliberately (a card in your hand has no price
 * printed on it), and the tag is one dismissal away.
 */
export const cardZoomCopy = {
  /**
   * The art becomes a button. The name is shared rather than bespoke — the
   * commander's own was deleted when its lightbox became this modal, and this must
   * not reintroduce the pattern.
   */
  zoomAria: (name: string) => `Look at ${name} up close`,

  /** The layer's own label. It is a region inside the dialog, NOT a second dialog. */
  layerAria: (name: string) => `${name}, shown large`,

  /**
   * The one caption under the zoomed card: which printing you are holding.
   *
   * `num` may be empty on a bare `Name,Qty` import — the field AND its separator
   * go, per the printing picker's ruling. Never "no number".
   */
  printing: (setName: string, code: string, num: string) => {
    // Where the catalog has no row for the set, the caller passes the code as the
    // name — and `RVR · RVR 12` names the set twice. The code is dropped there, the
    // same suppression the picker's tiles already make.
    const head = setName === code ? code : `${setName} · ${code}`;
    return num ? `${head} ${num}` : head;
  },

  /** Appended to the caption on the reverse face. Not a second line. */
  backSuffix: " · back",

  /**
   * The shipped ✕ keeps its slot and changes its label: "Close card details"
   * while a zoom is up is a lie about what the press will do.
   */
  close: "Close the large view",

  /**
   * The quiet hint under the desktop art. It replaces the ⤢ plate that
   * sat on the art: a glyph in a corner had to be decoded, and the line under
   * the card says the same thing in words for the same pixels.
   *
   * Desktop only since the card carousel's phone round (R2), which retired the
   * phone zoom and its "Tap to zoom" with the art header it sat under.
   */
  hintDesktop: "Click to zoom",
} as const;
