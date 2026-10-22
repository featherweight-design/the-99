/**
 * The push twin of `kindEnabledAt` (`lib/feed/kind-gate.ts`): the instant a kind's PUSH came on for a reader, from
 * `user_prefs.push_kinds` (kind -> ISO instant), or `-infinity` for a default-on kind they have not declined in
 * `push_kinds_declined`, else null (off). Same rule, same default-on set, other two columns. `prefs` is the alias of
 * the `user_prefs` row, LEFT JOINED, so a reader with no row reads as every column null.
 */
import { sql, type SQL } from "drizzle-orm";

import { DEFAULT_ON_KINDS } from "../feed/kinds";

export function pushKindEnabledAt(prefs: SQL, kind: SQL): SQL {
  return sql`coalesce((${prefs}.push_kinds ->> ${kind})::timestamptz,
    case when ${kind} = any(${sql.param([...DEFAULT_ON_KINDS])}::text[])
      and not (${kind} = any(coalesce(${prefs}.push_kinds_declined, '{}'::text[])))
      then '-infinity'::timestamptz end)`;
}
