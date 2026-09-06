import { sql } from "drizzle-orm";
import { db } from "../../db";
import { MATURE_DECK_SIZE, type Availability, type DeckClaim } from "./availability";

type Row = {
  oracle_id: string;
  owned: number;
  hard: number;
  soft: number;
  free: number;
  claims: DeckClaim[] | null;
};

/**
 * One aggregate for the whole user. Deck size is computed in SQL rather than in
 * TS because maturity has to be known before the per-oracle rollup — loading
 * every deck to count it in JS would be a fanout over the whole collection.
 *
 * Cards with no deck claim are absent from `claims` and fall through the left
 * join as hard = soft = 0, so free = owned. Cards the user does not own cannot
 * appear at all: the driver of the outer select is the collection.
 *
 * TWO THINGS THIS QUERY DELIBERATELY HANDLES, both verified against the schema:
 *
 * 1. THE COMMANDER IS NOT A deck_cards ROW. `decks.commander_oracle_id` is its
 *    own column and never appears in deck_cards. Without the union below, a
 *    single-copy legendary sleeved as another deck's commander would read as
 *    free everywhere.
 *
 * 2. BASIC LANDS ARE EXCLUDED ENTIRELY. A finished deck holds 30-odd Forests
 *    and almost nobody's collection row matches, so every mature deck would
 *    push its basics into `over` and fire the over-committed summary on a deck
 *    with nothing wrong with it.
 *
 * Deck size for the maturity test stays sum(deck_cards.quantity), excluding the
 * commander — that is exactly what `built` is and what statusPill thresholds
 * on, so 99 here means the same 99 the player sees on the pill. Basics DO count
 * toward that size; they are only excluded as claim subjects.
 */
export async function loadAvailability(
  userId: string,
  opts?: { oracleIds?: string[]; excludeDeckId?: string },
): Promise<Map<string, Availability>> {
  // Both narrowings are null-guarded in SQL rather than by string-building the
  // query, so there is one query plan and one place to read.
  //
  // sql.param is load-bearing for the array. A bare `${jsArray}` in a drizzle
  // template expands to a parenthesised param LIST — `($1, $2)::uuid[]` — which
  // is a syntax error, not an array. sql.param forces the whole array into one
  // placeholder so the driver serialises it as a Postgres array literal.
  const only = sql.param(opts?.oracleIds ?? null);
  const skip = sql.param(opts?.excludeDeckId ?? null);
  const rows = await db.execute<Row>(sql`
    with deck_totals as (
      select dc.deck_id, sum(dc.quantity)::int as cards
      from deck_cards dc
      join decks d on d.id = dc.deck_id
      where d.user_id = ${userId}
      group by dc.deck_id
    ),
    -- Every claim on a card, one row per (deck, card): the deck's list, plus
    -- the deck's commander, which lives in its own column and would otherwise
    -- be invisible to this feature.
    all_claims as (
      select dc.deck_id, dc.oracle_id, dc.quantity
      from deck_cards dc
      join decks d on d.id = dc.deck_id
      where d.user_id = ${userId}
      union all
      select d.id as deck_id, d.commander_oracle_id as oracle_id, 1 as quantity
      from decks d
      where d.user_id = ${userId}
    ),
    -- The CURRENT deck's own claim, and only it. A null excludeDeckId makes
    -- this empty, so every figure below collapses to the un-excluded model.
    own_claims as (
      select ac.oracle_id, sum(ac.quantity)::int as own_claim
      from all_claims ac
      where ${skip}::uuid is not null and ac.deck_id = ${skip}::uuid
      group by ac.oracle_id
    ),
    -- One row per (oracle, claiming deck), carrying that deck's whole ask.
    -- Grouping rather than select distinct is what folds a deck whose
    -- commander is also on its own list into a single claim of 1 + listQty:
    -- it appears twice in all_claims and must read as one claimant wanting two.
    -- Two decks sharing a name stay two rows because deck_id is in the key.
    --
    -- Self-exclusion (Addendum 2 §6) is applied HERE, once, and every figure
    -- below inherits it: the current deck never claims against itself.
    claim_decks as (
      select
        ac.oracle_id,
        ac.deck_id,
        d.name,
        -- LEFT: a deck whose only card is its commander has no deck_cards rows
        -- and therefore no deck_totals row. An inner join would drop that claim
        -- entirely. No rows means no cards means brewing, hence coalesce to 0.
        coalesce(dt.cards, 0) >= ${MATURE_DECK_SIZE} as mature,
        sum(ac.quantity)::int as quantity
      from all_claims ac
      left join deck_totals dt on dt.deck_id = ac.deck_id
      join decks d on d.id = ac.deck_id
      where ${skip}::uuid is null or ac.deck_id <> ${skip}::uuid
      group by ac.oracle_id, ac.deck_id, d.name, coalesce(dt.cards, 0)
    ),
    claims as (
      select
        cd.oracle_id,
        sum(case when cd.mature then cd.quantity else 0 end)::int as hard,
        sum(case when cd.mature then 0 else cd.quantity end)::int as soft,
        -- json, not a composite array: the pg driver hands a Postgres array of
        -- records back as an unparsed "(uuid,name)" string, and a name with a
        -- comma or a quote in it is then unrecoverable. jsonb_agg arrives as a
        -- real array of objects.
        -- deck_id breaks the tie because names are NOT unique, which is the very
        -- premise this CTE keys on. Without it two decks sharing a name order
        -- arbitrarily, so the receipt's rows and every hardDecks(a)[0] reader
        -- would reshuffle between two reads of unchanged data.
        jsonb_agg(
          jsonb_build_object(
            'id', cd.deck_id, 'name', cd.name,
            'quantity', cd.quantity, 'mature', cd.mature
          )
          order by cd.name, cd.deck_id
        ) as claims
      from claim_decks cd
      group by cd.oracle_id
    ),
    owned as (
      select ci.oracle_id, sum(ci.quantity)::int as owned
      from collection_items ci
      join cards c on c.oracle_id = ci.oracle_id
      where ci.user_id = ${userId}
        -- Basics are excluded from the whole model. See the header comment.
        and c.type_line !~ '\\mBasic\\M'
      group by ci.oracle_id
    )
    select
      o.oracle_id,
      -- TRUE owned, never reduced: this is the owned <= 0 guard's input.
      o.owned,
      coalesce(c.hard, 0) as hard,
      coalesce(c.soft, 0) as soft,
      -- (owned − ownClaim) − (hard − ownHardClaim). The right-hand subtraction
      -- already happened in the claims CTE; this applies the supply half.
      (o.owned - coalesce(oc.own_claim, 0) - coalesce(c.hard, 0))::int as free,
      c.claims
    from owned o
    left join claims c on c.oracle_id = o.oracle_id
    left join own_claims oc on oc.oracle_id = o.oracle_id
    where ${only}::uuid[] is null or o.oracle_id = any(${only}::uuid[])
  `);

  const out = new Map<string, Availability>();
  for (const r of rows.rows) {
    out.set(r.oracle_id, {
      owned: r.owned,
      hard: r.hard,
      soft: r.soft,
      // Straight from the query. Do NOT recompute as `r.owned - r.hard` here:
      // that is right only when excludeDeckId is unset, and silently wrong on
      // a deck's own decklist, where supply is self-excluded too.
      free: r.free,
      claims: r.claims ?? [],
    });
  }
  return out;
}
