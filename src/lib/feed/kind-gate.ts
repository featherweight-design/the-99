/**
 * When a news kind turned on for a reader, in SQL (spare requests G4): the ONE rendering of the effective state, so
 * the writer (`recordFeedItemQuery`), the stored branch of the read (`storedFeedBranch`) and Settings' rule
 * (`effectiveKinds`, `prefs.ts`) cannot disagree.
 *
 * - A kind stamped in `feed_kinds` turned on at its stamp.
 * - A DEFAULT-ON kind (`DEFAULT_ON_KINDS`) absent from `feed_kinds` and not in `feed_kinds_declined` has been on since
 *   always: `-infinity`.
 * - Anything else is off: null, which every `created_at > enabledAt` test reads as false.
 *
 * `prefs` is the alias of the reader's `user_prefs` row, which may be MISSING (a left join): every column then reads
 * null, and a default-on kind is still on. Nothing is written on read (`user_prefs` carries the stamp trigger).
 */
import { sql, type SQL } from "drizzle-orm";

import { DEFAULT_ON_KINDS } from "./kinds";

export function kindEnabledAt(prefs: SQL, kind: SQL): SQL {
  return sql`coalesce((${prefs}.feed_kinds ->> ${kind})::timestamptz,
    case when ${kind} = any(${sql.param([...DEFAULT_ON_KINDS])}::text[])
      and not (${kind} = any(coalesce(${prefs}.feed_kinds_declined, '{}'::text[])))
      then '-infinity'::timestamptz end)`;
}
