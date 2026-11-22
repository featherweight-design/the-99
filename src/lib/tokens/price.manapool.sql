
    with newest as (
      select max(as_of) as as_of from token_printing_prices
    ),
    chosen as (
      select distinct on (tp.token_oracle_id)
        tp.token_oracle_id,
        pp.price_cents,
        pp.price_cents_foil,
        pp.price_cents_etched,
        pp.as_of,
        tp.scryfall_id,
        tp.set_code,
        tp.collector_number,
        pp.product_name,
        pp.product_set,
        pp.product_number
      from token_printings tp
      join token_printing_prices pp on pp.scryfall_id = tp.scryfall_id
      where tp.token_oracle_id = any($1::uuid[])
      order by
        tp.token_oracle_id,
        (pp.as_of = (select as_of from newest)) desc,
        (pp.price_cents is null),
        coalesce(pp.price_cents, pp.price_cents_foil, pp.price_cents_etched) asc,
        pp.scryfall_id
    )
    select newest.as_of as newest_as_of, chosen.*
    from newest
    left join chosen on true
  