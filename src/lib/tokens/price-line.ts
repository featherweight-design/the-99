import type { ManapoolLine } from "../manapool/links";
import type { TokenPriceFact } from "./price";

// No database import: this module is reached from client components (the row's "sent" line), and `./price`
// pulls the database client in. Types only come from there, and are erased.

const SENDABLE_NUMBER = /^[0-9A-Za-z-]+$/;

/**
 * The line a Mana Pool link sends for one token: Mana Pool's name, set and number for the product
 * the price belongs to, so the line is placed on exactly that product. A row without them sends the
 * token's name alone, which Mana Pool still places by name (it just cannot promise the printing).
 */
export function tokenManapoolLine(tokenName: string, quantity: number, fact: TokenPriceFact): ManapoolLine {
  const { productName, productSet, productNumber } = fact.printing;
  // A number outside letters, digits and hyphens (`1★`, a promo mark) is one Mana Pool's mass entry
  // cannot place EXACTLY: measured 2026-10-11, `Angel // Demon [PHEL] 1★` is placed by name and
  // counted not-exact, with or without the star. The name alone is placed and counted exact, so the
  // line degrades to the name rather than naming a printing the page will not accept.
  // A missing name is treated like a missing coordinate: Mana Pool's coordinates beside Scryfall's name
  // would name a product the line does not match (a double-faced token card is `A // B`, not `A`).
  if (!productName || !productSet || !productNumber || !SENDABLE_NUMBER.test(productNumber)) return { name: productName ?? tokenName, quantity };
  return { name: productName, quantity, printing: { setCode: productSet, collectorNumber: productNumber } };
}
