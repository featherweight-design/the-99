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
import { MATURE_DECK_SIZE } from "./availability";
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

export function statusPillStyle(status: StatusPill): CSSProperties {
  const token = STATUS_TOKEN[status];
  const exception = PILL_EXCEPTION[status];
  return {
    color: `var(${exception ? exception.label : token})`,
    background: plate(token, exception ? exception.fillAlpha : FILL_ALPHA),
    border: `1px ${exception?.borderStyle ?? "solid"} var(--border-strong)`,
  };
}

/**
 * The 3px progress track's fill. Clamped at 100%: an Over deck is full, not
 * 105% — a bar cannot overflow the track that measures it, and the `5 over`
 * figure in the detail row is where the excess is stated. A Draft deck needs no
 * special case; 0 built is already the empty track the states file draws.
 */
export function statusBarStyle(status: StatusPill, built: number): CSSProperties {
  const pct = Math.min(100, Math.max(0, (built / MATURE_DECK_SIZE) * 100));
  return { width: `${pct}%`, background: `var(${STATUS_TOKEN[status]})` };
}

/** The 3px left keyline on Home's list rows. */
export function statusKeylineStyle(status: StatusPill): CSSProperties {
  return { background: `var(${STATUS_TOKEN[status]})` };
}
