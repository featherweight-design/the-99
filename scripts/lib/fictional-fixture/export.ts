// The fixture as plain JSON, read back from the database the generator wrote (the one source of truth), keyed by the
// deterministic ids. Shape: docs/agents/fictional-fixture.md. No Clerk id appears: users are `player` and friend names.
import type { Ctx } from "./context";
import { PLAYER_NAME } from "./names";
import { ABOUT_DECK_IDS, FIXTURE_SEED } from "./rng";

type Row = Record<string, unknown>;

export async function buildExport(ctx: Ctx): Promise<Row> {
  const { sql, viewer } = ctx;
  const q = async (s: Promise<unknown[]>): Promise<Row[]> => (await s) as Row[];
  const collection = await q(sql`select ci.oracle_id::text "oracleId", c.name, ci.set_code "set", ci.collector_number "number",
      ci.finish, ci.quantity "count", ci.condition, ci.scryfall_id::text "scryfallId"
    from collection_items ci join cards c on c.oracle_id = ci.oracle_id where ci.user_id = ${viewer}
    order by ci.oracle_id, ci.set_code, ci.collector_number, ci.finish`);
  const deckRows = await q(sql`select d.id::text, d.name, d.commander_oracle_id::text "commanderOracleId", c.name "commanderName"
    from decks d join cards c on c.oracle_id = d.commander_oracle_id where d.user_id = ${viewer} order by d.id`);
  const roleOf = new Map(Object.entries(ABOUT_DECK_IDS).map(([role, id]) => [id, role]));
  const decks: Row[] = [];
  for (const d of deckRows) {
    const id = d.id as string;
    const cards = await q(sql`select dc.oracle_id::text "oracleId", c.name, dc.quantity from deck_cards dc join cards c on c.oracle_id = dc.oracle_id
      where dc.deck_id = ${id} order by dc.oracle_id`);
    const versions = await q(sql`select v.number, v.note, v.committed_at "committedAt", v.id::text vid from deck_versions v where v.deck_id = ${id} order by v.number`);
    for (const v of versions) {
      v.cards = await q(sql`select vc.oracle_id::text "oracleId", c.name, vc.quantity from deck_version_cards vc join cards c on c.oracle_id = vc.oracle_id
        where vc.version_id = ${v.vid as string} order by vc.oracle_id`);
      delete v.vid;
    }
    const locked = await q(sql`select oracle_id::text "oracleId" from deck_locks where deck_id = ${id} and removed_at is null order by 1`);
    const notes = await q(sql`select body from deck_notes where deck_id = ${id} order by created_at, body`);
    decks.push({
      role: roleOf.get(id) ?? null, id, name: d.name, commander: { oracleId: d.commanderOracleId, name: d.commanderName },
      cards, versions, locked: locked.map((l) => l.oracleId), notes: notes.map((n) => n.body),
    });
  }
  const games = await q(sql`select g.id::text, g.deck_id::text "deckId", g.result, g.pod_size "podSize", g.played_at "playedAt", v.number "versionNumber"
    from deck_games g left join deck_versions v on v.id = g.version_id where g.user_id = ${viewer} order by g.played_at, g.id`);
  for (const g of games) {
    g.opponents = await q(sql`select seat, coalesce(friend_name_then, label) name, deck_name_then "deckName", commander_oracle_id::text "commanderOracleId", won
      from deck_game_opponents where game_id = ${g.id as string} order by seat`);
  }
  const friends = await q(sql`select p.display_name name,
      coalesce((select json_agg(pd.name order by pd.name) from pod_members pm join pods pd on pd.id = pm.pod_id where pm.user_id = p.user_id), '[]'::json) pods,
      coalesce((select json_agg(json_build_object('oracleId', ci.oracle_id::text, 'quantity', ci.quantity) order by ci.oracle_id)
        from collection_items ci where ci.user_id = p.user_id), '[]'::json) spares
    from social_profiles p where p.user_id <> ${viewer} order by p.display_name`);
  const wishlist = await q(sql`select oracle_id::text "oracleId", quantity from wishlist_items where user_id = ${viewer} order by oracle_id`);
  const uploads = await q(sql`select filename, row_count "rowCount", confirmed_at "confirmedAt" from csv_uploads where user_id = ${viewer} order by created_at`);
  return {
    format: 1, seed: FIXTURE_SEED, player: { name: PLAYER_NAME }, deckIds: ABOUT_DECK_IDS,
    collection, decks, games, friends, wishlist, uploads,
  };
}
