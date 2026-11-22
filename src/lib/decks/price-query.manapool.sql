
    with newest as (
      select max(as_of) as as_of from printing_prices
    ),
    chosen as (
      select distinct on (p.oracle_id)
        null::uuid as deck_id,
        p.oracle_id,
        pp.price_cents,
        pp.price_cents_foil,
        pp.price_cents_etched,
        pp.as_of,
        p.scryfall_id,
        false as named
      from printings p
      join printing_prices pp on pp.scryfall_id = p.scryfall_id
      where p.oracle_id = any($1::uuid[])
      order by
        p.oracle_id,
        (pp.as_of = (select as_of from newest)) desc,
        (pp.price_cents is null),
        coalesce(pp.price_cents, pp.price_cents_foil, pp.price_cents_etched) asc,
        pp.scryfall_id
    ),
    facts as (
      select * from chosen
      
      
    )
    select
      newest.as_of as newest_as_of,
      facts.deck_id,
      facts.oracle_id,
      facts.price_cents,
      facts.price_cents_foil,
      facts.price_cents_etched,
      facts.as_of,
      facts.scryfall_id,
      facts.named
    from newest
    left join facts on true
  
--params [["33333333-3333-4333-8333-333333333333"]]
=====

    with newest as (
      select max(as_of) as as_of from printing_prices
    ),
    chosen as (
      select distinct on (p.oracle_id)
        null::uuid as deck_id,
        p.oracle_id,
        pp.price_cents,
        pp.price_cents_foil,
        pp.price_cents_etched,
        pp.as_of,
        p.scryfall_id,
        false as named
      from printings p
      join printing_prices pp on pp.scryfall_id = p.scryfall_id
      where p.oracle_id = any($1::uuid[])
      order by
        p.oracle_id,
        (pp.as_of = (select as_of from newest)) desc,
        (pp.price_cents is null),
        coalesce(pp.price_cents, pp.price_cents_foil, pp.price_cents_etched) asc,
        pp.scryfall_id
    ),
    picked as (
      select w.deck_id, p.oracle_id,
             pp.price_cents, pp.price_cents_foil, pp.price_cents_etched, pp.as_of, p.scryfall_id, false as named
      from unnest(
        $2::uuid[],
        $3::uuid[],
        $4::text[],
        $5::text[]
      ) as w(deck_id, oracle_id, set_code, collector_number)
      join printings p
        on p.oracle_id = w.oracle_id and p.set_code = w.set_code and p.collector_number = w.collector_number
      join printing_prices pp on pp.scryfall_id = p.scryfall_id
      -- (set, collector number) is not unique in printings: two variants can share one. A pick
      -- naming a shared pair answers nothing, and its row takes today's figure, rather than pricing
      -- whichever sibling an unordered join yields (the rule price-lookup.ts keeps for the same key).
      where (
        select count(*) from printings p2
        where p2.oracle_id = w.oracle_id and p2.set_code = w.set_code
          and p2.collector_number = w.collector_number
      ) = 1
    ),
    facts as (
      select * from chosen
      union all select * from picked
      
    )
    select
      newest.as_of as newest_as_of,
      facts.deck_id,
      facts.oracle_id,
      facts.price_cents,
      facts.price_cents_foil,
      facts.price_cents_etched,
      facts.as_of,
      facts.scryfall_id,
      facts.named
    from newest
    left join facts on true
  
--params [["33333333-3333-4333-8333-333333333333"],["11111111-1111-4111-8111-111111111111"],["33333333-3333-4333-8333-333333333333"],["lea"],["1"]]
=====

    with newest as (
      select max(as_of) as as_of from printing_prices
    ),
    chosen as (
      select distinct on (p.oracle_id)
        null::uuid as deck_id,
        p.oracle_id,
        pp.price_cents,
        pp.price_cents_foil,
        pp.price_cents_etched,
        pp.as_of,
        p.scryfall_id,
        false as named
      from printings p
      join printing_prices pp on pp.scryfall_id = p.scryfall_id
      where p.oracle_id = any($1::uuid[])
      order by
        p.oracle_id,
        (pp.as_of = (select as_of from newest)) desc,
        (pp.price_cents is null),
        coalesce(pp.price_cents, pp.price_cents_foil, pp.price_cents_etched) asc,
        pp.scryfall_id
    ),
    named as (
      select null::uuid as deck_id, p.oracle_id,
             pp.price_cents, pp.price_cents_foil, pp.price_cents_etched, pp.as_of, p.scryfall_id, true as named
      from printings p
      join printing_prices pp on pp.scryfall_id = p.scryfall_id
      where p.scryfall_id = any($2::uuid[])
    ),
    facts as (
      select * from chosen
      
      union all select * from named
    )
    select
      newest.as_of as newest_as_of,
      facts.deck_id,
      facts.oracle_id,
      facts.price_cents,
      facts.price_cents_foil,
      facts.price_cents_etched,
      facts.as_of,
      facts.scryfall_id,
      facts.named
    from newest
    left join facts on true
  
--params [["33333333-3333-4333-8333-333333333333"],["33333333-3333-4333-8333-333333333333"]]
=====

    with newest as (
      select max(as_of) as as_of from printing_prices
    ),
    chosen as (
      select distinct on (p.oracle_id)
        null::uuid as deck_id,
        p.oracle_id,
        pp.price_cents,
        pp.price_cents_foil,
        pp.price_cents_etched,
        pp.as_of,
        p.scryfall_id,
        false as named
      from printings p
      join printing_prices pp on pp.scryfall_id = p.scryfall_id
      where p.oracle_id = any($1::uuid[])
      order by
        p.oracle_id,
        (pp.as_of = (select as_of from newest)) desc,
        (pp.price_cents is null),
        coalesce(pp.price_cents, pp.price_cents_foil, pp.price_cents_etched) asc,
        pp.scryfall_id
    ),
    picked as (
      select w.deck_id, p.oracle_id,
             pp.price_cents, pp.price_cents_foil, pp.price_cents_etched, pp.as_of, p.scryfall_id, false as named
      from unnest(
        $2::uuid[],
        $3::uuid[],
        $4::text[],
        $5::text[]
      ) as w(deck_id, oracle_id, set_code, collector_number)
      join printings p
        on p.oracle_id = w.oracle_id and p.set_code = w.set_code and p.collector_number = w.collector_number
      join printing_prices pp on pp.scryfall_id = p.scryfall_id
      -- (set, collector number) is not unique in printings: two variants can share one. A pick
      -- naming a shared pair answers nothing, and its row takes today's figure, rather than pricing
      -- whichever sibling an unordered join yields (the rule price-lookup.ts keeps for the same key).
      where (
        select count(*) from printings p2
        where p2.oracle_id = w.oracle_id and p2.set_code = w.set_code
          and p2.collector_number = w.collector_number
      ) = 1
    ),
    named as (
      select null::uuid as deck_id, p.oracle_id,
             pp.price_cents, pp.price_cents_foil, pp.price_cents_etched, pp.as_of, p.scryfall_id, true as named
      from printings p
      join printing_prices pp on pp.scryfall_id = p.scryfall_id
      where p.scryfall_id = any($6::uuid[])
    ),
    facts as (
      select * from chosen
      union all select * from picked
      union all select * from named
    )
    select
      newest.as_of as newest_as_of,
      facts.deck_id,
      facts.oracle_id,
      facts.price_cents,
      facts.price_cents_foil,
      facts.price_cents_etched,
      facts.as_of,
      facts.scryfall_id,
      facts.named
    from newest
    left join facts on true
  
--params [["33333333-3333-4333-8333-333333333333"],["11111111-1111-4111-8111-111111111111"],["33333333-3333-4333-8333-333333333333"],["lea"],["1"],["33333333-3333-4333-8333-333333333333"]]
=====

    with newest as (
      select max(as_of) as as_of from printing_prices
    ),
    chosen as (
      select distinct on (p.oracle_id)
        null::uuid as deck_id,
        p.oracle_id,
        pp.price_cents,
        pp.price_cents_foil,
        pp.price_cents_etched,
        pp.as_of,
        p.scryfall_id,
        false as named
      from printings p
      join printing_prices pp on pp.scryfall_id = p.scryfall_id
      where p.oracle_id = any($1::uuid[])
      order by
        p.oracle_id,
        (pp.as_of = (select as_of from newest)) desc,
        (pp.price_cents is null),
        coalesce(pp.price_cents, pp.price_cents_foil, pp.price_cents_etched) asc,
        pp.scryfall_id
    ),
    named as (
      select null::uuid as deck_id, p.oracle_id,
             pp.price_cents, pp.price_cents_foil, pp.price_cents_etched, pp.as_of, p.scryfall_id, true as named
      from printings p
      join printing_prices pp on pp.scryfall_id = p.scryfall_id
      where p.scryfall_id = any($2::uuid[])
    ),
    facts as (
      select * from chosen
      
      union all select * from named
    )
    select
      newest.as_of as newest_as_of,
      facts.deck_id,
      facts.oracle_id,
      facts.price_cents,
      facts.price_cents_foil,
      facts.price_cents_etched,
      facts.as_of,
      facts.scryfall_id,
      facts.named
    from newest
    left join facts on true
  
--params [[],["33333333-3333-4333-8333-333333333333"]]
