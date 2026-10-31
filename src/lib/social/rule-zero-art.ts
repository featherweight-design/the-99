// Rule 0's deck art: the copy each deck's OWNER holds, as a deck tile draws it (`resolveCommanderPrintingsByDeck`),
// never `cards.art_crop_uri` alone, which is one arbitrary printing's crop. Resolved per owner, never per viewer: a
// friend's seat draws the printing in the friend's box.
//
// The grant is re-checked on the viewer in ONE statement (`grantedDecksQuery`), whatever the caller passes: a deck is
// drawn only when it is the viewer's own, sits at a Rule 0 table the viewer sits at (both players still in its pod),
// or belongs to a friend who shares a pod with the viewer and lets friends see it. Only the owners of the decks that
// statement returns have their collection read, for those decks alone, and nothing but an image URL leaves. Fail-soft,
// as the tiles are: a card its owner does not hold, or a read that fails, leaves the oracle art the caller holds.
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { decks, friendLinks, podMembers, ruleZeroSeats, ruleZeroTables, userPrefs } from "../../db/schema";
import { recordSoftFailure } from "../cache/soft-failure";
import { resolveCommanderPrintingsByDeck } from "../decks/printings";

/** A deck's owned crops: null where the owner does not hold that card, and the caller keeps its oracle art. */
export type DeckArt = { commander: string | null; partner: string | null };

/** The asked decks the viewer may see, with their owners and commanders. Raw and aliased; apart so a test can render it. */
export function grantedDecksQuery(viewerId: string, deckIds: readonly string[]) {
  return sql`
    select d.id as "deckId", d.user_id as "ownerId", d.commander_oracle_id as "commanderOracleId", d.partner_oracle_id as "partnerOracleId"
    from ${decks} d
    left join ${userPrefs} up on up.user_id = d.user_id
    where d.id in (${sql.join(deckIds.map((id) => sql`${id}`), sql`, `)})
      and (
        d.user_id = ${viewerId}
        or exists (
          select 1 from ${ruleZeroSeats} s
          join ${ruleZeroTables} t on t.id = s.table_id
          join ${ruleZeroSeats} vs on vs.table_id = s.table_id and vs.user_id = ${viewerId}
          join ${podMembers} vm on vm.pod_id = t.pod_id and vm.user_id = ${viewerId}
          join ${podMembers} sm on sm.pod_id = t.pod_id and sm.user_id = s.user_id
          where s.deck_id = d.id and s.user_id = d.user_id)
        or (not d.hidden_from_friends and coalesce(up.friends_see_decks, true) and exists (
          select 1 from ${friendLinks} fl
          join ${podMembers} vm on vm.user_id = ${viewerId}
          join ${podMembers} om on om.pod_id = vm.pod_id and om.user_id = fl.friend_user_id
          where fl.user_id = ${viewerId} and fl.friend_user_id = d.user_id)))`;
}

type GrantedDeck = { deckId: string; ownerId: string; commanderOracleId: string; partnerOracleId: string | null };

/** Each granted deck's owned commander and partner crops, keyed by deck id; a deck the viewer may not see is absent. */
export async function ownedDeckArt(viewerId: string, deckIds: readonly string[]): Promise<Map<string, DeckArt>> {
  const out = new Map<string, DeckArt>();
  if (deckIds.length === 0) return out;
  const rows = await db
    .execute<GrantedDeck>(grantedDecksQuery(viewerId, [...new Set(deckIds)]))
    .then((r) => r.rows)
    .catch(() => {
      recordSoftFailure();
      return [] as GrantedDeck[];
    });
  const byOwner = new Map<string, GrantedDeck[]>();
  for (const r of rows) byOwner.set(r.ownerId, [...(byOwner.get(r.ownerId) ?? []), r]);
  await Promise.all([...byOwner].map(async ([ownerId, own]) => {
    const [commanders, partners] = await Promise.all([
      resolveCommanderPrintingsByDeck(ownerId, own.map((r) => ({ deckId: r.deckId, commanderOracleId: r.commanderOracleId }))),
      resolveCommanderPrintingsByDeck(ownerId, own.flatMap((r) => (r.partnerOracleId ? [{ deckId: r.deckId, commanderOracleId: r.partnerOracleId }] : []))),
    ]);
    for (const r of own) {
      out.set(r.deckId, { commander: commanders.get(r.deckId)?.artCropUri ?? null, partner: partners.get(r.deckId)?.artCropUri ?? null });
    }
  }));
  return out;
}
