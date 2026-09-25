import type { PriceFact } from "../../lib/decks/price";
import type { PriceSlot } from "../../lib/discovery/price";

/**
 * `BuyTag` reads a `PriceFact` against the table's newest `as_of`; the intake's reads carry the
 * discovery lanes' `PriceSlot`, which has already made that comparison. This states the slot's
 * outcome back in the tag's terms: a live price as a fact dated at the newest instant, a sold-out
 * one as a fact dated before it, and no price as no fact at all (the tag then says only `buy`).
 */
const NEWEST = new Date(0);
const OLDER = new Date(-1);

export function priceFactOf(slot: PriceSlot): { price: PriceFact | null; newestAsOf: Date | null } {
  switch (slot.kind) {
    case "priced":
      return { price: { cents: slot.cents, foilCents: null, etchedCents: null, asOf: NEWEST }, newestAsOf: NEWEST };
    case "notStocked":
      return { price: { cents: null, foilCents: null, etchedCents: null, asOf: OLDER }, newestAsOf: NEWEST };
    case "absent":
      return { price: null, newestAsOf: null };
  }
}
