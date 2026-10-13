// The SQL half of `Printed in` (printed-in.ts holds the rule and its client half). Its own module
// so the client components that import printed-in.ts take no drizzle-orm with them
// (`client-imports.test.ts`).
import { sql, type SQL } from "drizzle-orm";
import { normalizeSetCodes } from "./printed-in";

/**
 * True when the card whose oracle id is `oracleId` has a printing in any of `setCodes`. The
 * inner table is aliased and both sides are written out: interpolated into a single-table
 * projection, Drizzle drops the qualifiers and a bare `oracle_id` would compare the printing to
 * itself (AGENTS.md, "A correlated subquery in a single-table select must alias and qualify").
 *
 * An empty selection is no filter at all, so it renders as `true` rather than an `any('{}')`
 * that matches nothing.
 */
export function printedIn(oracleId: SQL | SQL.Aliased | { getSQL(): SQL }, setCodes: readonly string[]): SQL {
  const codes = normalizeSetCodes(setCodes);
  if (codes.length === 0) return sql`true`;
  return sql`exists (
    select 1 from printings pi
    where pi.oracle_id = ${oracleId}
      and pi.set_code = any(${sql.param(codes)}::text[])
  )`;
}
