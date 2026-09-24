/**
 * The Shopping limit (swap tools, ruling 4): a per-card dollar figure, remembered per deck, above
 * which a Shopping row is marked. Never off: a deck that has not set one marks rows over $10.
 */
import { priceOf, priceState, type PriceFact } from "../decks/price";

/** The default, in cents. The copy's `reset` names it, so it is one constant. */
export const DEFAULT_LIMIT_CENTS = 1000;

/**
 * The highest limit the field takes: $100,000, above any card's price and well inside the column's
 * `integer` range. The field and the server action refuse past it alike.
 */
export const MAX_LIMIT_CENTS = 10_000_000;

/** The limit a deck marks against: its own, or the default when it has none. */
export function effectiveLimit(stored: number | null): number {
  return stored ?? DEFAULT_LIMIT_CENTS;
}

/**
 * Is this row's card over the limit? Only a figure the row DRAWS can be over it: a card with no
 * price, or one sold out at the newest price run, is never over (audit F5), because nothing about
 * it can be bought at a figure.
 */
export function isOverLimit(fact: PriceFact | null | undefined, newestAsOf: Date | null, limitCents: number): boolean {
  if (!fact) return false;
  const cents = priceOf(fact, priceState(fact, newestAsOf));
  return cents !== null && cents > limitCents;
}

/** A whole-dollar figure for the limit line: `$10`, `$25`. */
export function formatLimit(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * What the `$` field holds, as cents, or null when it is not a whole dollar from 1 to 100,000.
 * Digits only: a comma or a decimal point is refused rather than guessed at.
 */
export function parseLimitDollars(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const dollars = Number(trimmed);
  const cents = dollars * 100;
  return dollars >= 1 && cents <= MAX_LIMIT_CENTS ? cents : null;
}
