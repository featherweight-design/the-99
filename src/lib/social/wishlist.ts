/**
 * A friend's wishlist (Hugh's ruling Q7, 2026-10-12: the wishlist is VISIBLE to friends). Like every
 * cross-user read it lives here and joins the grant on the viewer in the SAME statement: the viewer's own
 * `friend_links` row to the friend named by `public_id`. A stranger, a forged id or a former friend reads
 * nothing. What comes back is the card (with the catalog's name and full card image, for the friend page's
 * tiles) and how many the friend wants; never how many they own, and never anything of their decks.
 *
 * A line the friend's collection already reaches is COLLECTED and is left out (Social R2 G5, Hugh, 2026-10-15):
 * it leaves the friend's own list at the write that reached it, and a line no chokepoint has swept yet must not
 * show here either. So there is no "got": every line returned is still wanted, and a friend's tile reads
 * `wants N` only (round 3).
 *
 * The friend's wishlist is the union of their hand-added and deck-synced lines (`lib/wishlist/lines.ts`). The synced
 * side here is cut to the decks THIS viewer may see (cart on your wishlist, H1): a source deck counts only when
 * `friendCanSeeDeck` passes (not hidden from friends, the owner's Show my decks on, and Include unfinished on or the
 * deck not New, Draft or Building, the pill class the sync stored as `unfinished`). The want drops each hidden deck's
 * copies, and a line whose every deck is hidden is not there at all, so a hidden deck never shows through a card or a
 * number. Every reader of a friend's wants (the tab, You have it's gap, the Friends chip) reads this one view.
 */
import { sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { cards, decks, friendLinks, socialProfiles, userPrefs, wishlistSynced, wishlistSyncedDecks } from "../../db/schema";
import { heldCopies } from "../wishlist/held";
import { handSide, oracleFilter, unionLines, type LineSide } from "../wishlist/lines";
import { DEFAULT_FRIEND_DECK_PREFS } from "./deck-visibility-rule";
import { isUuid } from "./rules";

export type FriendWishlistLine = {
  oracleId: string;
  quantity: number;
  name: string;
  /** The catalog's full card image; null for a card Scryfall has no image of. */
  imageUri: string | null;
  layout: string;
  backImageUri: string | null;
};

/**
 * Whether the friend sees the source deck `sdk` (left-joined: a missing deck is not seen), by its owner's prefs `sup`
 * (left-joined: no row reads the columns' defaults, `DEFAULT_FRIEND_DECK_PREFS`). `friendCanSeeDeck` in SQL.
 */
const sourceVisible = sql`coalesce(sdk.id is not null and not sdk.hidden_from_friends
  and coalesce(sup.friends_see_decks, ${sql.raw(String(DEFAULT_FRIEND_DECK_PREFS.seeDecks))})
  and (coalesce(sup.friends_see_unfinished, ${sql.raw(String(DEFAULT_FRIEND_DECK_PREFS.seeUnfinished))}) or not sd.unfinished), false)`;

/**
 * The synced lines of `owners`, as a friend sees them: visible decks' copies only, and only lines with one. The want is
 * rebuilt as the copies held at the sync plus the visible decks' deficits, capped at 99 like the stored want; never the
 * stored want minus the hidden decks', which would undercount a line the cap clipped.
 */
export function visibleSyncedSide(owners: SQL, oracleIds?: readonly string[]): LineSide {
  return sql`select sw.user_id, sw.oracle_id, null::uuid as scryfall_id,
      least(99, sw.held + coalesce(sum(sd.quantity) filter (where ${sourceVisible}), 0))::int as quantity, sw.created_at,
      ${heldCopies(sql`sw.user_id`, sql`sw.oracle_id`, sql`null`)} as owned, null::text[] as deck_ids
    from ${wishlistSynced} sw
    join ${wishlistSyncedDecks} sd on sd.user_id = sw.user_id and sd.oracle_id = sw.oracle_id
    left join ${decks} sdk on sdk.id = sd.deck_id and sdk.user_id = sw.user_id
    left join ${userPrefs} sup on sup.user_id = sw.user_id
    where sw.user_id in (${owners})${oracleFilter(sql`sw.oracle_id`, oracleIds)}
    group by sw.user_id, sw.oracle_id, sw.held, sw.created_at, sup.friends_see_decks, sup.friends_see_unfinished
    having bool_or(${sourceVisible})`;
}

/**
 * A friend's still-wanted lines as this viewer may see them, optionally only `oracleIds`. `owners` must already be cut
 * to the viewer's grant.
 */
function friendLines(owners: SQL, oracleIds?: readonly string[]): SQL {
  return unionLines(handSide(owners, oracleIds), visibleSyncedSide(owners, oracleIds));
}

/** The one friend named by `friendPublicId`, through the viewer's own friendship row. */
const grantedFriend = (viewerId: string, friendPublicId: string) => sql`select fl.friend_user_id from ${friendLinks} fl
  join ${socialProfiles} fsp on fsp.user_id = fl.friend_user_id
  where fl.user_id = ${viewerId} and fsp.public_id = ${friendPublicId}::uuid`;

/** Every friend of the viewer, through the viewer's own friendship rows. */
const grantedFriends = (viewerId: string) => sql`select fl.friend_user_id from ${friendLinks} fl where fl.user_id = ${viewerId}`;

/** Apart so a test can render its SQL. */
export function friendWishlistQuery(viewerId: string, friendPublicId: string): SQL {
  return sql`select fu.oracle_id, fu.quantity, fc.name, fc.image_uri, fc.layout, fc.back_image_uri
    from (${friendLines(grantedFriend(viewerId, friendPublicId))}) fu
    join ${cards} fc on fc.oracle_id = fu.oracle_id
    order by fu.added_at desc, fu.oracle_id`;
}

export async function loadFriendWishlist(viewerId: string, friendPublicId: unknown): Promise<FriendWishlistLine[]> {
  if (!isUuid(friendPublicId)) return [];
  const { rows } = await db.execute<{
    oracle_id: string; quantity: number; name: string; image_uri: string | null; layout: string; back_image_uri: string | null;
  }>(friendWishlistQuery(viewerId, friendPublicId));
  return rows.map((r) => ({
    oracleId: r.oracle_id, quantity: Number(r.quantity), name: r.name, imageUri: r.image_uri, layout: r.layout, backImageUri: r.back_image_uri,
  }));
}

/**
 * How many copies of each named card the friend still lacks (You have it, G3): the union's `gap`, the larger
 * copies-short of the friend's still-wanted sides (never a sum: two sides can count the same copies), through the
 * viewer's own friend grant like `friendWishlistQuery`. A card the friend does not want (or already holds enough of)
 * is absent. SERVER ONLY: `held` is the friend's data, so this feeds a write's copy count and is never sent to a
 * client (the tab draws `wants N`, nothing more).
 */
export function friendWantedGapQuery(viewerId: string, friendPublicId: string, oracleIds: readonly string[]): SQL {
  return sql`select fg.oracle_id, fg.gap::int as gap
    from (${friendLines(grantedFriend(viewerId, friendPublicId), oracleIds)}) fg`;
}

export async function loadFriendWantedGap(viewerId: string, friendPublicId: unknown, oracleIds: readonly unknown[]): Promise<Map<string, number>> {
  const ids = [...new Set(oracleIds.filter(isUuid))];
  if (!isUuid(friendPublicId) || ids.length === 0) return new Map();
  const { rows } = await db.execute<{ oracle_id: string; gap: number }>(friendWantedGapQuery(viewerId, friendPublicId, ids));
  return new Map(rows.map((r) => [r.oracle_id, Number(r.gap)]));
}

/** Apart so a test can render its SQL. */
export function friendsWantedPairsQuery(viewerId: string): SQL {
  return sql`select distinct fsp.public_id::text as public_id, fp.oracle_id
    from (${friendLines(grantedFriends(viewerId))}) fp
    join ${socialProfiles} fsp on fsp.user_id = fp.user_id`;
}

/**
 * Every friend's still-wanted cards as (friend public id, oracle id) pairs, through the viewer's own friend grants (You
 * have it, G7: `/friends` counts what the viewer can spare of them). Names a card only, never a quantity or `held`.
 */
export async function loadFriendsWantedPairs(viewerId: string): Promise<{ publicId: string; oracleId: string }[]> {
  const { rows } = await db.execute<{ public_id: string; oracle_id: string }>(friendsWantedPairsQuery(viewerId));
  return rows.map((r) => ({ publicId: r.public_id, oracleId: r.oracle_id }));
}
