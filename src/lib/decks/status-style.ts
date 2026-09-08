// Colour is status, and status only (refresh README decision 3). Six values,
// written once, here, so a theme change is a token change and never a
// component change.
//
// NO HEX. Not from tokens.r6.json, not "just for Canopy". The alpha rides on
// the token through `color-mix`, so the six themes each get their own value of
// the same rule and no component ever names a colour.
//
// The pill's base rule is the status colour at 18% fill on a 50% border with
// the colour as its label. Draft and Building are drawn as exceptions to it:
// they are the two statuses whose token IS a text colour, so a 50%-alpha
// border of it reads as a second, dimmer piece of text rather than an edge.
// The drawing gives them a hairline border token instead and drops the fill to
// 16% / 14%. `STATES-deck-statuses.md` states the flat rule in prose and then
// draws these two against it; READINESS closes the item "per value in
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

/** The handoff's `2E` and `80` of 255, as the percentages `color-mix` takes. */
const FILL_ALPHA = "18%";
const BORDER_ALPHA = "50%";

/**
 * Where the drawing departs from the flat rule. Absent status = the flat rule.
 * `border` and `label` are whole tokens rather than alphas, which is the point
 * of the exception: a hairline is its own token, not a faded status colour.
 */
const PILL_EXCEPTION: Partial<
  Record<StatusPill, { fillAlpha: string; border: string; label: string }>
> = {
  Draft: { fillAlpha: "16%", border: "--border-strong", label: "--fg-muted" },
  Building: { fillAlpha: "14%", border: "--border-dashed", label: "--fg-body" },
};

function mix(token: string, alpha: string): string {
  return `color-mix(in srgb, var(${token}) ${alpha}, transparent)`;
}

export function statusPillStyle(status: StatusPill): CSSProperties {
  const token = STATUS_TOKEN[status];
  const exception = PILL_EXCEPTION[status];
  return {
    color: `var(${exception ? exception.label : token})`,
    background: mix(token, exception ? exception.fillAlpha : FILL_ALPHA),
    border: `1px solid ${
      exception ? `var(${exception.border})` : mix(token, BORDER_ALPHA)
    }`,
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
