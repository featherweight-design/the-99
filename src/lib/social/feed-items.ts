/**
 * The feed's STORED items as the viewer may see them (menu and Home, G1; plan `2026-10-22-menu-home.md`, "The feed
 * model"). It lives here because a stored item can name a friend (`feed_items.friend_user_id`), and every read that
 * reaches another account joins the live grant on the viewer in the same statement (`check:social-reads`).
 *
 * The persisted row never proves the friendship. Each read re-checks it:
 * - a TRADE MATCH ("Colin has a spare") stands only while Colin's spares are still shared with the viewer: the
 *   `spares.ts` grant (the friendship, a pod Colin shares spares with and is still in, the viewer in that pod);
 * - any other item naming a friend stands only while the two are still friends.
 * - and a trade match stands only while Colin has NOT kept that card back (`spare_keep`, his `friend_user_id` and the
 *   row's `oracle_id`). Keeping a card back is his withdrawal of the offer, so it retracts the match. A later change
 *   to his threshold or to how many spare copies he holds does NOT: the row is a dated notice, like a price drop that
 *   later rises again (lead's ruling, PR #2184 review round 1).
 * - a SPARE REQUEST ("Ann wants your spare") stands only while its ask (`spare_requests`, by the request id the writer
 *   used as the dedupe key) is still open and unexpired: answering it, or fourteen days passing, drops it with no write.
 *   An ANSWER to the reader's own ask ("Colin can spare Jace", `answerOf`) stands while that ask still holds the answer
 *   it reports and the asker has not cleared it from Your requests (where its press leads), and the holder is still a friend.
 * An unfriend, a pod left, a share turned off or a card kept back drops the row from the feed and from both badges at once, with no
 * write. What comes back names the friend by `social_profiles.public_id` and display name, never a Clerk id.
 *
 * A fragment, not a query: `lib/feed/read.ts` unions it with the catalog kinds, so the feed, Home's count and the
 * Friends count are each one statement.
 */
import { sql, type SQL } from "drizzle-orm";
import { feedItems, friendLinks, podMembers, podSpareShares, socialProfiles, spareKeep, spareRequests, userPrefs } from "../../db/schema";
import { openFloor } from "./spare-request-rules";
import { kindEnabledAt } from "../feed/kind-gate";
import type { StoredKind } from "../feed/kinds";

/**
 * The conditions that make a stored item STAND, on `fi` (the item), `sp` (the friend's profile) and the grant tables: a
 * spare request while its ask is open and unexpired, an item naming a friend while the friendship (and, for a trade
 * match, the shared spares) still holds. Shared by the feed's branch and the push resolver, so a push is made only for
 * what Home would still show.
 */
function standing(now: Date): SQL {
  return sql`
      and (fi.kind <> 'spare-request' or exists (
        select 1 from ${spareRequests} fsr
        where fsr.id = (case when fi.kind = 'spare-request' then fi.dedupe_key::uuid end)
          and (case when fi.data ->> 'answer' is not null
            then fsr.asker_user_id = fi.user_id and fsr.status = fi.data ->> 'answer' and fsr.asker_cleared_at is null
            else fsr.holder_user_id = fi.user_id and fsr.status = 'open'
              and fsr.created_at > ${openFloor(now).toISOString()}::timestamptz end)))
      and (fi.friend_user_id is null or (sp.public_id is not null and (
        (fi.kind = 'trade-match' and exists (
          select 1 from ${friendLinks} gl
          join ${podSpareShares} gs on gs.user_id = gl.friend_user_id
          join ${podMembers} gf on gf.pod_id = gs.pod_id and gf.user_id = gl.friend_user_id
          join ${podMembers} gv on gv.pod_id = gs.pod_id and gv.user_id = gl.user_id
          where gl.user_id = fi.user_id and gl.friend_user_id = fi.friend_user_id)
          and not exists (
            select 1 from ${spareKeep} sk
            where sk.user_id = fi.friend_user_id and sk.oracle_id = fi.oracle_id))
        or (fi.kind <> 'trade-match' and exists (
          select 1 from ${friendLinks} gl
          where gl.user_id = fi.user_id and gl.friend_user_id = fi.friend_user_id)))))`;
}

/**
 * The stored branch of the feed union, for `viewerId`, of `kinds` (non-empty; already the kinds available to the
 * reader). Each row is newer than its kind's own `enabledAt` (`kindEnabledAt`: its `user_prefs.feed_kinds` stamp, or
 * always for a default-on kind the reader has not declined), so a kind turned off and on again never brings back what
 * it held before; a kind that is off has no `enabledAt` and reads nothing. The prefs row is LEFT JOINED: a reader
 * with none still reads a default-on kind (G4).
 *
 * Columns, in the union's order: kind, key, created_at, code, name, file_name, oracle_id, variant_id,
 * friend_public_id, friend_name, data. Every column is written out by alias (AGENTS.md, alias and qualify), and typed
 * as the catalog branches type it: `public_id` is a uuid and the union's other branches give `null::text`, which
 * Postgres refuses to match ("UNION types text and uuid cannot be matched"), so it is cast to text.
 */
export function storedFeedBranch(viewerId: string, kinds: readonly StoredKind[], now: Date): SQL {
  return sql`select fi.kind as kind, 'item:' || fi.id::text as key, fi.created_at as created_at,
      null::text as code, null::text as name, null::text as file_name,
      fi.oracle_id as oracle_id, fi.variant_id as variant_id,
      sp.public_id::text as friend_public_id, sp.display_name as friend_name, fi.data as data
    from ${feedItems} fi
    left join ${userPrefs} fup on fup.user_id = fi.user_id
    left join ${socialProfiles} sp on sp.user_id = fi.friend_user_id
    where fi.user_id = ${viewerId}
      and fi.kind = any(${sql.param([...kinds])}::text[])
      and fi.created_at > ${kindEnabledAt(sql`fup`, sql`fi.kind`)}
      ${standing(now)}`;
}

/**
 * Stored items by their opaque feed keys (`item:<id>`, the outbox's own `item_key` and Home's own key), for one reader,
 * regardless of the reader's FEED toggles (push can be on with the feed kind off) but only while each item still STANDS
 * (`standing`). Never by a writer's dedupe key: a trade match's names another account. Columns match the union's, with
 * `unseen` false: the push never reads the cursor.
 */
export function storedItemsByKeyQuery(viewerId: string, refs: readonly { kind: StoredKind; key: string }[], now: Date): SQL | null {
  if (refs.length === 0) return null;
  const pairs = sql.join(refs.map((r) => sql`(${r.kind}::text, ${r.key}::text)`), sql`, `);
  return sql`select fi.kind as kind, 'item:' || fi.id::text as key, fi.created_at as created_at,
      null::text as code, null::text as name, null::text as file_name,
      fi.oracle_id as oracle_id, fi.variant_id as variant_id,
      sp.public_id::text as friend_public_id, sp.display_name as friend_name, fi.data as data,
      false as unseen
    from ${feedItems} fi
    left join ${socialProfiles} sp on sp.user_id = fi.friend_user_id
    where fi.user_id = ${viewerId}
      and (fi.kind, 'item:' || fi.id::text) in (${pairs})
      ${standing(now)}`;
}
