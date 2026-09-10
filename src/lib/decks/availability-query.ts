import { sql } from "drizzle-orm";
import { db } from "../../db";
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
 * whether their deck is sleeved.
 *
 * A deck claims off its NEWEST COMMITTED VERSION — what is physically sleeved,
 * not what its draft is toying with. A deck with no version at all is a brew,
 * and claims softly off its live list exactly as everything did before
 * versioning. This is what replaced a 99-card body count: the count was
 * guessing at a fact the version answers outright, and the guess is what let a
 * draft add take a card out of a deck that had it in a box.
 *
 * TWO THINGS THIS DELIBERATELY HANDLES, both verified against the schema:
 *
 * 1. NEITHER COMMANDER IS A deck_cards ROW. `decks.commander_oracle_id` and
 *    `decks.partner_oracle_id` are their own columns and never appear in
 *    deck_cards. Without the union arms below, a single-copy legendary sleeved
 *    as another deck's commander would read as free everywhere. A committed
 *    deck's commanders are read from the VERSION's snapshot of those columns,
 *    so a query that answers for what is sleeved never mixes in draft truth.
 *
 * 2. BASIC LANDS ARE EXCLUDED ENTIRELY. A finished deck holds 30-odd Forests
 *    and almost nobody's collection row matches, so every sleeved deck would
 *    push its basics into `over` and fire the over-committed summary on a deck
 *    with nothing wrong with it.
 *
 * `claim_decks_all` carries every claim whatever the caller's vantage.
 * Self-exclusion is applied downstream, because the seniority ordering below has
 * to be able to see the excluded deck's own place in the queue.
 */
const claimModel = (userId: string) => sql`
  -- The version each deck is currently sleeved as. number orders it, not
  -- committed_at: the unique key makes number strictly increasing per deck,
  -- and two versions committed in the same millisecond would tie on time.
  newest_version as (
    select distinct on (v.deck_id)
      v.deck_id, v.id as version_id, v.committed_at,
      v.commander_oracle_id, v.commander_since,
      v.partner_oracle_id, v.partner_since
    from deck_versions v
    join decks d on d.id = v.deck_id
    where d.user_id = ${userId}
    order by v.deck_id, v.number desc
  ),
  -- Every claim on a card, one row per (deck, card).
  --
  -- union all, not union: the arms are disjoint by construction — a deck is in
  -- newest_version or it is not — so the sort would be pure cost.
  --
  -- since, not committed_at: seniority is per CARD. A deck that has held a
  -- card for a year and then commits an unrelated swap must not jump to the
  -- back of the queue on everything it holds. See Addendum R1 in the spec and
  -- the column comment on deck_version_cards.since.
  --
  -- A brew's rows carry a null since, and null is the ordering's way of
  -- saying "junior to everything sleeved" — the predicates below test for it
  -- explicitly rather than relying on null comparison semantics.
  all_claims as (
    select nv.deck_id, vc.oracle_id, vc.quantity, vc.since
    from newest_version nv
    join deck_version_cards vc on vc.version_id = nv.version_id
    union all
    select nv.deck_id, nv.commander_oracle_id, 1, nv.commander_since
    from newest_version nv
    union all
    select nv.deck_id, nv.partner_oracle_id, 1, nv.partner_since
    from newest_version nv
    where nv.partner_oracle_id is not null
    union all
    -- Brews: no version, so the live list is the only statement of intent
    -- there is. These rows are graded soft below.
    select dc.deck_id, dc.oracle_id, dc.quantity, null::timestamp
    from deck_cards dc
    join decks d on d.id = dc.deck_id
    where d.user_id = ${userId}
      and not exists (select 1 from newest_version nv where nv.deck_id = dc.deck_id)
    union all
    select d.id, d.commander_oracle_id, 1, null::timestamp
    from decks d
    where d.user_id = ${userId}
      and not exists (select 1 from newest_version nv where nv.deck_id = d.id)
    union all
    select d.id, d.partner_oracle_id, 1, null::timestamp
    from decks d
    where d.user_id = ${userId} and d.partner_oracle_id is not null
      and not exists (select 1 from newest_version nv where nv.deck_id = d.id)
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
      -- Seniority is "who sleeved it first", not "who registered the deck
      -- first". Ordering on decks.created_at would hand a contested copy to
      -- the older deck and silently send the deck that physically HAS the card
      -- shopping — the implicit pull this whole feature exists to prevent.
      --
      -- min() over the arms, which matters only for the deck whose commander is
      -- also on its own list: one claimant, and the earlier of the two dates.
      min(ac.since) as since,
      -- Was a 99-card body test. A committed version answers outright what
      -- that threshold was guessing at, which is also what retires the #334
      -- commander carve-out: a committed deck's commander is hard because the
      -- whole version is hard, not because commanders are special.
      (nv.deck_id is not null) as sleeved,
      sum(ac.quantity)::int as quantity
    from all_claims ac
    join decks d on d.id = ac.deck_id
    left join newest_version nv on nv.deck_id = ac.deck_id
    group by ac.oracle_id, ac.deck_id, d.name, (nv.deck_id is not null)
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
 * SENIORITY, on a deck's own decklist. A copy goes to whichever sleeved deck
 * has held it longest — `deck_version_cards.since` ordering it, `deck_id`
 * breaking the tie — and the deck that has not sleeved it goes and buys one.
 * Before seniority existed the deficit was symmetric: one Sol Ring wanted by
 * five finished decks marked the card short in all five, so four decks that
 * physically have it were told to go shopping.
 *
 * A deck that has not sleeved a card is junior on THAT card to every deck that
 * has, whatever the decks' ages — which is what makes a draft add cost a
 * purchase rather than quietly emptying somebody else's box.
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
    -- from claim_decks_all because a deck is still sleeved or not when it
    -- claims nothing at all, and one row is what the scalar read below wants.
    skip_deck as (
      select d.id, (nv.deck_id is not null) as sleeved
      from decks d
      left join newest_version nv on nv.deck_id = d.id
      where ${skip}::uuid is not null
        and d.id = ${skip}::uuid
        and d.user_id = ${userId}
    ),
    -- What the vantage deck itself holds, and since when. A card ABSENT here is
    -- a card this deck has not sleeved — a draft add, or a brew's whole list —
    -- and the join below reads that absence as junior to every sleeved
    -- claimant. That one fact is what stops a draft add taking a card out of
    -- another deck's committed version; there is no separate rule for it.
    mine as (
      select ca.oracle_id, ca.since
      from claim_decks_all ca, skip_deck s
      where ca.deck_id = s.id and ca.since is not null
    ),
    -- What the decks ahead of this one have already taken. Empty when there is
    -- no vantage deck, which is what makes free fall back to the total below.
    senior_hard as (
      select ca.oracle_id, sum(ca.quantity)::int as hard_senior
      from claim_decks_all ca
      cross join skip_deck s
      left join mine m on m.oracle_id = ca.oracle_id
      where ca.sleeved
        and ca.deck_id <> s.id
        -- m.since null covers both "the vantage is a brew" and "the vantage has
        -- not sleeved this card". Both mean everyone sleeved is ahead of it.
        and (m.since is null or (ca.since, ca.deck_id) < (m.since, s.id))
      group by ca.oracle_id
    ),
    claims as (
      select
        cd.oracle_id,
        sum(case when cd.sleeved then cd.quantity else 0 end)::int as hard,
        sum(case when cd.sleeved then 0 else cd.quantity end)::int as soft,
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
            -- The JSON key stays mature on purpose: DeckClaim in
            -- availability.ts and every consumer of the receipt read that key,
            -- so renaming it is a separate change with its own blast radius.
            'quantity', cd.quantity, 'mature', cd.sleeved
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
      -- copies not sleeved in a committed deck. On a sleeved deck's own
      -- decklist it is (owned − ownClaim) − seniorHard, which is what lands the
      -- deficit on the junior claimant instead of on all of them at once. A
      -- brew takes the total too: it outranks nothing, so every hard claim is
      -- ahead of it.
      --
      -- One consequence worth stating: own_claims also reads all_claims, so
      -- on a committed deck's own page a card the DRAFT added contributes
      -- nothing to own_claim and reads as free when a free copy exists. That
      -- is correct — the deck has not sleeved it — and pnpm probe:claims
      -- asserts it.
      --
      -- The senior subtraction is capped at the supply, because the decks ahead of
      -- this one cannot take copies that do not exist. Four finished decks each
      -- wanting a Relentless Rats the player owns one of are three decks short by
      -- one, not one deck short by one and the next short by two: the shortfall
      -- above the supply belongs to the seniors, and a "short 3" marker on a
      -- deck that needs to buy one copy is a figure nobody can act on.
      (o.owned
        - coalesce(oc.own_claim, 0)
        - case when coalesce((select s.sleeved from skip_deck s), false)
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
 * A DECK NEVER BUYS ITS OWN COMMANDERS HERE, and that is a LIMITATION rather
 * than a principle — see #470, which is the ticket to lift it. A commander is
 * real senior demand: a legend sleeved as another deck's commander really is
 * holding that copy, which is why `all_claims` unions both columns, and a player
 * who does not own their commander genuinely has one to buy. But no surface can
 * currently say so. `DeckDetail.commander` and `DeckDetail.partner` carry no
 * owned flag, both are absent from `DeckDetail.cards`, and `built` and
 * `ownedCount` count `deck_cards` alone, so
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
    -- The DRAFT decklist alone, both commanders excluded. This is what a deck
    -- can be told to go and buy — the preview the player acts on — while
    -- seniority below is measured against what is sleeved. The two diverging
    -- is the feature, which is why the join in supply is a LEFT join.
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
            and senior.sleeved
            and senior.deck_id <> lc.deck_id
            -- Mirrors senior_hard exactly: a deck that does not hold this card
            -- in its own version — mine absent — sits behind every sleeved
            -- claim.
            and (
              mine.since is null
              or (senior.since, senior.deck_id) < (mine.since, lc.deck_id)
            )
        ), 0)::int as senior
      from list_claims lc
      join cards c on c.oracle_id = lc.oracle_id
      left join owned o on o.oracle_id = lc.oracle_id
      -- LEFT, and this is load-bearing. list_claims reads the DRAFT while
      -- claim_decks_all reads versions; an inner join between them is a filter
      -- that deletes every draft-added card from the buy list — the one figure
      -- the player commits against.
      left join claim_decks_all mine
        on mine.deck_id = lc.deck_id and mine.oracle_id = lc.oracle_id
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
