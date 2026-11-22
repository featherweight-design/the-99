/**
 * When a Rule 0 table is open, in ONE place. A table is OPEN iff its setter has not closed it (`closed_at is null`)
 * and its morning has not come (`expires_at > now()`, the database's clock, never one passed in). Every read that
 * decides "open" uses `tableOpen`/`tableOpenAs`; none spells `expires_at > now()` on its own.
 *
 * Two deliberate exceptions, both about a seated player keeping *Log this game* after the night:
 * `tableKept` below, and `setTable`'s cleanup, which deletes only rows a week past their morning (`tablePastKept`), so a
 * clock-expired or host-closed row lingers that long. Neither can shadow a new table: every pod-table lookup filters
 * `tableOpen`, so a kept row never reads as open. `tableLoggable` stays inside the night (the tracker's own window).
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

/** Within a week of its morning (the database's clock): where an ended table still draws its closed page and the log's prefill. A kept table is NOT open; see `tableOpen`. */
export const tableKept = sql`(${ruleZeroTables.expiresAt} + interval '7 days' > now())`;

/** Past its keep window: the rows `setTable` deletes. The exact complement of `tableKept`. */
export const tablePastKept = sql`(${ruleZeroTables.expiresAt} + interval '7 days' <= now())`;

/** `tableOpen` for raw SQL, over a table alias written in this repo's own code (never a client string). */
export const tableOpenAs = (alias: string) => sql.raw(`(${alias}.closed_at is null and ${alias}.expires_at > now())`);
