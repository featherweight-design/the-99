import { sql } from "drizzle-orm";
import { db } from "../../db";
import { deckBodySize } from "./deck-size";
import type { Availability, DeckClaim } from "./availability";

type Row = {
  oracle_id: string;
  owned: number;
  hard: number;
  soft: number;
  free: number;
  claims: DeckClaim[] | null;
};

/**
 * The claim model both readers below share: who wants what, how many, and
 * whether their deck is sleeved. Deck size is computed in SQL rather than in TS
 * because maturity has to be known before the per-oracle rollup — loading every
 * deck to count it in JS would be a fanout over the whole collection.
 *
 * TWO THINGS THIS DELIBERATELY HANDLES, both verified against the schema:
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
 *
 * `claim_decks_all` carries every claim whatever the caller's vantage.
 * Self-exclusion is applied downstream, because the seniority ordering below has
 * to be able to see the excluded deck's own place in the queue.
 */
const claimModel = (userId: string) => sql`
  deck_totals as (
    select dc.deck_id, sum(dc.quantity)::int as cards
    from deck_cards dc
    join decks d on d.id = dc.deck_id
    where d.user_id = ${userId}
    group by dc.deck_id
  ),
  -- Every claim on a card, one row per (deck, card): the deck's list, plus the
  -- deck's commander, which lives in its own column and would otherwise be
  -- invisible to this feature.
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
  -- One row per (oracle, claiming deck), carrying that deck's whole ask.
  -- Grouping rather than select distinct is what folds a deck whose commander is
  -- also on its own list into a single claim of 1 + listQty: it appears twice in
  -- all_claims and must read as one claimant wanting two. Two decks sharing a
  -- name stay two rows because deck_id is in the key.
  claim_decks_all as (
    select
      ac.oracle_id,
      ac.deck_id,
      d.name,
      d.created_at,
      -- LEFT: a deck whose only card is its commander has no deck_cards rows and
      -- therefore no deck_totals row. An inner join would drop that claim
      -- entirely. No rows means no cards means brewing, hence coalesce to 0.
      coalesce(dt.cards, 0) >= ${deckBodySize(false)} as mature,
      sum(ac.quantity)::int as quantity
    from all_claims ac
    left join deck_totals dt on dt.deck_id = ac.deck_id
    join decks d on d.id = ac.deck_id
    group by ac.oracle_id, ac.deck_id, d.name, d.created_at, coalesce(dt.cards, 0)
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
`;

/**
 * One aggregate for the whole user.
 *
 * Cards with no deck claim are absent from `claims` and fall through the left
 * join as hard = soft = 0, so free = owned. Cards the user does not own cannot
 * appear at all: the driver of the outer select is the collection.
 *
 * SENIORITY, on a deck's own decklist. Copies go to mature decks in
 * `created_at` order, `deck_id` breaking the tie — the oldest deck holding a
 * card keeps it and the newest goes and buys one. Before this, the deficit was
 * symmetric: one Sol Ring wanted by five finished decks marked the card short in
 * all five, so four decks that physically have it were told to go shopping.
 *
 * An immature deck is junior to EVERY mature deck whatever its date. A brew
 * started two years ago has nothing sleeved; the deck finished last week does,
 * and a brew that outranked it would report copies sitting in another box.
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
    with ${claimModel(userId)},
    -- Self-exclusion (Addendum 2 §6): the current deck never claims against
    -- itself. Applied once here, and hard, soft and claims inherit it.
    claim_decks as (
      select * from claim_decks_all
      where ${skip}::uuid is null or deck_id <> ${skip}::uuid
    ),
    -- The CURRENT deck's own claim, and only it. A null excludeDeckId makes this
    -- empty, so every figure below collapses to the un-excluded model.
    own_claims as (
      select ac.oracle_id, sum(ac.quantity)::int as own_claim
      from all_claims ac
      where ${skip}::uuid is not null and ac.deck_id = ${skip}::uuid
      group by ac.oracle_id
    ),
    -- The vantage deck's own place in the queue. Read from decks rather than
    -- from claim_decks_all because a deck still has a date and a maturity when
    -- it claims nothing at all, and one row is what the scalar read below wants.
    skip_deck as (
      select
        d.id,
        d.created_at,
        coalesce(dt.cards, 0) >= ${deckBodySize(false)} as mature
      from decks d
      left join deck_totals dt on dt.deck_id = d.id
      where ${skip}::uuid is not null
        and d.id = ${skip}::uuid
        and d.user_id = ${userId}
    ),
    -- What the decks ahead of this one have already taken. Empty when there is
    -- no vantage deck, which is what makes free fall back to the total below.
    senior_hard as (
      select ca.oracle_id, sum(ca.quantity)::int as hard_senior
      from claim_decks_all ca, skip_deck s
      where ca.mature
        and (not s.mature or (ca.created_at, ca.deck_id) < (s.created_at, s.id))
      group by ca.oracle_id
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
    )
    select
      o.oracle_id,
      -- TRUE owned, never reduced: this is the owned <= 0 guard's input.
      o.owned,
      coalesce(c.hard, 0) as hard,
      coalesce(c.soft, 0) as soft,
      -- Off a decklist there is no "me" to be senior to, so supply is measured
      -- against every hard claim there is and free keeps its old meaning:
      -- copies not sleeved in a finished deck. On a mature deck's own decklist
      -- it is (owned − ownClaim) − seniorHard, which is what lands the deficit on
      -- the newest claimant instead of on all of them at once. A brew takes the
      -- total too: it outranks nothing, so every hard claim is ahead of it.
      --
      -- The senior subtraction is capped at the supply, because the decks ahead of
      -- this one cannot take copies that do not exist. Four finished decks each
      -- wanting a Relentless Rats the player owns one of are three decks short by
      -- one, not one deck short by one and the next short by two: the shortfall
      -- above the supply belongs to the seniors, and a "short 3" marker on a
      -- deck that needs to buy one copy is a figure nobody can act on.
      (o.owned
        - coalesce(oc.own_claim, 0)
        - case when coalesce((select s.mature from skip_deck s), false)
               then least(coalesce(sh.hard_senior, 0), o.owned)
               else coalesce(c.hard, 0)
          end
      )::int as free,
      c.claims
    from owned o
    left join claims c on c.oracle_id = o.oracle_id
    left join own_claims oc on oc.oracle_id = o.oracle_id
    left join senior_hard sh on sh.oracle_id = o.oracle_id
    where ${only}::uuid[] is null or o.oracle_id = any(${only}::uuid[])
  `);

  const out = new Map<string, Availability>();
  for (const r of rows.rows) {
    out.set(r.oracle_id, {
      owned: r.owned,
      hard: r.hard,
      soft: r.soft,
      // Straight from the query. Do NOT recompute as `r.owned - r.hard` here:
      // that is right only when excludeDeckId is unset, and silently wrong on a
      // deck's own decklist, where supply is self-excluded and the claims it is
      // measured against are only the senior ones.
      free: r.free,
      claims: r.claims ?? [],
    });
  }
  return out;
}

/** One line a deck has to go and buy: which deck, which card, how many copies. */
export type DeckBuyRow = { deckId: string; oracleId: string; quantity: number };

/**
 * Every purchase every deck owes, in one query.
 *
 * Two halves, and both are one trip to a shop: a card the player owns no copy
 * of, and a card whose copies are all taken by senior decks. This is
 * `isShoppingCard`'s question asked of every deck at once — that one reads a
 * decklist already loaded with its own vantage, this one has no decklist to read
 * — so the two must move together.
 *
 * Basics are out, as they are from every Shopping surface: the fill never buys
 * them, and a deck's 30-odd Forests would otherwise dwarf everything real.
 *
 * `quantity` is the DEFICIT, not the deck's ask. A deck wanting four Relentless
 * Rats with one in the box buys three, and this roll-up feeds a price total, so
 * returning the ask would charge for a copy already on the shelf.
 *
 * A DECK NEVER BUYS ITS OWN COMMANDER HERE, and that is a LIMITATION rather than
 * a principle — see #470, which is the ticket to lift it. The commander is real
 * senior demand: a legend sleeved as another deck's commander really is holding
 * that copy, which is why `all_claims` unions it, and a player who does not own
 * their commander genuinely has one to buy. But no surface can currently say so.
 * `DeckDetail.commander` carries no owned flag, it is absent from
 * `DeckDetail.cards`, and `built` and `ownedCount` count `deck_cards` alone, so
 * emitting a commander row would put a purchase on the tile and the roll-up that
 * the deck page has no row to show — the exact cross-surface disagreement this
 * change exists to end. Rows are therefore driven off the decklist while
 * seniority is measured against every claim there is, and the commander is
 * admitted here only once the deck page can render its ownership.
 */
export async function loadDeckBuyRows(userId: string): Promise<DeckBuyRow[]> {
  const rows = await db.execute<{
    deck_id: string;
    oracle_id: string;
    quantity: number;
  }>(sql`
    with ${claimModel(userId)},
    -- The decklist alone, commander excluded. This is what a deck can be told to
    -- go and buy; see the header. The inner join below drops a deck's
    -- commander-only claim without a predicate to forget.
    list_claims as (
      select dc.deck_id, dc.oracle_id, sum(dc.quantity)::int as quantity
      from deck_cards dc
      join decks d on d.id = dc.deck_id
      where d.user_id = ${userId}
      group by dc.deck_id, dc.oracle_id
    ),
    -- Every decklist claim, beside the supply and the copies the decks ahead of
    -- it have already taken. A card owned in no copies has no owned row at all
    -- and falls through as zero, which is the other half of the shopping list.
    supply as (
      select
        lc.deck_id,
        lc.oracle_id,
        lc.quantity,
        coalesce(o.owned, 0)::int as owned,
        coalesce((
          select sum(senior.quantity)
          from claim_decks_all senior
          where senior.oracle_id = lc.oracle_id
            and senior.mature
            -- Mirrors senior_hard above: seniority orders the mature decks among
            -- themselves, and an immature deck sits behind all of them.
            and (
              not ca.mature
              or (senior.created_at, senior.deck_id) < (ca.created_at, ca.deck_id)
            )
        ), 0)::int as senior
      from list_claims lc
      join claim_decks_all ca
        on ca.deck_id = lc.deck_id and ca.oracle_id = lc.oracle_id
      join cards c on c.oracle_id = lc.oracle_id
      left join owned o on o.oracle_id = lc.oracle_id
      where c.type_line !~ '\\mBasic\\M'
    )
    select
      s.deck_id,
      s.oracle_id,
      -- The floor at zero is what stops seniors taking copies that do not exist:
      -- their own shortfall is theirs to buy, and must not be added to this
      -- deck's bill.
      (s.quantity - greatest(s.owned - s.senior, 0))::int as quantity
    from supply s
    where s.quantity - greatest(s.owned - s.senior, 0) > 0
  `);

  return rows.rows.map((r) => ({
    deckId: r.deck_id,
    oracleId: r.oracle_id,
    quantity: r.quantity,
  }));
}
