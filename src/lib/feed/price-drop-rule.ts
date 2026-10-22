/**
 * G2's price-drop rule (menu and Home handoff, README G2; a PLACEHOLDER Design may tune): a wishlisted card's
 * cheapest printing falls 20% or $2 below its price when it was wishlisted, told at most once a week per card.
 * Pure, so the job (`price-drop.ts`) and its tests share one definition. Client-safe: no imports.
 */

/** The fall that counts as a drop: to 80% of the price at add or below, or $2 (200 cents) under it or more. */
export const DROP_SHARE_NUMERATOR = 4;
export const DROP_SHARE_DENOMINATOR = 5;
export const DROP_CENTS = 200;
/** "At most once a week per card." */
export const NOTICE_EVERY_MS = 7 * 86_400_000;

export type PriceDropFacts = {
  /** `wishlist_items.price_at_add_cents`: null before the baseline exists. */
  atAddCents: number | null;
  /** Today's cheapest live figure (`priceOf` over `priceState`): null when the card is sold out or never stocked. */
  nowCents: number | null;
  /** `wishlist_items.price_noticed_at`: when this reader was last told about this card, or null. */
  noticedAt: Date | null;
  now: Date;
};

/**
 * Whether this line's card is news this run. Whole-cent arithmetic only (`now × 5 ≤ atAdd × 4` is "≤ 80%"), so a
 * float never decides a boundary. A missing figure on either side is never a drop: a sold-out card has no price to
 * be cheaper at, and a line with no baseline gets one first.
 */
export function priceDropped(f: PriceDropFacts): boolean {
  if (f.atAddCents === null || f.nowCents === null || f.atAddCents <= 0 || f.nowCents < 0) return false;
  if (f.noticedAt !== null && f.now.getTime() - f.noticedAt.getTime() < NOTICE_EVERY_MS) return false;
  return f.nowCents * DROP_SHARE_DENOMINATOR <= f.atAddCents * DROP_SHARE_NUMERATOR || f.nowCents <= f.atAddCents - DROP_CENTS;
}

/** The ISO 8601 week of `d` in UTC, as `2026-W43`: a price drop's dedupe key is the card and this week. */
export function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // The Thursday of this week decides its year (ISO 8601): Monday is day 1, Sunday day 7.
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((t.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** The feed item's dedupe key: one price-drop item per card per ISO week, whatever the job's run count. */
export const priceDropKey = (oracleId: string, now: Date): string => `${oracleId}:${isoWeek(now)}`;
