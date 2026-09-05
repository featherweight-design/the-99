import { arrayContained, sql, type SQL } from "drizzle-orm";
import { cards } from "../../db/schema";

/**
 * "Legal in a commander's colour identity", as a SQL predicate.
 *
 * The empty case is the whole reason this exists. `arrayContained` throws
 * `arrayContained requires at least one value` on an empty array, so a
 * colourless commander crashed every query that filtered by identity — and
 * colourless is a real identity, not an absent one: only cards with an equally
 * empty identity are legal under it. `cardinality(...) = 0` says that, where
 * `@> '{}'` would have been true of every card in the catalog.
 */
export function withinColorIdentity(identity: string[]): SQL {
  return identity.length === 0
    ? sql`cardinality(${cards.colorIdentity}) = 0`
    : arrayContained(cards.colorIdentity, identity);
}
