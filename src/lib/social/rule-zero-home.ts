// Home's `Tonight's table` card (Rule 0 plan, decision 1), read PER REQUEST, outside Home's cached payload: a reseat
// by a player who is not the viewer's friend, a rename and an expiry move nothing that payload's key carries, and no
// stamp trigger sits on the seats. Its own module so `check:list-cache` can hold the claim once Home calls it
// (plan PR 6, which lists it in `PER_REQUEST_READS`): the guard fails if the page calls it inside
// `cachePageForUser`'s load or any cached loader imports it.
import { openTablesFor, type OpenTable } from "./rule-zero";

/**
 * The open tables the viewer sits at, read at request time. Open is decided by the database's clock in the read
 * itself (`openTablesQuery`), so a table that expired a second ago is already gone: Home never draws an expired
 * table as open.
 */
export async function loadHomeTables(viewerId: string): Promise<OpenTable[]> {
  return soonestFirst(await openTablesFor(viewerId));
}

/** Two tables stack with the one closing soonest on top (revisions Home), in the first-run Home as in the full one. */
export function soonestFirst(tables: OpenTable[]): OpenTable[] {
  return [...tables].sort((a, b) => a.closesAt.getTime() - b.closesAt.getTime());
}
