/**
 * The cards a `trade` feed item draws (friend trades PR 2, plan `2026-11-27-friend-trades.md`, "The feed kind"). The item
 * stores `{ trade, round, event }` and no card list, because a revise rewrites a round's cards in place: the lists are read
 * live from `trade_cards` for the round the item names.
 *
 * It lives in `src/lib/social/` because it reads another account's side of a trade (`check:social-reads`): the viewer is a
 * party to the trade AND the other party is still a friend (`friend_links` on the viewer), in the same statement. A trade
 * the viewer is no party to, or with a friend since removed, returns nothing.
 *
 * `theirs` is the side that is the other person's spare (what the viewer would receive); `yours` is the viewer's own.
 */
import { sql, type SQL } from "drizzle-orm";

import type { db } from "../../db";
import { cards, friendLinks, tradeCards, trades } from "../../db/schema";
import type { FeedCard } from "../feed/home";

type Executor = Pick<typeof db, "execute">;

export type TradeFeedRef = { trade: string; round: number };
export type TradeFeedSides = { theirs: FeedCard[]; yours: FeedCard[] };

/** The map key of a trade's round. */
export const tradeFeedKey = (trade: string, round: number): string => `${trade}:${round}`;

/** The cards of each named round, apart so a test can render it. Every table is aliased and qualified. */
export function tradeFeedSidesQuery(viewerId: string, refs: readonly TradeFeedRef[]): SQL {
  const ids = refs.map((r) => r.trade);
  const rounds = refs.map((r) => r.round);
  return sql`select ftc.trade_id as trade_id, ftc.round as round,
      (case when ftc.side = (case when ft.proposer_user_id = ${viewerId} then 'proposer' else 'recipient' end) then 'yours' else 'theirs' end) as whose,
      fcd.oracle_id as oracle_id, fcd.name as name, fcd.color_identity as identity, fcd.image_uri as image,
      fcd.art_crop_uri as art, fcd.layout as layout
    from unnest(${sql.param(ids)}::uuid[], ${sql.param(rounds)}::int[]) as fr(trade_id, round)
    join ${trades} ft on ft.id = fr.trade_id
    join ${tradeCards} ftc on ftc.trade_id = ft.id and ftc.round = fr.round
    join ${cards} fcd on fcd.oracle_id = ftc.oracle_id
    where (ft.proposer_user_id = ${viewerId} or ft.recipient_user_id = ${viewerId})
      and exists (select 1 from ${friendLinks} ffl
        where ffl.user_id = ${viewerId}
          and ffl.friend_user_id = (case when ft.proposer_user_id = ${viewerId} then ft.recipient_user_id else ft.proposer_user_id end))
    order by fcd.name, fcd.oracle_id`;
}

type Row = {
  trade_id: string; round: number; whose: "yours" | "theirs"; oracle_id: string; name: string;
  identity: string[] | null; image: string | null; art: string | null; layout: string | null;
};

/** One read for every trade item in the feed, never one per item, each round once. Empty refs read nothing. */
export async function loadTradeFeedSides(viewerId: string, refs: readonly TradeFeedRef[], q: Executor): Promise<Map<string, TradeFeedSides>> {
  const out = new Map<string, TradeFeedSides>();
  // Two items can name one round (an offer, then its accept): read each round once, or its cards come back twice.
  const unique = [...new Map(refs.map((r) => [tradeFeedKey(r.trade, r.round), r])).values()];
  if (unique.length === 0) return out;
  const { rows } = await q.execute<Row>(tradeFeedSidesQuery(viewerId, unique));
  for (const r of rows) {
    const key = tradeFeedKey(r.trade_id, Number(r.round));
    const sides = out.get(key) ?? { theirs: [], yours: [] };
    sides[r.whose].push({
      oracleId: r.oracle_id, name: r.name, image: r.image, art: r.art, colorIdentity: r.identity ?? null,
      ...(r.layout ? { layout: r.layout } : {}),
    });
    out.set(key, sides);
  }
  return out;
}
