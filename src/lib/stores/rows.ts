/** A store besides Mana Pool, as `printing_store_prices.store` holds it. */
export type OtherStore = "tcgplayer" | "cardkingdom";

export const OTHER_STORES: readonly OtherStore[] = ["tcgplayer", "cardkingdom"];

/** Every store the app quotes. Mana Pool is the default: a reader with no preference reads its tables. */
export type Store = "manapool" | OtherStore;

/** Every store the app quotes, Mana Pool first: the order Settings lists them in. */
export const STORES: readonly Store[] = ["manapool", ...OTHER_STORES];

/** One row of `printing_store_prices` / `token_store_prices`, before the catalog lookup splits them. */
export type StorePriceRow = {
  scryfallId: string;
  store: OtherStore;
  priceCents: number | null;
  priceCentsFoil: number | null;
  priceCentsEtched: number | null;
  quantity: number | null;
  quantityFoil: number | null;
  quantityEtched: number | null;
  buyUrl: string | null;
  buyUrlFoil: string | null;
  buyUrlEtched: string | null;
  asOf: Date;
};

/**
 * A decimal dollar string (`"0.35"`, `"12.5"`) to whole cents, or null for anything that is not a
 * positive price. Parsed from the string, never through a float, so `"0.29"` is 29 and not 28.999.
 * Zero is null: a store price of nothing is no price, the rule `printing_prices` keeps.
 */
export function dollarsToCents(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!m) return null;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return cents > 0 && Number.isSafeInteger(cents) ? cents : null;
}
