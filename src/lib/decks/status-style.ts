// Colour is status, and status only (refresh README decision 3). Six values,
// written once, here, so a theme change is a token change and never a
// component change.
//
// NO HEX. Not from tokens.r6.json, not "just for Canopy". The alpha rides on
// the token through `color-mix`, so the six themes each get their own value of
// the same rule and no component ever names a colour.
//
// The pill's base rule is the status colour at 18% over the base plate, inside
// one opaque hairline, with the colour as its label. Draft and Building are
// drawn as exceptions to the fill and the label: they are the two statuses
// whose token IS a text colour, so they take 16% / 14% and a quieter label.
// `STATES-deck-statuses.md` states the flat rule in prose and then draws these
// two against it; READINESS closes the item "per value in
// STATES-deck-statuses.md", so the per-value table is what ships.

import type { CSSProperties } from "react";
import type { StatusPill } from "./status";

export const STATUS_TOKEN: Record<StatusPill, string> = {
  Draft: "--fg-faint",
  Building: "--fg-body",
  Over: "--danger",
  Unresolved: "--warning",
  "To buy": "--accent",
  Complete: "--success",
};

/** The handoff's `2E` of 255, as the percentage `color-mix` takes. */
const FILL_ALPHA = "18%";

/**
 * Where the drawing departs from the flat rule. Absent status = the flat rule.
 * `label` is a whole token rather than an alpha: Draft and Building are the two
 * statuses whose own token is a text colour, and they take a lighter fill and a
 * quieter label than the four that key off a signal colour.
 */
const PILL_EXCEPTION: Partial<
  Record<StatusPill, { fillAlpha: string; label: string; borderStyle?: CSSProperties["borderStyle"] }>
> = {
  Draft: { fillAlpha: "16%", label: "--fg-muted" },
  Building: { fillAlpha: "14%", label: "--fg-body", borderStyle: "dashed" },
};

/**
 * The pill only ever sits on art, and the art wash amendment rules ink over art
 * to full opacity: the fill mixes into `--bg` rather than into transparency, so
 * the plate is opaque at every alpha and a bright pixel behind it cannot reach
 * the label. The status still keys the colour — only the thing it is mixed with
 * changed. The border follows, one opaque hairline colour for every status,
 * because a 50% fade of the status colour was the worst-reading edge in the
 * report. Building's dash survives that retirement: a line style is not an
 * alpha fade, so the readability rule never reached it, and with colour now
 * living only in fill and label it is the one status signal that survives
 * greyscale and colour blindness — and the one status that differs in kind
 * (incomplete, rather than a data condition) reading as different in kind.
 */
function plate(token: string, alpha: string): string {
  return `color-mix(in srgb, var(${token}) ${alpha}, var(--bg))`;
}

/**
 * The two deck-state marks, which are not statuses and never become one.
 *
 * `hollow` is the PHASE: a deck that has never committed a version is a plan
 * rather than a deck, and its plate drops the status tint. `pending` is the
 * DIFF: a committed deck whose draft differs from its version.
 *
 * They are mutually exclusive by definition — the edge means "differs from the
 * version", which requires a version; the hollow plate means there is none —
 * and no caller may pass both. The type says so, so the impossible state cannot
 * be written rather than being a rule somebody has to remember.
 */
export type DeckStateMarks =
  | { hollow?: false; pending?: boolean }
  | { hollow: true; pending?: false };

export function statusPillStyle(
  status: StatusPill,
  marks: DeckStateMarks = {},
): CSSProperties {
  const token = STATUS_TOKEN[status];
  const exception = PILL_EXCEPTION[status];
  return {
    color: `var(${exception ? exception.label : token})`,
    // HOLLOW IS NOT TRANSPARENT. The art-wash amendment rules this plate opaque
    // — the fill mixes into `--bg` so a bright pixel of art cannot reach the
    // label — and the mobile spine puts the pill on the wash. So the hollow
    // reading takes `--bg` ITSELF, the colour the tint was already mixing into,
    // at 0%: fully opaque, one rule, and one argument rather than a branch.
    background: marks.hollow ? "var(--bg)" : plate(token, exception ? exception.fillAlpha : FILL_ALPHA),
    border: `1px ${exception?.borderStyle ?? "solid"} var(--border-strong)`,
    // `--fg` and not `--accent`: `STATUS_TOKEN["To buy"]` IS `--accent`, so an
    // accent edge on that pill is an accent edge on an accent plate under an
    // accent label — a heavier border of the pill's own colour, on the one value
    // it most needs to be separable from, in every theme. `--fg` is the only ink
    // in the palette that is not a status token and not a hue.
    //
    // It composes with Building's dashed hairline rather than replacing it: a
    // line STYLE against a line WEIGHT, two facts on one box, and the pair
    // survives greyscale where a colour alone would not.
    ...(marks.pending ? { borderLeft: "2px solid var(--fg)" } : {}),
    // `text-shadow` is an inherited property, and every band that carries a pill
    // over art puts a cover shadow on the block around it — so the pill picked up
    // ink it is the stated exception to. It plates itself, so it needs none, and
    // refusing it here covers every surface rather than each one remembering.
    textShadow: "none",
  };
}

/**
 * The 3px progress track's fill. Clamped at 100%: an Over deck is full, not
 * 105% — a bar cannot overflow the track that measures it, and the `5 over`
 * figure in the detail row is where the excess is stated. A Draft deck needs no
 * special case; 0 built is already the empty track the states file draws.
 *
 * `bodySize` is the deck's own ceiling, not a constant: a pair deck is full at
 * 98, and measuring it against 99 would draw a finished deck's bar short of the
 * track. See `deckBodySize()` in `deck-size.ts`.
 */
export function statusBarStyle(
  status: StatusPill,
  built: number,
  bodySize: number,
  /**
   * The deck has no committed version. The bar follows its plate at half
   * opacity, so a plan reads as ONE provisional object rather than as a hollow
   * chip sitting beside a solid bar.
   */
  marks: { provisional?: boolean } = {},
): CSSProperties {
  const pct = Math.min(100, Math.max(0, (built / bodySize) * 100));
  return {
    width: `${pct}%`,
    background: `var(${STATUS_TOKEN[status]})`,
    ...(marks.provisional ? { opacity: 0.5 } : {}),
  };
}

/** The 3px left keyline on Home's list rows. */
export function statusKeylineStyle(status: StatusPill): CSSProperties {
  return { background: `var(${STATUS_TOKEN[status]})` };
}
