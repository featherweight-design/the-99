/**
 * The landing half of a push (plan `2026-10-22-push.md`, PR 5), pure. A tap on a price drop or a combo lands on Home with
 * what to open in the ADDRESS (`public/sw.js`'s `openLanding`): `push-card=<oracle id>` and, for a combo, `push-combo=1`.
 * Home reads them once, opens that card's details through the feed's own opener, and strips both through `mirrorUrl`.
 *
 * The address is anyone's to type, so the card must be an oracle id's shape (a uuid, lowercased: the catalog's ids are
 * lowercase) and the combo flag exactly `1`; anything else opens nothing. A landing never marks anything seen (D4).
 */
import { isUuid } from "../uuid";

export const PUSH_CARD_PARAM = "push-card";
export const PUSH_COMBO_PARAM = "push-combo";

export type PushLanding = { card: string; combo: boolean };

/** What a landing's address asks Home to open, or null: no card, a repeated card, or one not shaped like an oracle id. */
export function readPushLanding(search: string): PushLanding | null {
  const params = new URLSearchParams(search);
  const cards = params.getAll(PUSH_CARD_PARAM);
  // One card or none: a repeated parameter is not what the worker writes, so it is not a landing.
  if (cards.length !== 1 || !isUuid(cards[0])) return null;
  const combos = params.getAll(PUSH_COMBO_PARAM);
  return { card: cards[0].toLowerCase(), combo: combos.length === 1 && combos[0] === "1" };
}

/**
 * The address with both landing parameters removed (valid or not), or null when it carries neither, so a Home visit that
 * did not come from a push writes nothing.
 */
export function strippedLanding(href: string): URL | null {
  const url = new URL(href);
  if (!url.searchParams.has(PUSH_CARD_PARAM) && !url.searchParams.has(PUSH_COMBO_PARAM)) return null;
  url.searchParams.delete(PUSH_CARD_PARAM);
  url.searchParams.delete(PUSH_COMBO_PARAM);
  return url;
}

/**
 * The app icon's figure (G6): the Home slot's count as the bar shows it, a whole number of at least 0. Zero clears the
 * badge rather than drawing a 0.
 */
export function appBadge(count: number | undefined): { set: number } | "clear" {
  const n = typeof count === "number" && Number.isFinite(count) ? Math.floor(count) : 0;
  return n > 0 ? { set: n } : "clear";
}
