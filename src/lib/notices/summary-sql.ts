import { sql } from "drizzle-orm";

import { cards, deckCards, deckDataChanges, deckProfiles, decks } from "../../db/schema";

/**
 * The deck list's notice, for the tile (plan D6): `none | unread | notLegalUnread | notLegalRead`.
 * Legality wins the mark's ink (HANDOFF §1; the tile marker addendum draws ONE mark, H7). A
 * legality kind also carries the unread DATA count beside it (addendum F20), so the tile's tooltip
 * and its spoken name can name both. A data notice the player has read draws nothing on the tile,
 * so it reads as none here, and as 0 beside a legality kind.
 */
export type NoticeSummary =
  | { kind: "unread"; count: number }
  | { kind: "notLegalUnread" | "notLegalRead"; count: number; dataUnread: number }
  | null;

/**
 * The same two rules `loadDeckNotices` applies, as one correlated subquery for the list, so the
 * tile never pays a query per deck:
 *
 * - LEGALITY is `rulesViolations`: any current card (commanders included) not legal in Commander,
 *   and any non-commander card whose identity falls outside the commanders'. Read against
 *   `decks.notices_legal_seen` as a SET (readiness F11).
 * - DATA is `touches`: past the reading's `seen_seq`, every piece in the ANALYZED list (the current
 *   list for a legacy row whose list is empty), and any must-be-commander piece among the
 *   commanders. A rules entry touches while its version is above the reading's. Unread is past
 *   `notices_read_seq`.
 *
 * It sits in the PROJECTION of a single-table select, where Drizzle emits column references bare
 * (AGENTS.md), so every inner table is aliased and every outer reference qualified.
 */
export function noticeSummarySql() {
  return sql<NoticeSummary>`(
    with cur as (
      select dc.oracle_id from ${deckCards} dc where dc.deck_id = ${decks}.id
      union select ${decks}.commander_oracle_id
      union select ${decks}.partner_oracle_id where ${decks}.partner_oracle_id is not null
    ),
    ident as (
      select coalesce(array_agg(distinct x), '{}'::text[]) as colors
      from ${cards} ic, unnest(ic.color_identity) x
      where ic.oracle_id = ${decks}.commander_oracle_id or ic.oracle_id = ${decks}.partner_oracle_id
    ),
    off as (
      select c.oracle_id from ${cards} c join cur on cur.oracle_id = c.oracle_id
      where not c.commander_legal
         or (c.oracle_id <> ${decks}.commander_oracle_id
             and c.oracle_id is distinct from ${decks}.partner_oracle_id
             and not (c.color_identity <@ (select colors from ident)))
    ),
    pending as (
      select count(*)::int as n
      from ${deckProfiles} dp, ${deckDataChanges} e
      where dp.deck_id = ${decks}.id
        and dp.user_id = ${decks}.user_id
        and e.seq > dp.notices_read_seq
        and (
          (e.kind = 'rules' and (e.detail->>'rulesVersion')::int > dp.rules_version)
          or (e.kind not in ('rules', 'notLegal')
              and e.seq > dp.seen_seq
              and cardinality(e.oracle_ids) > 0
              and e.oracle_ids <@ (case when cardinality(dp.analyzed_oracle_ids) = 0
                                        then array(select oracle_id from cur)
                                        else dp.analyzed_oracle_ids end)
              and not exists (
                select 1
                from jsonb_array_elements_text(case when jsonb_typeof(e.detail->'mustBeCommander') = 'array'
                                                    then e.detail->'mustBeCommander' else '[]'::jsonb end) m(id)
                where m.id::uuid is distinct from ${decks}.commander_oracle_id
                  and m.id::uuid is distinct from ${decks}.partner_oracle_id))
        )
    )
    select case
      when exists (select 1 from off) then json_build_object(
        'kind', case
          when array(select oracle_id from off order by oracle_id)
             = array(select distinct s from unnest(coalesce(${decks}.notices_legal_seen, '{}'::uuid[])) s order by s)
          then 'notLegalRead' else 'notLegalUnread' end,
        'count', (select count(*)::int from off),
        'dataUnread', (select n from pending))
      when (select n from pending) > 0 then json_build_object('kind', 'unread', 'count', (select n from pending))
      else null end
  )`;
}
