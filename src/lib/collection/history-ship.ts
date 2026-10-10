import journal from "../../../drizzle/meta/_journal.json";

/** The migration that created the ledger: the first moment a change could be recorded. */
const LEDGER_MIGRATION = "0083_collection_history";

/**
 * When history could first record a change, read from the migration journal rather than hard-coded
 * (design F0: an empty history is dated from the ship date, "never hard-code"). It is the same for
 * every account and exists before any entry does. The journal's `when` is the time the migration
 * was written, so it is the ship date as far as the build knows; a deploy that migrates later than
 * that is off by the gap, which the empty state's "from <date> on" tolerates.
 */
export function historyShipDate(): Date {
  const entry = journal.entries.find((e) => e.tag === LEDGER_MIGRATION);
  // A build without the migration cannot have the ledger either, and the route is behind the same
  // switch as the ledger; the epoch keeps the answer total, and the foot's 90-day edge wins anyway.
  return new Date(entry?.when ?? 0);
}
