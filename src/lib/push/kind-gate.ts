/**
 * The push twin of `kindEnabledAt` (`lib/feed/kind-gate.ts`): the instant a kind's PUSH came on for a reader, from
 * `user_prefs.push_kinds` (kind -> ISO instant), or `-infinity` for a default-on kind they have not declined in
 * `push_kinds_declined`, else null (off). Same rule, same default-on set, other two columns. `prefs` is the alias of
 * the `user_prefs` row, LEFT JOINED, so a reader with no row reads as every column null.
 */
import { sql, type SQL } from "drizzle-orm";

import { DEFAULT_ON_KINDS } from "../feed/kinds";
import { pushSubscriptions } from "../../db/schema";

export function pushKindEnabledAt(prefs: SQL, kind: SQL): SQL {
  return sql`coalesce((${prefs}.push_kinds ->> ${kind})::timestamptz,
    case when ${kind} = any(${sql.param([...DEFAULT_ON_KINDS])}::text[])
      and not (${kind} = any(coalesce(${prefs}.push_kinds_declined, '{}'::text[])))
      then '-infinity'::timestamptz end)`;
}

/**
 * Whether a producer should look at this reader for a kind at all: its FEED kind is on, or the reader has a device and its
 * PUSH kind is on (push is its own choice, so it works with the feed kind off). A producer's cheap pre-filter, read before
 * it computes anything; the stamps still decide what each item may be written for (`recordFeedItem`). `prefs` is the alias of
 * the reader's `user_prefs` row, `userId` the reader's id column, `kind` a stored kind's name.
 */
export function feedOrPushWanted(prefs: SQL, userId: SQL, kind: string): SQL {
  return sql`((${prefs}.feed_kinds ->> ${kind}::text) is not null
    or ((${prefs}.push_kinds ->> ${kind}::text) is not null
      and exists (select 1 from ${pushSubscriptions} wnt where wnt.user_id = ${userId})))`;
}
