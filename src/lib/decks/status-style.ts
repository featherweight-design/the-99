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
  New: "--fg-faint",
  Draft: "--fg-body",
  // `--fg`, and the brightest neutral in the palette: a committed deck sitting
  // short of its body size is a REAL deck in an odd state, which is a different
  // thing from the provisional decks that used to land here.
  Building: "--fg",
  Over: "--danger",
  Unresolved: "--warning",
  "To buy": "--accent",
  Complete: "--success",
};

/** The handoff's `2E` of 255, as the percentage `color-mix` takes. */
const FILL_ALPHA = "18%";

/**
 * Where the drawing departs from the flat rule. Absent status = the flat rule.
 *
 * TWO of them are the PHASE: `New` and `Draft` are the only values whose token
 * is a text colour rather than a signal hue, so they take a lighter fill and a
 * quieter label than the five that key off one. The third is `Over`, for
 * contrast alone (H5, below).
 *
 * THE DASH BELONGS TO `Draft` NOW. A dashed edge has meant *provisional* since
 * the refresh, and it is the one status signal that survives greyscale and
 * colour blindness — which is also what separates `New` from `Draft`, since
 * both are drawn from neutrals. It sat on `Building` while `Building` was where
 * unfinished decks lived; they live in `Draft` now, so the signal followed the
 * meaning rather than changing it. `Building` takes the flat rule.
 */
const PILL_EXCEPTION: Partial<
  Record<StatusPill, { fillAlpha: string; label: string; borderStyle?: CSSProperties["borderStyle"]; edge?: string }>
> = {
  New: { fillAlpha: "16%", label: "--fg-muted" },
  Draft: { fillAlpha: "14%", label: "--fg-body", borderStyle: "dashed" },
  // H5 (deck notices readiness, 2026-09-24): `--danger` as 10.5px text reads under 4.5:1 on every
  // theme's plate, so the label is `--fg` and the red moves to the hairline, beside the tint the
  // flat rule already gives it. The notice's `Not legal` tag takes the same treatment.
  Over: { fillAlpha: FILL_ALPHA, label: "--fg", edge: "--danger" },
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

export function statusPillStyle(status: StatusPill): CSSProperties {
  const token = STATUS_TOKEN[status];
  const exception = PILL_EXCEPTION[status];
  return {
    color: `var(${exception ? exception.label : token})`,
    background: plate(token, exception ? exception.fillAlpha : FILL_ALPHA),
    border: `1px ${exception?.borderStyle ?? "solid"} var(${exception?.edge ?? "--border-strong"})`,
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
 * 98, and measuring it against 99 would draw a committed deck's bar short of the
 * track. See `deckBodySize()` in `deck-size.ts`.
 */
export function statusBarStyle(
  status: StatusPill,
  built: number,
  bodySize: number,
): CSSProperties {
  const pct = Math.min(100, Math.max(0, (built / bodySize) * 100));
  return { width: `${pct}%`, background: `var(${STATUS_TOKEN[status]})` };
}

/** The 3px left keyline on Home's list rows. */
export function statusKeylineStyle(status: StatusPill): CSSProperties {
  return { background: `var(${STATUS_TOKEN[status]})` };
}
