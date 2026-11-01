/**
 * When a Rule 0 table is open, in ONE place. A table is OPEN iff its setter has not closed it (`closed_at is null`)
 * and its morning has not come (`expires_at > now()`, the database's clock, never one passed in). Every read that
 * decides "open" uses `tableOpen`/`tableOpenAs`; none spells `expires_at > now()` on its own.
 *
 * Two deliberate exceptions, both about a host-closed table's seated players keeping *Log this game* until the morning:
 * `tableLoggable` below, and `setTable`'s cleanup, which deletes only clock-expired rows (`expires_at <= now()`) so a
 * host-closed row lingers until its morning. Neither can shadow a new table: every pod-table lookup filters `tableOpen`.
 *
 */
import { sql } from "drizzle-orm";
import { ruleZeroTables } from "../../db/schema";

/** Open: not closed by its host and not past its morning. Qualified columns, for a query that joins the table. */
export const tableOpen = sql`(${ruleZeroTables.closedAt} is null and ${ruleZeroTables.expiresAt} > now())`;

/** Ended: closed by its host or past its morning. The exact complement of `tableOpen`. */
export const tableEnded = sql`(${ruleZeroTables.closedAt} is not null or ${ruleZeroTables.expiresAt} <= now())`;

/** Still inside its original night: where the game log keeps its seats, whether or not the host closed it. */
export const tableLoggable = sql`${ruleZeroTables.expiresAt} > now()`;

/** `tableOpen` for raw SQL, over a table alias written in this repo's own code (never a client string). */
export const tableOpenAs = (alias: string) => sql.raw(`(${alias}.closed_at is null and ${alias}.expires_at > now())`);
