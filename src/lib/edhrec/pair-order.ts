// The pair's storage order, apart from the fetch code in `pair.ts`, so a cached page's loader can order a pair
// without importing the EDHREC fetch and its degraded fallbacks.

/** The pair, in the order the tables store it: lexicographically smaller oracle id first. */
export type CanonicalPair = { commanderOracleId: string; partnerOracleId: string };

/**
 * THE ONE NORMALISATION, used by every write AND every read.
 *
 * `decks` stores a pair in a meaningful order — `commander_oracle_id` is the primary — while
 * the tables store it canonically, so a lookup that passes the deck's order straight through
 * silently misses every row whose primary carries the larger id. The CHECK constraint makes a
 * bad WRITE loud; only calling this on the read side makes a bad READ loud too.
 */
export function canonicalPair(a: string, b: string): CanonicalPair {
  return a < b
    ? { commanderOracleId: a, partnerOracleId: b }
    : { commanderOracleId: b, partnerOracleId: a };
}
