/**
 * The feed's STORED items as the viewer may see them (menu and Home, G1; plan `2026-10-22-menu-home.md`, "The feed
 * model"). It lives here because a stored item can name a friend (`feed_items.friend_user_id`), and every read that
 * reaches another account joins the live grant on the viewer in the same statement (`check:social-reads`).
 *
 * The persisted row never proves the friendship. Each read re-checks it:
 * - a TRADE MATCH ("Colin has a spare") stands only while Colin's spares are still shared with the viewer: the
 *   `spares.ts` grant (the friendship, a pod Colin shares spares with and is still in, the viewer in that pod);
 * - any other item naming a friend stands only while the two are still friends.
 * An unfriend, a pod left or a share turned off drops the row from the feed and from both badges at once, with no
 * write. What comes back names the friend by `social_profiles.public_id` and display name, never a Clerk id.
 *
 * A fragment, not a query: `lib/feed/read.ts` unions it with the catalog kinds, so the feed, Home's count and the
 * Friends count are each one statement.
 */
import { sql, type SQL } from "drizzle-orm";
import { feedItems, friendLinks, podMembers, podSpareShares, socialProfiles, userPrefs } from "../../db/schema";
import type { StoredKind } from "../feed/kinds";

/**
 * The stored branch of the feed union, for `viewerId`, of `kinds` (non-empty; already the kinds available to the
 * reader). Each row is newer than its kind's own `enabledAt` in `user_prefs.feed_kinds`, so a kind turned off and on
 * again never brings back what it held before; a kind that is off has no `enabledAt` and reads nothing.
 *
 * Columns, in the union's order: kind, key, created_at, code, name, file_name, oracle_id, variant_id,
 * friend_public_id, friend_name, data. Every column is written out by alias (AGENTS.md, alias and qualify).
 */
export function storedFeedBranch(viewerId: string, kinds: readonly StoredKind[]): SQL {
  return sql`select fi.kind as kind, 'item:' || fi.id::text as key, fi.created_at as created_at,
      null::text as code, null::text as name, null::text as file_name,
      fi.oracle_id as oracle_id, fi.variant_id as variant_id,
      sp.public_id as friend_public_id, sp.display_name as friend_name, fi.data as data
    from ${feedItems} fi
    join ${userPrefs} fup on fup.user_id = fi.user_id
    left join ${socialProfiles} sp on sp.user_id = fi.friend_user_id
    where fi.user_id = ${viewerId}
      and fi.kind = any(${sql.param([...kinds])}::text[])
      and fi.created_at > (fup.feed_kinds ->> fi.kind)::timestamptz
      and (fi.friend_user_id is null or (sp.public_id is not null and (
        (fi.kind = 'trade-match' and exists (
          select 1 from ${friendLinks} gl
          join ${podSpareShares} gs on gs.user_id = gl.friend_user_id
          join ${podMembers} gf on gf.pod_id = gs.pod_id and gf.user_id = gl.friend_user_id
          join ${podMembers} gv on gv.pod_id = gs.pod_id and gv.user_id = gl.user_id
          where gl.user_id = fi.user_id and gl.friend_user_id = fi.friend_user_id))
        or (fi.kind <> 'trade-match' and exists (
          select 1 from ${friendLinks} gl
          where gl.user_id = fi.user_id and gl.friend_user_id = fi.friend_user_id)))))`;
}
