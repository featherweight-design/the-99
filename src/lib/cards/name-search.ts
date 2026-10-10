import { ilike, isNotNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { cards, printings } from "../../db/schema";

/**
 * The card-name match every search box shares: the oracle name, or a Secret Lair flavor name
 * (#467), as a case-insensitive substring. Substring rather than prefix on purpose: "gravetide"
 * must find "Muldrotha, the Gravetide". Returns null for a query too short or too long to run.
 *
 * Only the MATCH. Each caller adds its own filters (legality, identity, ownership) and its own
 * limit, because a deck's search and the collection's are different questions over one name
 * match.
 */
export function nameSearch(query: string): {
  /** The flavor names this query caught, one row per card; join it on `oracleId`. */
  flavorHits: ReturnType<typeof flavorHitsFor>;
  /** The WHERE clause: the name matched, or a flavor name did. */
  where: SQL;
  /** The flavor name to show beside a row, or null when the row's own name matched. */
  shownFlavor: (name: string, flavorName: string | null) => string | null;
} | null {
  const q = query.trim();
  if (q.length < 2 || q.length > 100) return null;
  // The query string is parameterized (no SQL injection risk); escaping stops
  // user-typed %/_/\ from acting as LIKE wildcards and changing match behavior.
  const escaped = q.replace(/[\\%_]/g, (m) => `\\${m}`);
  const flavorHits = flavorHitsFor(escaped);
  const lowerQuery = q.toLowerCase();
  return {
    flavorHits,
    // A player typing the name off the front of a Secret Lair card is typing the only
    // name that card shows them, so the flavor name is a first-class way in.
    where: or(ilike(cards.name, `%${escaped}%`), isNotNull(flavorHits.flavorName))!,
    // Dropped when the title itself matched: the flavor name is there to explain a row
    // whose name does not contain what the player typed, and nothing else.
    shownFlavor: (name, flavorName) => (name.toLowerCase().includes(lowerQuery) ? null : flavorName),
  };
}

/**
 * One row per card rather than per printing: a card can have several renamed printings and one
 * row each would multiply the result list.
 *
 * Resolved once, ahead of the scan, rather than as a correlated subquery: the select list and the
 * WHERE clause both need it, and correlated it would be evaluated per candidate card, twice over.
 * Only a few hundred printings have a flavor name at all, and the partial index means this reads
 * those and nothing else.
 */
function flavorHitsFor(escaped: string) {
  return db
    .select({
      oracleId: printings.oracleId,
      flavorName: sql<string>`min(${printings.flavorName})`.as("flavor_name"),
    })
    .from(printings)
    .where(ilike(printings.flavorName, `%${escaped}%`))
    .groupBy(printings.oracleId)
    .as("flavor_hits");
}
